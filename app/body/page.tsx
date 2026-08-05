"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useDate } from "@/components/DateContext";
import { Activity, Flame, Droplet, Thermometer } from "lucide-react";
import { format } from "date-fns";

export default function BodyPage() {
  const { selectedDate } = useDate();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const targetDateStr = format(selectedDate, "yyyy-MM-dd");
    
    supabase.from("daily_metrics").select("metric, value").eq("date", targetDateStr)
      .then(({ data }) => {
        const metricsObj: any = {};
        data?.forEach(m => metricsObj[m.metric] = Number(m.value));
        setMetrics(metricsObj);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <>
      <Header title="Body" showDatePill={true} />
      <div className="space-y-4 rise-in pb-32">
        {loading ? (
          <div className="flex justify-center items-center h-32"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            
            <div className="glass p-5 rounded-3xl flex flex-col justify-between h-40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Droplet size={16} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">SpO2</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{metrics?.spo2 ? Math.round(metrics.spo2) : "—"}</span>
                <span className="text-sm font-bold opacity-60 mb-1">%</span>
              </div>
            </div>

            <div className="glass p-5 rounded-3xl flex flex-col justify-between h-40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <Thermometer size={16} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Temp</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{metrics?.temperature ? metrics.temperature.toFixed(1) : "—"}</span>
                <span className="text-sm font-bold opacity-60 mb-1">°C</span>
              </div>
            </div>

            <div className="glass p-5 rounded-3xl flex flex-col justify-between h-40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Activity size={16} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Weight</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{metrics?.weight ? metrics.weight.toFixed(1) : "—"}</span>
                <span className="text-sm font-bold opacity-60 mb-1">kg</span>
              </div>
            </div>

            <div className="glass p-5 rounded-3xl flex flex-col justify-between h-40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#FF4E42]/20 flex items-center justify-center text-[#FF4E42]">
                  <Flame size={16} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Body Fat</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{metrics?.body_fat ? metrics.body_fat.toFixed(1) : "—"}</span>
                <span className="text-sm font-bold opacity-60 mb-1">%</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
