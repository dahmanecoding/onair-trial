"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { hm, dayLabel } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

export default function Sleep() {
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<7 | 30>(7);
  useEffect(() => {
    const since = new Date(Date.now() - 32 * 86400000).toISOString();
    supabase.from("sleep_sessions").select("*").eq("is_main_sleep", true)
      .gte("end_at", since).order("end_at")
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const view = rows.slice(-range).map((s) => ({
    d: dayLabel(s.end_at.slice(0, 10)).split(" ")[0],
    hours: +(s.minutes_asleep / 60).toFixed(2),
    deep: s.minutes_deep, rem: s.minutes_rem, eff: s.efficiency,
  }));
  const avg = view.length ? view.reduce((a, b) => a + b.hours, 0) / view.length : 0;
  const last = rows.at(-1);

  return (
    <>
      <Header title="Sleep" />
      <div className="mb-4 flex gap-2">
        {[7, 30].map((r) => (
          <button key={r} onClick={() => setRange(r as 7 | 30)}
            className={`rounded-full border px-4 py-1 font-mono text-[11px] tracking-wider ${range === r ? "border-ink text-ink" : "border-hair text-muted"}`}>
            {r}D
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="soft-panel rounded-[1.5rem] p-6 text-sm text-muted">
          No nights yet. Sleep with the band, let the Nilox app sync in the morning, and this fills in on its own.
        </div>
      ) : (
        <>
          <div className="soft-panel rounded-[1.5rem] p-5">
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted">DURATION · AVG {avg.toFixed(1)}H</p>
            <div className="mt-2 h-48">
              <ResponsiveContainer>
                <BarChart data={view} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                  <XAxis dataKey="d" tick={{ fill: "#8A93A5", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8A93A5", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#171C22", border: "1px solid #242B33", borderRadius: 12, color: "#EDEFF3" }} cursor={{ fill: "#242B33", opacity: 0.4 }} />
                  <ReferenceLine y={8} stroke="#31404F" strokeDasharray="4 4" />
                  <ReferenceLine y={avg} stroke="#8FB8D8" strokeDasharray="2 4" />
                  <Bar dataKey="hours" fill="#8FB8D8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {last && (
            <div className="soft-panel mt-5 rounded-[1.5rem] p-5">
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted">LATEST NIGHT · {dayLabel(last.end_at.slice(0, 10)).toUpperCase()}</p>
              <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted">Asleep</span><span className="text-right font-mono">{hm(last.minutes_asleep)}</span>
                <span className="text-muted">Deep</span><span className="text-right font-mono">{hm(last.minutes_deep)}</span>
                <span className="text-muted">REM</span><span className="text-right font-mono">{hm(last.minutes_rem)}</span>
                <span className="text-muted">Light</span><span className="text-right font-mono">{hm(last.minutes_light)}</span>
                <span className="text-muted">Awake</span><span className="text-right font-mono">{hm(last.minutes_awake)}</span>
                <span className="text-muted">Efficiency</span><span className="text-right font-mono">{last.efficiency ?? "—"}%</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
