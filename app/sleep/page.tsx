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
      <Header />
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
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted">DURATION Â· AVG {avg.toFixed(1)}H</p>
            <div className="mt-2 h-48">
              <ResponsiveContainer>
                <BarChart data={view} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                  <XAxis dataKey="d" tick={{ fill: "#8A93A5", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8A93A5", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#171C22", border: "1px solid #242B33", borderRadius: 12, color: "#EDEFF3" }} cursor={{ fill: "#242B33", opacity: 0.4 }} />
                  <ReferenceLine y={8} stroke="#31404F" strokeDasharray="4 4" />
