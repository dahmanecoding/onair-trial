"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useDate } from "@/components/DateContext";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts";
import { format } from "date-fns";

function Trend({ title, unit, data, base, color, value }: any) {
  return (
    <div className="glass p-5 rounded-3xl relative overflow-hidden">
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase opacity-70">{title}</p>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-3xl font-bold">{value !== undefined ? value : (data[data.length - 1]?.v ?? "—")}</span>
            <span className="text-xs opacity-60 font-bold mb-1">{unit}</span>
          </div>
        </div>
      </div>
      
      {data.length === 0 ? <p className="mt-4 text-sm text-muted">No data yet.</p> : (
        <div className="h-32 -mx-2 -mb-2 relative z-10">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
              <Tooltip 
                contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12, backdropFilter: "blur(10px)" }} 
                formatter={(v: any) => [`${v} ${unit}`, title]} 
                labelStyle={{ display: 'none' }}
              />
              {base && <ReferenceArea y1={base * 0.95} y2={base * 1.05} fill="currentColor" fillOpacity={0.05} />}
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function Heart() {
  const { selectedDate } = useDate();
  const [hrv, setHrv] = useState<any[]>([]);
  const [rhr, setRhr] = useState<any[]>([]);
  const [intra, setIntra] = useState<any[]>([]);

  useEffect(() => {
    const targetDateStr = format(selectedDate, "yyyy-MM-dd");
    const since = new Date(selectedDate.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    
    supabase.from("daily_metrics").select("date, metric, value").gte("date", since).lte("date", targetDateStr)
      .in("metric", ["hrv", "resting_hr"]).order("date")
      .then(({ data }) => {
        const f = (m: string) => (data ?? []).filter((x) => x.metric === m)
          .map((x) => ({ d: x.date.slice(5), v: Number(x.value) }));
        setHrv(f("hrv")); setRhr(f("resting_hr"));
      });
      
    const startOfDay = `${targetDateStr}T00:00:00Z`;
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const endOfDay = `${format(nextDay, "yyyy-MM-dd")}T00:00:00Z`;
    
    supabase.from("hr_intraday").select("ts, bpm").gte("ts", startOfDay).lt("ts", endOfDay).order("ts")
      .then(({ data }) => setIntra((data ?? []).map((p) => ({ d: p.ts.slice(11, 16), v: p.bpm }))));
  }, [selectedDate]);
  
  const avg = (xs: any[]) => (xs.length ? xs.reduce((a, b) => a + b.v, 0) / xs.length : undefined);
  
  const inBaselineRange = (values: number[]) => {
    if (values.length < 8) return null;
    const latest = values.at(-1)!;
    const baseline = values.slice(0, -1).reduce((total, value) => total + value, 0) / (values.length - 1);
    return Math.abs(latest - baseline) <= baseline * 0.1;
  };
  
  const hrvValues = hrv.map(x => x.v);
  const rhrValues = rhr.map(x => x.v);
  const checks = [inBaselineRange(hrvValues), inBaselineRange(rhrValues)].filter((value): value is boolean => value !== null);
  const inRange = checks.length ? { ok: checks.filter(Boolean).length, total: checks.length } : null;

  return (
    <>
      <Header title="Heart" showDatePill={true} />
      
      <div className="space-y-4 rise-in pb-32">
        <div className="glass p-5 rounded-3xl">
          <p className="text-[10px] font-bold tracking-widest uppercase opacity-70">Health Monitor</p>
          {inRange ? (
            <div className="mt-3">
              <p className="font-display text-base font-bold" style={{ color: inRange.ok === inRange.total ? "#3DE24B" : "#FFDE33" }}>
                {inRange.ok === inRange.total ? "Within range" : "Check trends"}
              </p>
              <p className="mt-1 font-mono text-[11px] opacity-60">{inRange.ok}/{inRange.total} metrics steady against baseline</p>
            </div>
          ) : (
            <p className="mt-3 text-sm opacity-60">Calibrating… needs 7 days of data.</p>
          )}
        </div>
        
        <Trend title="HRV" unit="ms" data={hrv} base={avg(hrv)} color="#3DE24B" />
        <Trend title="Resting HR" unit="bpm" data={rhr} base={avg(rhr)} color="#FF4E42" />
        <Trend title="Intraday HR" unit="bpm" data={intra} base={undefined} color="#51B0EA" />
      </div>
    </>
  );
}
