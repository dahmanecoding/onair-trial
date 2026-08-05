"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useDate } from "@/components/DateContext";
import { sleepScore } from "@/lib/algorithms/sleep";
import { hm, scoreColor } from "@/lib/format";
import { Moon, Clock, HeartPulse } from "lucide-react";
import { format } from "date-fns";

export default function Sleep() {
  const { selectedDate } = useDate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    // Fetch sleep for the week up to the selected date
    const end = new Date(selectedDate);
    end.setDate(end.getDate() + 1);
    const endStr = format(end, "yyyy-MM-dd");
    
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 7);
    const startStr = format(start, "yyyy-MM-dd");

    supabase.from("sleep_sessions").select("*").gte("end_at", `${startStr}T00:00:00Z`).lt("end_at", `${endStr}T00:00:00Z`).order("end_at", { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <>
      <Header title="Sleep" showDatePill={true} />
      <div className="space-y-4 rise-in pb-32">
        {loading ? (
          <div className="flex justify-center items-center h-32"><div className="w-8 h-8 border-4 border-[#51B0EA] border-t-transparent rounded-full animate-spin"></div></div>
        ) : sessions.length === 0 ? (
          <div className="glass p-8 rounded-3xl text-center">
            <p className="opacity-60">No sleep data recorded this week.</p>
          </div>
        ) : sessions.map((s) => {
          const score = sleepScore(s);
          const color = scoreColor(score);
          
          let scoreVerdict = "CALIBRATING";
          if (score !== null) {
            if (score >= 80) scoreVerdict = "EXCELLENT";
            else if (score >= 67) scoreVerdict = "GOOD";
            else if (score >= 50) scoreVerdict = "FAIR";
            else scoreVerdict = "POOR";
          }

          return (
            <div key={s.id} className="glass p-5 rounded-3xl flex flex-col gap-4 hover:scale-95 transition cursor-pointer">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#51B0EA]/20 flex items-center justify-center text-[#51B0EA]">
                    <Moon size={20} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold">Sleep</p>
                    <p className="text-[11px] font-bold tracking-widest uppercase opacity-60">
                      {format(new Date(s.end_at), "EEE, MMM d")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-bold" style={{ color }}>{score ?? "—"}</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-60">{scoreVerdict}</span>
                </div>
              </div>
              
              <div className="flex justify-around items-center pt-2">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1 flex items-center gap-1"><Clock size={10}/> Duration</span>
                  <span className="text-xl font-bold">{hm(s.minutes_asleep)}</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1 flex items-center gap-1"><Moon size={10}/> Deep</span>
                  <span className="text-xl font-bold">{hm(s.levels?.deep?.minutes || 0)}</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1 flex items-center gap-1"><HeartPulse size={10}/> REM</span>
                  <span className="text-xl font-bold">{hm(s.levels?.rem?.minutes || 0)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
