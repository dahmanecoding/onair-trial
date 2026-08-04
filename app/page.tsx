"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Ring from "@/components/Ring";
import BottomSheet from "@/components/ui/BottomSheet";
import { dayStrain } from "@/lib/algorithms/strain";
import { sleepScore } from "@/lib/algorithms/sleep";
import { currentStress } from "@/lib/algorithms/stress";
import { hm, scoreColor, verdict } from "@/lib/format";

type Activity = { id: number; activity_type?: string; duration_sec?: number; start_at: string; end_at?: string; avg_hr?: number; calories?: number; distance?: number };
type Recovery = { score?: number; hrv_component?: number; sleep_component?: number; rhr_component?: number };

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
};

const ActivityIcon = ({ type }: { type: string }) => {
  const t = type.toLowerCase();
  // Sleep
  if (t.includes("sleep")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;
  // Golf
  if (t.includes("golf")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2" /><path d="M12 14v7" /><path d="M8 21h8" /><path d="M12 12l4-8" /><circle cx="16" cy="4" r="1" fill="currentColor"/></svg>;
  // Run
  if (t.includes("run") || t.includes("jog")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M13 5l-2.5 5 2.5 5"/><path d="M10.5 10l-4 3"/><path d="M13 15l-3 4-2 3"/><path d="M10 19h5l2-3"/></svg>;
  // Cycle
  if (t.includes("cycle") || t.includes("bike")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="18" r="4"/><circle cx="19" cy="18" r="4"/><path d="M5 18l4-8 5-2 3 5"/><path d="M9 10l5 8"/><circle cx="15" cy="5" r="2"/></svg>;
  // Swim
  if (t.includes("swim")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M22 12h.01M4 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M4 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>;
  // Weight/Strength
  if (t.includes("weight") || t.includes("strength") || t.includes("lift")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 5v14M18 5v14M3 8h3v8H3zM18 8h3v8h-3zM6 12h12"/></svg>;
  // Walk
  if (t.includes("walk")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M13 5l-1 5 1 5"/><path d="M12 10l-3 3"/><path d="M13 15l-1 4-1 3"/><path d="M12 19h4"/></svg>;
  // Tennis
  if (t.includes("tennis")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7"/><path d="M17 17l4 4M12 5v14M5 12h14"/></svg>;
  // Yoga
  if (t.includes("yoga") || t.includes("pilates")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 5l-2 5 2 5"/><path d="M10 10H6"/><path d="M14 10h4"/><path d="M12 15l-3 5"/><path d="M12 15l3 5"/></svg>;
  // Soccer
  if (t.includes("soccer") || t.includes("football")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 12l-3-4 3-4 3 4-3 4z"/><path d="M12 12v5l-4 2M12 17l4 2M9 8H4.5M15 8h4.5"/></svg>;
  // Basketball
  if (t.includes("basket")) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M6.5 5.5A9 9 0 0 0 6.5 18.5M17.5 5.5A9 9 0 0 1 17.5 18.5"/></svg>;
  
  // Generic
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>;
};

export default function Today() {
  const router = useRouter();
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [sleep, setSleep] = useState<any | null>(null);
  const [strain, setStrain] = useState<number | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stress, setStress] = useState<{ score: number; label: string } | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ ok: number; total: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const last15m = new Date(Date.now() - 15 * 60000).toISOString();
      const [{ data: readiness }, { data: sleeps }, { data: metrics }, { data: heartRate }, { data: workouts }] = await Promise.all([
        supabase.from("readiness_scores").select("*").order("date", { ascending: false }).limit(1),
        supabase.from("sleep_sessions").select("*").eq("is_main_sleep", true).order("end_at", { ascending: false }).limit(1),
        supabase.from("daily_metrics").select("date, metric, value").gte("date", since30).in("metric", ["hrv", "resting_hr"]).order("date"),
        supabase.from("hr_intraday").select("ts, bpm").gte("ts", `${today}T00:00:00Z`).order("ts"),
        supabase.from("workouts").select("*").gte("start_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("start_at", { ascending: false }),
      ]);

      setRecovery(readiness?.[0] ?? null);
      setSleep(sleeps?.[0] ?? null);
      
      const series = (metric: string) => (metrics ?? []).filter((item) => item.metric === metric).map((item) => Number(item.value));
      const restingRates = series("resting_hr");
      const hrvs = series("hrv");
      const rhr = restingRates.at(-1) ?? null;
      
      const thisWeek = workouts ?? [];
      const todayActivities = thisWeek.filter((item) => item.start_at.slice(0, 10) === today);
      setStrain(dayStrain(heartRate ?? [], rhr, todayActivities));
      
      // Dynamic Health Monitor (uses available data instead of needing 7 days)
      const inBaselineRange = (values: number[]) => {
        if (values.length < 2) return values.length === 1 ? true : null; // If 1 day, it IS the baseline.
        const latest = values.at(-1)!;
        const baseline = values.slice(0, -1).reduce((total, value) => total + value, 0) / (values.length - 1);
        return Math.abs(latest - baseline) <= baseline * 0.15; // 15% tolerance
      };
      
      const checks = [inBaselineRange(hrvs), inBaselineRange(restingRates)].filter((value): value is boolean => value !== null);
      if (checks.length) {
        setHealthStatus({ ok: checks.filter(Boolean).length, total: checks.length });
      }

      // Dynamic Stress Monitor (Whoop algorithm estimation using recent HR)
      const recentHr = (heartRate ?? []).filter(h => h.ts >= last15m);
      setStress(currentStress(recentHr, rhr));

      setActivities(todayActivities);
      setLoaded(true);
    })();
  }, []);

  const sleepValue = sleepScore(sleep);

  return <>
    <Header />
    <div className="flex justify-center -mt-2 mb-6">
      <span className="font-display text-[22px] font-medium tracking-[0.1em] text-white/90">ONAIR</span>
    </div>

    {!loaded ? <div className="mt-6 h-80 animate-pulse rounded-[2rem] bg-surface" /> : <>
      
      {/* 3 Rings Section - Staggered layout on a baseline */}
      <section className="flex items-end justify-center gap-6 px-4">
        {/* Sleep (Left) */}
        <div className="flex flex-col items-center mb-1">
          <Ring pct={sleepValue == null ? null : sleepValue / 100} display={sleepValue == null ? "—" : String(sleepValue)} unit={sleepValue == null ? "" : "%"} label="Sleep" color="#51B0EA" size={96} stroke={8} onClick={() => router.push("/sleep")} dim />
        </div>

        {/* Strain (Center, Larger) */}
        <div className="flex flex-col items-center">
          <Ring pct={strain == null ? null : strain / 21} display={strain == null ? "—" : strain.toFixed(1)} label="Strain" color="#51B0EA" size={120} stroke={10} onClick={() => router.push("/workouts")} dim />
        </div>

        {/* Recovery (Right) */}
        <div className="flex flex-col items-center mb-1">
          <Ring pct={recovery?.score == null ? null : recovery.score / 100} display={recovery?.score == null ? "—" : String(recovery.score)} unit={recovery?.score == null ? "" : "%"} label="Recovery" color="#22C53B" size={96} stroke={8} onClick={() => {}} dim />
        </div>
      </section>

      {/* Monitors Row */}
      <section className="mt-8 grid grid-cols-2 gap-3 px-4">
        {/* Health Monitor */}
        <button onClick={() => router.push("/heart")} className="flex flex-col justify-between rounded-2xl bg-[#1C1E22] p-4 text-left shadow-sm">
          <div className="flex w-full items-center justify-between">
            <span className="font-display text-[11px] font-bold tracking-widest text-white">HEALTH MONITOR</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A93A5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded ${healthStatus && healthStatus.ok === healthStatus.total ? 'bg-[#22C53B]/20 text-[#22C53B]' : 'bg-[#FFDE33]/20 text-[#FFDE33]'}`}>
              {healthStatus && healthStatus.ok === healthStatus.total ? 
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                : <span className="font-bold">!</span>
              }
            </div>
            <div>
              <p className="font-display text-sm font-bold" style={{ color: healthStatus && healthStatus.ok === healthStatus.total ? "#22C53B" : "#FFDE33" }}>
                {healthStatus && healthStatus.ok === healthStatus.total ? "WITHIN RANGE" : "CHECK TRENDS"}
              </p>
              <p className="font-display text-[11px] text-[#8A93A5]">{healthStatus ? `${healthStatus.ok}/${healthStatus.total} Metrics` : "0/0 Metrics"}</p>
            </div>
          </div>
        </button>

        {/* Stress Monitor */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#1C1E22] p-4 text-left shadow-sm">
          <div className="flex w-full items-center justify-between">
            <span className="font-display text-[11px] font-bold tracking-widest text-white">STRESS MONITOR</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A93A5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#51B0EA]/20">
              <span className="font-display text-xs font-bold text-[#51B0EA]">{stress ? stress.score.toFixed(1) : "—"}</span>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">{stress ? stress.label : "CALIBRATING"}</p>
              <p className="font-display text-[11px] text-[#8A93A5]">{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>
      </section>

      {/* My Day Section */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-white">My Day</h2>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        {/* Today's Activities Card */}
        <div className="mt-4 rounded-2xl bg-[#1E2024] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[11px] font-bold tracking-widest text-white">TODAY'S ACTIVITIES</h3>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A93A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </div>

          <div className="space-y-2">
            {sleep && (
              <div className="flex items-center rounded-xl bg-[#2B2D2F] p-2">
                <div className="flex items-center gap-2 rounded-lg bg-[#51B0EA] px-3 py-2 text-black shadow-inner w-[90px] justify-center">
                  <ActivityIcon type="sleep" />
                  <span className="font-display text-[15px] font-bold tracking-tight">{hm(sleep.minutes_asleep).replace(" ", "")}</span>
                </div>
                <div className="ml-4 flex-1">
                  <span className="font-display text-[13px] font-bold tracking-widest text-white">SLEEP</span>
                </div>
                <div className="flex flex-col items-end border-r-2 border-[#51B0EA] pr-2">
                  <span className="font-display text-[10px] text-[#8A93A5]">{fmtTime(sleep.start_at)}</span>
                  <span className="font-display text-[10px] text-[#8A93A5]">{fmtTime(sleep.end_at)}</span>
                </div>
              </div>
            )}
            
            {activities.map((act) => (
              <div key={act.id} className="flex items-center rounded-xl bg-[#2B2D2F] p-2">
                <div className="flex items-center gap-2 rounded-lg bg-[#2E9BFF] px-3 py-2 text-white shadow-inner w-[90px] justify-center">
                  <ActivityIcon type={act.activity_type || ""} />
                  <span className="font-display text-[15px] font-bold tracking-tight">
                    {act.distance ? act.distance.toFixed(1) : Math.round((act.duration_sec ?? 0) / 60)}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <span className="font-display text-[13px] font-bold tracking-widest text-white uppercase">{act.activity_type || "ACTIVITY"}</span>
                </div>
                <div className="flex flex-col items-end border-r-2 border-[#2E9BFF] pr-2">
                  <span className="font-display text-[10px] text-[#8A93A5]">{fmtTime(act.start_at)}</span>
                  {act.end_at && <span className="font-display text-[10px] text-[#8A93A5]">{fmtTime(act.end_at)}</span>}
                </div>
              </div>
            ))}
            
            {!sleep && activities.length === 0 && (
              <p className="py-4 text-center text-sm text-[#8A93A5]">No activities logged today.</p>
            )}
          </div>
        </div>
      </section>
      
      {/* Pad bottom for fab and nav */}
      <div className="h-32"></div>
    </>}
  </>;
}
