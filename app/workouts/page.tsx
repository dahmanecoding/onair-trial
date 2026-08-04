"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { dayLabel } from "@/lib/format";

export default function Workouts() {
  const [rows, setRows] = useState<any[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => {
    supabase.from("workouts").select("*").order("start_at", { ascending: false }).limit(40)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const week = rows.filter((w) => Date.now() - new Date(w.start_at).getTime() < 7 * 86400000);
  const mins = Math.round(week.reduce((a, w) => a + (w.duration_sec ?? 0), 0) / 60);

  return (
    <>
      <Header title="Train" />
      <div className="soft-panel mb-5 rounded-[1.5rem] p-5">
        <p className="font-mono text-[11px] tracking-[0.2em] text-muted">THIS WEEK</p>
        <p className="mt-1 font-display text-2xl font-bold">{week.length} sessions · {mins} min</p>
      </div>
      {rows.length === 0 ? (
        <div className="soft-panel rounded-[1.5rem] p-6 text-sm text-muted">
          No workouts yet. Start an activity on the band or in the Nilox app and it lands here after the next sync.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((w) => (
            <li key={w.id}>
              <button onClick={() => setOpenId(openId === w.id ? null : w.id)}
                className="soft-panel w-full rounded-[1.35rem] p-5 text-left hover:bg-white/[.05]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold">{w.activity_type}</p>
                    <p className="font-mono text-[11px] text-muted">{dayLabel(w.start_at.slice(0, 10)).toUpperCase()} · {new Date(w.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{Math.round((w.duration_sec ?? 0) / 60)} min</p>
                    <p className="font-mono text-[11px] text-muted">{w.avg_hr ? `${w.avg_hr} bpm avg` : ""}</p>
                  </div>
                </div>
                {openId === w.id && Array.isArray(w.hr_zones) && w.hr_zones.length > 0 && (
                  <div className="mt-3 border-t border-hair pt-3">
                    <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-muted">HR ZONES</p>
                    {w.hr_zones.map((z: any) => {
                      const total = w.hr_zones.reduce((a: number, x: any) => a + (x.minutes ?? 0), 0) || 1;
                      return (
                        <div key={z.name} className="mb-1 flex items-center gap-2">
                          <span className="w-20 text-[11px] text-muted">{z.name}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded bg-hair">
                            <div className="h-full rounded bg-ice" style={{ width: `${((z.minutes ?? 0) / total) * 100}%` }} />
                          </div>
                          <span className="w-12 text-right font-mono text-[11px]">{z.minutes ?? 0}m</span>
                        </div>
                      );
                    })}
                    {w.calories != null && <p className="mt-2 font-mono text-[11px] text-muted">{w.calories} kcal</p>}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
