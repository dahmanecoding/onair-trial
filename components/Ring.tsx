"use client";

/** WHOOP-style ring: thick rounded arc, big value centered, label + chevron below. */
export default function Ring({
  pct, display, unit, label, color, size = 104, stroke = 9, onClick, dim = false,
}: {
  pct: number | null; display: string; unit?: string; label: string;
  color: string; size?: number; stroke?: number; onClick?: () => void; dim?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = pct == null ? 0 : Math.max(0.02, Math.min(1, pct));
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2" style={{ opacity: dim ? 0.76 : 1 }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#202A36" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct == null ? "#3A424D" : color}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * fill} ${c}`} style={{ transition: "stroke-dasharray 1100ms cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 ${dim ? 0 : 6}px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold tabular-nums" style={{ fontSize: size * 0.27, color: "#EDEFF3" }}>
            {display}{unit && <span style={{ fontSize: size * 0.14, color: "#8A93A5" }}>{unit}</span>}
          </span>
        </div>
      </div>
      <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.2em] text-muted transition-colors group-hover:text-ink">
        {label.toUpperCase()}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A93A5" strokeWidth="2.5"><path d="m9 6 6 6-6 6" /></svg>
      </span>
    </button>
  );
}
