"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { sleepScore } from "@/lib/algorithms/sleep";
import { hm, scoreColor, verdict } from "@/lib/format";

export default function Sleep() {
  const [sessions, setSessions] = useState<any[]>([]);
  
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    supabase.from("sleep_sessions").select("*").gte("end_at", since).order("end_at", { ascending: false })
      .then(({ data }) => setSessions(data ?? []));
  }, []);

  return (
    <>
      <Header />
      <div className="space-y-4">
        {sessions.length === 0 ? <p className="text-muted">No sleep data recorded in the last 30 days.</p> : sessions.map((s) => {
          const score = sleepScore(s);
          return (
            <div key={s.id} className="soft-panel flex items-center justify-between rounded-[1.5rem] p-5">
              <div>
                <p className="font-display text-lg font-bold text-ink">{hm(s.minutes_asleep)}</p>
                <p className="mt-1 text-sm text-muted">{new Date(s.end_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-display text-2xl font-bold" style={{ color: scoreColor(score) }}>{score ?? "—"}</span>
                {score && <span className="font-mono text-[10px] tracking-widest text-muted">{verdict(score, 70, 90).toUpperCase()}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
