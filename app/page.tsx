"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useDate } from "@/components/DateContext";
import { dayStrain } from "@/lib/algorithms/strain";
import { sleepScore } from "@/lib/algorithms/sleep";
import { currentStress } from "@/lib/algorithms/stress";
import { hm } from "@/lib/format";
import { Activity, Heart, Moon, BatteryWarning } from "lucide-react";
import { format } from "date-fns";

type DbActivity = { id: number; activity_type?: string; duration_sec?: number; start_at: string; end_at?: string; avg_hr?: number; calories?: number; distance?: number };
type Recovery = { score?: number; hrv_component?: number; sleep_component?: number; rhr_component?: number };

export default function EdgePage() {
  const router = useRouter();
  const { selectedDate } = useDate();
  
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [sleep, setSleep] = useState<any | null>(null);
  const [strain, setStrain] = useState<number | null>(null);
  const [stress, setStress] = useState<{ score: number; label: string } | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoaded(false);
      const targetDateStr = format(selectedDate, "yyyy-MM-dd");
      
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDateStr = format(nextDay, "yyyy-MM-dd");

      const [{ data: readiness }, { data: sleeps }, { data: dailyMetrics }, { data: heartRate }, { data: workouts }] = await Promise.all([
        supabase.from("readiness_scores").select("*").eq("date", targetDateStr).limit(1),
        supabase.from("sleep_sessions").select("*").eq("is_main_sleep", true).gte("end_at", `${targetDateStr}T00:00:00Z`).lt("end_at", `${nextDateStr}T00:00:00Z`).order("end_at", { ascending: false }).limit(1),
        supabase.from("daily_metrics").select("metric, value").eq("date", targetDateStr),
        supabase.from("hr_intraday").select("ts, bpm").gte("ts", `${targetDateStr}T00:00:00Z`).lt("ts", `${nextDateStr}T00:00:00Z`).order("ts"),
        supabase.from("workouts").select("*").gte("start_at", `${targetDateStr}T00:00:00Z`).lt("start_at", `${nextDateStr}T00:00:00Z`),
      ]);

      const rec = readiness?.[0] ?? null;
      setRecovery(rec);
      setSleep(sleeps?.[0] ?? null);
      
      const metricsObj: any = {};
      dailyMetrics?.forEach(m => metricsObj[m.metric] = Number(m.value));
      setMetrics(metricsObj);
      
      const rhr = metricsObj["resting_hr"] ?? null;
      
      setStrain(dayStrain(heartRate ?? [], rhr, workouts ?? []));
      
      // Dynamic Stress Monitor
      const last15m = new Date(Date.now() - 15 * 60000).toISOString();
      const recentHr = (heartRate ?? []).filter(h => h.ts >= last15m);
      setStress(currentStress(recentHr, rhr));

      setLoaded(true);
    })();
  }, [selectedDate]);

  const slpScore = sleepScore(sleep);
  const readinessValue = recovery?.score ?? 0;
  
  let readinessLabel = "Calibrating";
  let readinessColor = "#8A93A5";
  if (readinessValue >= 60) { readinessLabel = "All clear"; readinessColor = "#3DE24B"; }
  else if (readinessValue >= 30) { readinessLabel = "Run easy"; readinessColor = "#FFDE33"; }
  else if (readinessValue > 0) { readinessLabel = "Take it easy"; readinessColor = "#FF4E42"; }

  const greeting = "GOOD MORNING"; // Can be dynamic based on time
  const insightText = sleep 
    ? `You slept ${sleep.minutes_asleep} minutes. Your readiness is ${readinessValue > 0 ? readinessValue : "calculating"}.`
    : "Wear your band to sleep tonight to see your readiness tomorrow morning.";

  return (
    <>
      <Header title="Edge" showDatePill={true} />

      {!loaded ? (
        <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-4 rise-in pb-8">
          {/* Insight Card */}
          <div className="glass p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
                  <Activity size={12} className="text-accent" />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">{greeting}</span>
              </div>
            </div>
            <p className="text-lg font-medium leading-tight mt-1">{insightText}</p>
            <p className="text-[11px] opacity-50 mt-1 cursor-pointer">Tap for the breakdown</p>
          </div>

          {/* Orbital Readiness Hub */}
          <div className="glass shadow-xl p-6 py-10 relative flex justify-center items-center h-[340px] overflow-hidden">
            {/* Background decorative rings */}
            <div className="absolute w-64 h-64 border border-white/10 dark:border-white/5 rounded-full ring-bg"></div>
            <div className="absolute w-48 h-48 border border-white/10 dark:border-white/5 rounded-full ring-bg"></div>
            
            {/* Central Arc */}
            <div className="relative w-40 h-40 flex flex-col items-center justify-center z-10 cursor-pointer" onClick={() => router.push("/body")}>
              <svg className="absolute inset-0 w-full h-full transform -rotate-[135deg]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="transparent" stroke="currentColor" className="opacity-10" strokeWidth="6" strokeDasharray="212" strokeDashoffset="0" strokeLinecap="round"/>
                <circle cx="50" cy="50" r="45" fill="transparent" stroke={readinessColor} strokeWidth="6" strokeDasharray="212" strokeDashoffset={212 - (212 * (readinessValue / 100))} strokeLinecap="round" className="transition-all duration-1000 ease-out"/>
              </svg>
              <span className="text-[9px] font-bold tracking-widest uppercase opacity-60">Readiness</span>
              <span className="text-5xl font-bold my-1">{readinessValue || "—"}</span>
              <span className="text-[11px] font-bold" style={{ color: readinessColor }}>{readinessLabel}</span>
            </div>

            {/* Orbiting Pills */}
            <div className="absolute top-8 left-4 glass glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold shadow-lg z-20 cursor-pointer hover:scale-95 transition">
              <BatteryWarning size={14} />
              <span className="opacity-80">Stress</span> <span className="opacity-100">{stress ? stress.score.toFixed(0) : "—"}</span>
            </div>
            
            <div onClick={() => router.push("/sleep")} className="absolute top-8 right-4 glass glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold shadow-lg z-20 cursor-pointer hover:scale-95 transition">
              <Moon size={14} />
              <span className="opacity-80">Sleep</span> <span className="opacity-100">{sleep ? hm(sleep.minutes_asleep) : "—"}</span>
            </div>

            <div onClick={() => router.push("/heart")} className="absolute bottom-8 left-4 glass glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold shadow-lg z-20 cursor-pointer hover:scale-95 transition">
              <Heart size={14} className="text-accent" fill="currentColor" />
              <span className="opacity-80">Heart</span> <span className="opacity-100">{metrics?.resting_hr || "—"}</span>
            </div>

            <div onClick={() => router.push("/workouts")} className="absolute bottom-8 right-4 glass glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold shadow-lg z-20 cursor-pointer hover:scale-95 transition">
              <Activity size={14} />
              <span className="opacity-80">Strain</span> <span className="opacity-100">{strain ? strain.toFixed(1) : "—"}</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* HRV */}
            <div className="glass shadow-xl p-4 h-36 flex flex-col justify-between cursor-pointer hover:scale-95 transition" onClick={() => router.push("/heart")}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">HRV</span>
                <div className="w-2 h-2 rounded-full bg-recovery"></div>
              </div>
              <div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{metrics?.hrv ? Math.round(metrics.hrv) : "—"}</span> 
                  <span className="text-xs opacity-60 font-bold mb-1">ms</span>
                </div>
                {/* Fake chart for preview */}
                <svg className="w-full h-8 mt-2 opacity-80" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M0,0 L30,25 L60,25 L100,20" fill="none" stroke="#3DE24B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Resting HR */}
            <div className="glass shadow-xl p-4 h-36 flex flex-col justify-between cursor-pointer hover:scale-95 transition" onClick={() => router.push("/heart")}>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Resting HR</span>
              <div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{metrics?.resting_hr || "—"}</span> 
                  <span className="text-xs opacity-60 font-bold mb-1">bpm</span>
                </div>
                <svg className="w-full h-8 mt-2 opacity-80" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M0,5 L40,25 L100,25" fill="none" stroke="#FF4E42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
