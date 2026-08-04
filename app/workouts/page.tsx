"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { hm } from "@/lib/format";

export default function Workouts() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    supabase.from("workouts").select("*").gte("start_at", since).order("start_at", { ascending: false })
      .then(({ data }) => setWorkouts(data ?? []));
  }, []);

  return (
    <>
      <Header />
      <div className="space-y-4">
        {workouts.length === 0 ? <p className="text-muted">No workouts in the last 30 days.</p> : workouts.map((w) => (
          <div key={w.id} className="soft-panel flex items-center justify-between rounded-[1.5rem] p-5">
            <div>
              <p className="font-display text-lg font-bold text-ink capitalize">{w.activity_type || "Workout"}</p>
              <p className="mt-1 text-sm text-muted">{new Date(w.start_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {w.duration_sec ? <span className="font-mono text-[13px] font-bold tracking-widest text-ink">{hm(w.duration_sec / 60)}</span> : null}
              {w.calories ? <span className="text-xs text-muted">{w.calories} kcal</span> : null}
              {w.avg_hr ? <span className="text-xs text-muted">{w.avg_hr} bpm avg</span> : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
