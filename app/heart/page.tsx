"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts";

function Trend({ title, unit, data, base, color }: any) {
  return (
    <div className="soft-panel rounded-[1.5rem] p-5">
      <p className="font-mono text-[11px] tracking-[0.2em] text-muted">{title}</p>
      {data.length === 0 ? <p className="mt-2 text-sm text-muted">No data yet.</p> : (
        <div className="mt-2 h-40">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fill: "#8A93A5", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fill: "#8A93A5", fontSize: 10 }} axisLine={false} tickLine={false} domain={["dataMin - 4", "dataMax + 4"]} />
              <Tooltip contentStyle={{ background: "#171C22", border: "1px solid #242B33", borderRadius: 12, color: "#EDEFF3" }} formatter={(v: any) => [`${v} ${unit}`, title]} />
              {base && <ReferenceArea y1={base * 0.97} y2={base * 1.03} fill="#242B33" fillOpacity={0.5} />}
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function Heart() {
  const [hrv, setHrv] = useState<any[]>([]);
  const [rhr, setRhr] = useState<any[]>([]);
  const [intra, setIntra] = useState<any[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    supabase.from("daily_metrics").select("date, metric, value").gte("date", since)
      .in("metric", ["hrv", "resting_hr"]).order("date")
      .then(({ data }) => {
        const f = (m: string) => (data ?? []).filter((x) => x.metric === m)
          .map((x) => ({ d: x.date.slice(5), v: Number(x.value) }));
        setHrv(f("hrv")); setRhr(f("resting_hr"));
      });
    const last24h = new Date(Date.now() - 86400000).toISOString();
    supabase.from("hr_intraday").select("ts, bpm").gte("ts", last24h).order("ts")
      .then(({ data }) => setIntra((data ?? []).map((p) => ({ d: p.ts.slice(11, 16), v: p.bpm }))));
  }, []);
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
      <Header />
      <div className="space-y-4">
        <div className="soft-panel rounded-[1.5rem] p-5">
          <p className="eyebrow">HEALTH MONITOR</p>
          {inRange ? <div className="mt-3"><p className="font-display text-base font-bold" style={{ color: inRange.ok === inRange.total ? "#3DE24B" : "#FFDE33" }}>{inRange.ok === inRange.total ? "Within range" : "Check trends"}</p><p className="mt-1 font-mono text-[11px] text-muted">{inRange.ok}/{inRange.total} metrics steady against baseline</p></div> : <p className="mt-3 text-sm text-muted">Calibrating… needs 7 days of data.</p>}
        </div>
        <Trend title="NIGHTLY HRV · 30D" unit="ms" data={hrv} base={avg(hrv)} color="#3DE24B" />
        <Trend title="RESTING HR · 30D" unit="bpm" data={rhr} base={avg(rhr)} color="#FF4E42" />
        <Trend title="HEART RATE · 24H" unit="bpm" data={intra} base={undefined} color="#8FB8D8" />
        <p className="text-[11px] text-muted">Shaded band = your 30-day baseline zone. Today's curve shows the granularity that survives the pipeline; if it looks sparse, the source only shared summaries for that period.</p>
      </div>
    </>
  );
}
