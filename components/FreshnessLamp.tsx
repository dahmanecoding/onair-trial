"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ago } from "@/lib/format";

export default function FreshnessLamp() {
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("sync_runs").select("finished_at").eq("status", "ok")
      .order("finished_at", { ascending: false }).limit(1)
      .then(({ data }) => setLast(data?.[0]?.finished_at ?? null));
  }, []);
  const ageH = last ? (Date.now() - new Date(last).getTime()) / 3600000 : Infinity;
  const color = ageH < 2 ? "#3DE24B" : ageH < 24 ? "#FFDE33" : "#FF4E42";
  return (
    <div className="flex items-center gap-2 rounded-full border border-hair bg-surface px-3 py-1">
      <span className="relative flex h-2 w-2">
        {ageH < 2 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      <span className="font-mono text-[11px] tracking-wide text-muted">SYNCED {ago(last).toUpperCase()}</span>
    </div>
  );
}
