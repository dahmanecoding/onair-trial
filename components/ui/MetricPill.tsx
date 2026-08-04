export default function MetricPill({ value, label, tone = "blue" }: { value: string; label: string; tone?: "blue" | "ice" | "green" }) {
  return (
    <div className={`metric-pill metric-pill--${tone}`}>
      <span className="font-display text-[15px] font-bold tabular-nums">{value}</span>
      <span className="text-[9px] font-medium tracking-[.14em] opacity-70">{label}</span>
    </div>
  );
}
