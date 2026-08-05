"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useDate } from "@/components/DateContext";
import { hm } from "@/lib/format";
import { Activity, Flame, Heart, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Workouts() {
  const { selectedDate } = useDate();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Let's show workouts for the week leading up to the selected date
    const end = new Date(selectedDate);
    end.setDate(end.getDate() + 1);
    const endStr = format(end, "yyyy-MM-dd");
    
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 7);
    const startStr = format(start, "yyyy-MM-dd");

    supabase.from("workouts").select("*").gte("start_at", `${startStr}T00:00:00Z`).lt("start_at", `${endStr}T00:00:00Z`).order("start_at", { ascending: false })
      .then(({ data }) => {
        setWorkouts(data ?? []);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <>
      <Header title="Workouts" showDatePill={true} />
      <div className="space-y-4 rise-in pb-32">
        {loading ? (
          <div className="flex justify-center items-center h-32"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>
        ) : workouts.length === 0 ? (
          <div className="glass p-8 rounded-3xl text-center">
            <p className="opacity-60">No workouts logged this week.</p>
          </div>
        ) : workouts.map((w) => (
          <div key={w.id} className="glass p-5 rounded-3xl flex flex-col gap-4 hover:scale-95 transition cursor-pointer">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="font-display text-lg font-bold capitalize">{w.activity_type || "Workout"}</p>
                  <p className="text-[11px] font-bold tracking-widest uppercase opacity-60">
                    {format(new Date(w.start_at), "EEE, MMM d • h:mm a")}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-around items-center pt-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1 flex items-center gap-1"><Clock size={10}/> Time</span>
                <span className="text-xl font-bold">{w.duration_sec ? hm(Math.round(w.duration_sec / 60)) : "—"}</span>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1 flex items-center gap-1"><Flame size={10} className="text-[#FF4E42]"/> Cals</span>
                <span className="text-xl font-bold">{w.calories ? w.calories : "—"}</span>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1 flex items-center gap-1"><Heart size={10} className="text-accent"/> HR</span>
                <span className="text-xl font-bold">{w.avg_hr ? w.avg_hr : "—"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
