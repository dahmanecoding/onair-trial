import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ===== Google Health API edition (legacy Fitbit Web API sunsets Sept 2026) =====
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") ?? "";
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const API = "https://health.googleapis.com/v4";

const db = createClient(SB_URL, SERVICE_KEY);

const dstr = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
const civilDate = (c: any) => c?.date ? `${c.date.year}-${String(c.date.month).padStart(2, "0")}-${String(c.date.day).padStart(2, "0")}` : null;

// Recursively find the first finite number under keys matching hints (for schema resilience).
function deepNum(obj: any, hints: string[]): number | null {
  if (obj == null) return null;
  if (typeof obj === "number" && isFinite(obj)) return obj;
  if (typeof obj === "string" && obj !== "" && isFinite(Number(obj))) return Number(obj);
  if (typeof obj !== "object") return null;
  for (const h of hints) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().includes(h)) { const v = deepNum(obj[k], hints); if (v != null) return v; }
    }
  }
  return null;
}

async function refreshIfNeeded(t: any): Promise<any> {
  if (new Date(t.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return t;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: "refresh_token", refresh_token: t.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`google token refresh failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const upd = {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? t.refresh_token, // Google may not rotate it
    expires_at: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.from("fitbit_tokens").update(upd).eq("user_id", t.user_id);
  return { ...t, ...upd };
}

async function gh(t: any, path: string, body?: any): Promise<any | null> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${t.access_token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) { console.warn(`429 on ${path}, retry-after=${res.headers.get("Retry-After")}`); return null; }
  if (!res.ok) { console.warn(`${path} -> ${res.status} ${await res.text().catch(() => "")}`); return null; }
  return await res.json();
}

async function listAll(t: any, dataType: string, filter?: string): Promise<any[]> {
  const points: any[] = [];
  let pageToken = "";
  for (let i = 0; i < 12; i++) {
    const qs = new URLSearchParams();
    if (filter) qs.set("filter", filter);
    if (pageToken) qs.set("pageToken", pageToken);
    let j = await gh(t, `/users/me/dataTypes/${dataType}/dataPoints${qs.toString() ? "?" + qs.toString() : ""}`);
    if (j == null && filter && !pageToken) {
      // Filter syntax may differ per type — degrade to unfiltered first pages.
      j = await gh(t, `/users/me/dataTypes/${dataType}/dataPoints`);
    }
    if (!j?.dataPoints?.length) break;
    points.push(...j.dataPoints);
    pageToken = j.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return points;
}

// ---------- ingest (idempotent upserts; raw always kept for Phase 0 audit) ----------
async function ingestSleep(t: any, startDate: string): Promise<number> {
  let j = await gh(t, `/users/me/dataTypes/sleep/dataPoints:reconcile?filter=${encodeURIComponent(`sleep.interval.civil_end_time >= "${startDate}"`)}`);
  let pts = j?.dataPoints ?? null;
  if (pts == null) pts = await listAll(t, "sleep", `sleep.interval.civil_end_time >= "${startDate}"`);
  if (!pts.length) return 0;
  const rows = pts.filter((dp: any) => dp.sleep?.interval).map((dp: any) => {
    const s = dp.sleep;
    const sum = s.summary ?? {};
    const stage = (ty: string) => {
      const x = (sum.stagesSummary ?? []).find((z: any) => z.type === ty);
      return x ? Number(x.minutes) : null;
    };
    const asleep = sum.minutesAsleep != null ? Number(sum.minutesAsleep) : null;
    const period = sum.minutesInSleepPeriod != null ? Number(sum.minutesInSleepPeriod) : null;
    return {
      user_id: t.user_id,
      source_id: dp.name ?? `${s.interval.startTime}`,
      start_at: s.interval.startTime,
      end_at: s.interval.endTime,
      minutes_asleep: asleep,
      minutes_deep: stage("DEEP"),
      minutes_light: stage("LIGHT"),
      minutes_rem: stage("REM"),
      minutes_awake: sum.minutesAwake != null ? Number(sum.minutesAwake) : stage("AWAKE"),
      efficiency: asleep != null && period ? Math.round((asleep / period) * 100) : null,
      is_main_sleep: s.metadata?.main ?? true,
      raw: dp,
    };
  });
  if (!rows.length) return 0;
  const { error } = await db.from("sleep_sessions").upsert(rows, { onConflict: "user_id,source_id" });
  if (error) throw error;
  return rows.length;
}

async function ingestDaily(t: any, dataType: string, snake: string, metric: string, hints: string[], startDate: string): Promise<number> {
  const pts = await listAll(t, dataType, `${snake}.date >= "${startDate}"`);
  if (!pts.length) return 0;
  const rows: any[] = [];
  for (const dp of pts) {
    const payload = Object.values(dp).find((v: any) => v && typeof v === "object" && (v as any).date) as any
      ?? dp[Object.keys(dp).find((k) => k !== "name" && k !== "dataSource" && typeof dp[k] === "object") ?? ""];
    const date = civilDate(payload) ?? civilDate(payload?.summaryDate) ?? null;
    const value = deepNum(payload, hints);
    if (date && date >= startDate && value != null) rows.push({ user_id: t.user_id, date, metric, value, raw: dp });
  }
  if (!rows.length) return 0;
  const { error } = await db.from("daily_metrics").upsert(rows, { onConflict: "user_id,date,metric" });
  if (error) throw error;
  return rows.length;
}

async function ingestStepsDaily(t: any, startDate: string, endDate: string): Promise<number> {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const j = await gh(t, `/users/me/dataTypes/steps/dataPoints:dailyRollUp`, {
    range: {
      start: { date: { year: sy, month: sm, day: sd }, time: { hours: 0, minutes: 0, seconds: 0 } },
      end: { date: { year: ey, month: em, day: ed }, time: { hours: 23, minutes: 59, seconds: 59 } },
    },
    windowSizeDays: 1,
  });
  const pts = j?.rollupDataPoints ?? [];
  const rows = pts.map((p: any) => ({
    user_id: t.user_id,
    date: civilDate(p.civilStartTime) ?? (p.startTime ?? "").slice(0, 10),
    metric: "steps",
    value: deepNum(p.steps, ["countsum", "count", "sum"]),
    raw: p,
  })).filter((r: any) => r.date && r.value != null);
  if (!rows.length) return 0;
  const { error } = await db.from("daily_metrics").upsert(rows, { onConflict: "user_id,date,metric" });
  if (error) throw error;
  return rows.length;
}

async function ingestHrIntraday(t: any, date: string): Promise<number> {
  const j = await gh(t, `/users/me/dataTypes/heart-rate/dataPoints:rollUp`, {
    range: { startTime: `${date}T00:00:00Z`, endTime: `${date}T23:59:59Z` },
    windowSize: "300s",
  });
  const pts = j?.rollupDataPoints ?? [];
  const rows = pts.map((p: any) => ({
    user_id: t.user_id,
    ts: p.startTime,
    bpm: Math.round(deepNum(p.heartRate ?? p, ["average", "avg", "beatsperminute", "bpm", "value", "mean"]) ?? NaN),
  })).filter((r: any) => r.ts && isFinite(r.bpm));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("hr_intraday").upsert(rows.slice(i, i + 500), { onConflict: "user_id,ts" });
    if (error) throw error;
  }
  return rows.length;
}

async function ingestExercise(t: any, startDate: string): Promise<number> {
  const pts = await listAll(t, "exercise", `exercise.interval.start_time >= "${startDate}T00:00:00Z"`);
  if (!pts.length) return 0;
  const rows = pts.filter((dp: any) => dp.exercise?.interval?.startTime).map((dp: any) => {
    const e = dp.exercise;
    const start = new Date(e.interval.startTime).getTime();
    const end = e.interval.endTime ? new Date(e.interval.endTime).getTime() : start;
    return {
      user_id: t.user_id,
      source_id: dp.name ?? e.interval.startTime,
      activity_type: e.exerciseType ?? e.activityName ?? e.name ?? e.type ?? "Workout",
      start_at: e.interval.startTime,
      duration_sec: Math.max(0, Math.round((end - start) / 1000)),
      calories: deepNum(e, ["calorie", "energy"]) != null ? Math.round(deepNum(e, ["calorie", "energy"])!) : null,
      avg_hr: deepNum(e, ["averageheartrate", "avgheartrate", "averagebpm"]) != null ? Math.round(deepNum(e, ["averageheartrate", "avgheartrate", "averagebpm"])!) : null,
      max_hr: null,
      hr_zones: e.heartRateZones ?? e.timeInHeartRateZones ?? null,
      raw: dp,
    };
  });
  if (!rows.length) return 0;
  const { error } = await db.from("workouts").upsert(rows, { onConflict: "user_id,source_id" });
  if (error) throw error;
  return rows.length;
}

async function ensureIdentity(t: any) {
  if (t.fitbit_user_id) return;
  const j = await gh(t, "/users/me/identity");
  const id = j?.healthUserId ?? j?.legacyUserId;
  if (id) await db.from("fitbit_tokens").update({ fitbit_user_id: String(id) }).eq("user_id", t.user_id);
}

// ---------- readiness (unchanged model: 0.5 HRV / 0.3 sleep / 0.2 RHR vs 30d baseline) ----------
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const std = (xs: number[]) => { const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

async function computeReadiness(userId: string, date: string, windowDays: number) {
  const from = dstr(new Date(new Date(date + "T00:00:00Z").getTime() - windowDays * 86400000));
  const { data: metrics } = await db.from("daily_metrics").select("date, metric, value")
    .eq("user_id", userId).gte("date", from).lte("date", date).in("metric", ["hrv", "resting_hr"]);
  const { data: sleeps } = await db.from("sleep_sessions")
    .select("end_at, minutes_asleep, minutes_deep, minutes_rem, efficiency, is_main_sleep")
    .eq("user_id", userId).gte("end_at", from).lte("end_at", date + "T23:59:59Z").eq("is_main_sleep", true);

  const hrvHist = (metrics ?? []).filter((m) => m.metric === "hrv" && m.date < date && Number(m.value) > 0).map((m) => Math.log(Number(m.value)));
  const rhrHist = (metrics ?? []).filter((m) => m.metric === "resting_hr" && m.date < date).map((m) => Number(m.value));
  const hrvToday = (metrics ?? []).find((m) => m.metric === "hrv" && m.date === date)?.value;
  const rhrToday = (metrics ?? []).find((m) => m.metric === "resting_hr" && m.date === date)?.value;
  const sleepToday = (sleeps ?? []).find((s) => s.end_at.slice(0, 10) === date);

  const comps: Record<string, number> = {};
  if (hrvToday != null && Number(hrvToday) > 0 && hrvHist.length >= 7) {
    const s = std(hrvHist) || 0.05;
    comps.hrv = clamp(50 + 50 * ((Math.log(Number(hrvToday)) - mean(hrvHist)) / s), 0, 100);
  }
  if (sleepToday?.minutes_asleep != null) {
    const durScore = clamp((sleepToday.minutes_asleep / 480) * 100, 0, 100);
    const effScore = sleepToday.efficiency ?? 85;
    const share = sleepToday.minutes_asleep ? ((sleepToday.minutes_deep ?? 0) + (sleepToday.minutes_rem ?? 0)) / sleepToday.minutes_asleep : 0;
    comps.sleep = 0.6 * durScore + 0.25 * effScore + 0.15 * clamp((share / 0.4) * 100, 0, 100);
  }
  if (rhrToday != null && rhrHist.length >= 7) {
    const s = std(rhrHist) || 1;
    comps.rhr = clamp(50 - 50 * ((Number(rhrToday) - mean(rhrHist)) / s), 0, 100);
  }

  const weights: Record<string, number> = { hrv: 0.5, sleep: 0.3, rhr: 0.2 };
  const avail = Object.keys(comps);
  if (!avail.length) return;
  const wsum = avail.reduce((a, k) => a + weights[k], 0);
  const score = Math.round(avail.reduce((a, k) => a + comps[k] * (weights[k] / wsum), 0));

  await db.from("readiness_scores").upsert([{
    user_id: userId, date, score,
    hrv_component: comps.hrv ?? null,
    sleep_component: comps.sleep ?? null,
    rhr_component: comps.rhr ?? null,
    inputs: { hrvToday, rhrToday, sleep: sleepToday ?? null, baselineDays: { hrv: hrvHist.length, rhr: rhrHist.length }, weightsUsed: avail, api: "google-health-v4" },
    computed_at: new Date().toISOString(),
  }], { onConflict: "user_id,date" });
}

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.headers.get("x-sync-secret") !== SYNC_SECRET || !SYNC_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const mode: string = body.mode ?? "incremental";
  const trigger: string = body.trigger ?? "manual";

  const { data: tokens } = await db.from("fitbit_tokens").select("*");
  if (!tokens?.length) return Response.json({ ok: true, note: "no connections yet" });

  const results: any[] = [];
  for (let t of tokens) {
    const { data: run } = await db.from("sync_runs").insert({ user_id: t.user_id, trigger, mode }).select("id").single();
    let upserted = 0;
    try {
      t = await refreshIfNeeded(t);
      await ensureIdentity(t);
      const today = dstr(new Date());
      const { data: prof } = await db.from("profiles").select("baseline_window_days").eq("id", t.user_id).single();
      const win = prof?.baseline_window_days ?? 30;

      if (mode === "reconcile" || mode === "backfill") {
        const back = Math.min(mode === "backfill" ? (body.days ?? 90) : 7, 90);
        const start = dstr(daysAgo(back));
        upserted += await ingestSleep(t, start);
        upserted += await ingestDaily(t, "daily-heart-rate-variability", "daily_heart_rate_variability", "hrv", ["rmssd", "hrv", "milli"], start);
        upserted += await ingestDaily(t, "daily-resting-heart-rate", "daily_resting_heart_rate", "resting_hr", ["resting", "beatsperminute", "bpm", "value"], start);
        upserted += await ingestStepsDaily(t, start, today);
        upserted += await ingestExercise(t, start);
        upserted += await ingestHrIntraday(t, today);
        upserted += await ingestHrIntraday(t, dstr(daysAgo(1)));
        for (let i = Math.min(back, 35); i >= 0; i--) await computeReadiness(t.user_id, dstr(daysAgo(i)), win);
      } else {
        const y = dstr(daysAgo(1));
        upserted += await ingestSleep(t, y);
        upserted += await ingestDaily(t, "daily-heart-rate-variability", "daily_heart_rate_variability", "hrv", ["rmssd", "hrv", "milli"], y);
        upserted += await ingestDaily(t, "daily-resting-heart-rate", "daily_resting_heart_rate", "resting_hr", ["resting", "beatsperminute", "bpm", "value"], y);
        upserted += await ingestStepsDaily(t, y, today);
        upserted += await ingestExercise(t, y);
        upserted += await ingestHrIntraday(t, today);
        await computeReadiness(t.user_id, y, win);
        await computeReadiness(t.user_id, today, win);
      }

      await db.from("sync_runs").update({ finished_at: new Date().toISOString(), status: "ok", records_upserted: upserted }).eq("id", run!.id);
      results.push({ user: t.user_id, ok: true, upserted });
    } catch (e) {
      await db.from("sync_runs").update({ finished_at: new Date().toISOString(), status: "error", records_upserted: upserted, error: String(e) }).eq("id", run!.id);
      results.push({ user: t.user_id, ok: false, error: String(e) });
    }
  }
  return Response.json({ ok: true, mode, api: "google-health-v4", results });
});
