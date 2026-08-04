"use client";
import { scoreColor } from "@/lib/format";

/** Broadcast-style readiness dial: 60 tick marks over a 270-degree arc. */
export default function Gauge({ score }: { score: number | null }) {
  const ticks = 60;
  const lit = score == null ? 0 : Math.round((score / 100) * ticks);
  const color = scoreColor(score);
  const R = 84, cx = 100, cy = 100;
  return (
    <div className="relative mx-auto h-[210px] w-[210px]">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        {Array.from({ length: ticks }).map((_, i) => {
          const a = (135 + (270 * i) / (ticks - 1)) * (Math.PI / 180);
          const x1 = cx + Math.cos(a) * (R - 8), y1 = cy + Math.sin(a) * (R - 8);
          const x2 = cx + Math.cos(a) * R, y2 = cy + Math.sin(a) * R;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i < lit ? color : "#242B33"} strokeWidth={i < lit ? 3 : 2} strokeLinecap="round"
              style={{ transition: "stroke 400ms", transitionDelay: `${i * 10}ms` }} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-6xl font-bold tabular-nums" style={{ color }}>
          {score ?? "–"}
        </span>
        <span className="mt-1 font-mono text-[11px] tracking-[0.2em] text-muted">READINESS</span>
      </div>
    </div>
  );
}
