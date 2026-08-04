"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Ring from "@/components/Ring";
import BottomSheet from "@/components/ui/BottomSheet";
import Card from "@/components/ui/Card";
import MetricPill from "@/components/ui/MetricPill";
import SectionTitle from "@/components/ui/SectionTitle";
import { dayStrain } from "@/lib/algorithms/strain";
import { sleepScore } from "@/lib/algorithms/sleep";
import { hm, scoreColor, verdict } from "@/lib/format";

type Activity = { id: number; activity_type?: string; duration_sec?: number; start_at: string; avg_hr?: number };
type Recovery = { score?: number; hrv_component?: number; sleep_component?: number; rhr_component?: number };
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });

export default function Today() {
  const router = useRouter();
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [sleep, setSleep] = useState<any | null>(null);
  const [strain, setStrain] = useState<number | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [latestHr, setLatestHr] = useState<number | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [week, setWeek] = useState({ n: 0, min: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
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
      
      const thisWeek = workouts ?? [];
      const todayActivities = thisWeek.filter((item) => item.start_at.slice(0, 10) === today);
      setStrain(dayStrain(heartRate ?? [], restingRates.at(-1) ?? null, todayActivities));
      if (heartRate && heartRate.length > 0) {
        setLatestHr(heartRate[heartRate.length - 1].bpm);
      }

      setWeek({ n: thisWeek.length, min: Math.round(thisWeek.reduce((total, item) => total + (item.duration_sec ?? 0), 0) / 60) });
      setActivities(todayActivities);
      setLoaded(true);
    })();
  }, []);

  const sleepValue = sleepScore(sleep);
  const stageTotal = sleep ? (sleep.minutes_asleep ?? 0) + (sleep.minutes_awake ?? 0) : 1;

  return <>
    <Header title="Today" />
    {!loaded ? <div className="mt-6 h-80 animate-pulse rounded-[2rem] bg-surface" /> : <>
      <section className="relative -mt-4 flex flex-col items-center py-2">
        <div className="absolute top-4 h-64 w-64 rounded-full bg-strain/15 blur-3xl" />
        <div className="relative z-10 flex w-full items-end justify-between px-1">
          <Ring pct={sleepValue == null ? null : sleepValue / 100} display={sleepValue == null ? "—" : String(sleepValue)} unit={sleepValue == null ? "" : "%"} label="Sleep" color="#8FB8D8" size={98} stroke={8} onClick={() => router.push("/sleep")} dim />
          <Ring pct={recovery?.score == null ? null : recovery.score / 100} display={recovery?.score == null ? "—" : String(recovery.score)} unit={recovery?.score == null ? "" : "%"} label="Recovery" color={scoreColor(recovery?.score)} size={98} stroke={8} onClick={() => setRecoveryOpen(true)} dim />
        </div>
        <div className="relative z-10 -mt-1">
          <Ring pct={strain == null ? null : strain / 21} display={strain == null ? "—" : strain.toFixed(1)} label="Day strain" color="#2E9BFF" size={218} stroke={15} onClick={() => router.push("/workouts")} />
        </div>
      </section>
      <p className="mt-3 text-center text-sm text-muted">{verdict(recovery?.score ?? null)}</p>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <button onClick={() => router.push("/heart")} className="text-left"><Card className="h-full transition-colors hover:bg-white/[.05]"><p className="eyebrow">CURRENT HR</p><div className="mt-3"><p className="font-display text-xl font-bold">{latestHr ?? "—"} <span className="text-sm font-normal text-muted">bpm</span></p><p className="mt-1 font-mono text-[11px] text-muted">{latestHr ? "Latest reading" : "No data today"}</p></div></Card></button>
        <button onClick={() => router.push("/workouts")} className="text-left"><Card tone="blue" className="h-full transition-colors hover:bg-white/[.05]"><p className="eyebrow">THIS WEEK</p><p className="mt-3 font-display text-xl font-bold">{week.n} <span className="text-sm font-normal text-muted">sessions</span></p><p className="mt-1 font-mono text-[11px] text-muted">{week.min} MIN TOTAL</p></Card></button>
      </section>

      <Card className="mt-5"><SectionTitle action={<span className="font-mono text-[10px] tracking-wider text-muted">TIMELINE</span>}>TODAY&apos;S ACTIVITIES</SectionTitle><ul className="mt-4 divide-y divide-hair/60">
        {sleep && <li className="py-3 first:pt-0"><button onClick={() => router.push("/sleep")} className="w-full"><div className="flex items-center gap-3"><MetricPill value={hm(sleep.minutes_asleep).replace(" ", "")} label="SLEEP" tone="ice" /><span className="flex-1 text-left font-mono text-[12px] tracking-[.15em]">SLEEP</span><span className="text-right font-mono text-[11px] leading-tight text-muted">{fmtTime(sleep.start_at)}<br />{fmtTime(sleep.end_at)}</span></div><div className="ml-1 mt-3 flex h-1.5 overflow-hidden rounded-full">{[["minutes_deep", "#8FB8D8"], ["minutes_rem", "#3DE24B"], ["minutes_light", "#31404F"], ["minutes_awake", "#FFDE33"]].map(([key, color]) => <div key={key} style={{ width: `${((sleep[key] ?? 0) / stageTotal) * 100}%`, background: color }} />)}</div></button></li>}
        {activities.map((activity) => <li key={activity.id} className="py-3 last:pb-0"><button onClick={() => router.push("/workouts")} className="flex w-full items-center gap-3"><MetricPill value={`${Math.round((activity.duration_sec ?? 0) / 60)}m`} label="TRAIN" /><span className="flex-1 text-left font-mono text-[12px] tracking-[.15em]">{String(activity.activity_type ?? "ACTIVITY").toUpperCase()}</span><span className="text-right font-mono text-[11px] leading-tight text-muted">{fmtTime(activity.start_at)}{activity.avg_hr ? <><br />{activity.avg_hr} bpm</> : null}</span></button></li>)}
        {!sleep && activities.length === 0 && <li className="text-sm text-muted">Nothing yet — activities and sleep appear here after your first sync.</li>}
      </ul></Card>
    </>}
    <BottomSheet open={recoveryOpen} onClose={() => setRecoveryOpen(false)}><SectionTitle action={<button onClick={() => setRecoveryOpen(false)} className="text-xs text-muted">Close</button>}>RECOVERY BREAKDOWN</SectionTitle>{recovery ? <div className="mt-6 space-y-4">{[["HRV", recovery.hrv_component, "50%"], ["Sleep", recovery.sleep_component, "30%"], ["Resting HR", recovery.rhr_component, "20%"]].map(([label, value, weight]) => <div key={label as string} className="flex items-center gap-3"><span className="w-24 font-mono text-[11px] tracking-wider text-muted">{String(label).toUpperCase()}</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-hair"><div className="h-full rounded" style={{ width: `${value ?? 0}%`, background: scoreColor(value as number) }} /></div><span className="w-14 text-right font-mono text-xs">{value == null ? "n/a" : `${value}%`} <span className="text-muted">· {weight}</span></span></div>)}<p className="pt-1 text-[11px] text-muted">Compared with your own 30-day baseline.</p></div> : <p className="mt-5 text-sm text-muted">Recovery will appear after your first sync.</p>}</BottomSheet>
  </>;
}
