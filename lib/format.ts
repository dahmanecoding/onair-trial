export const hm = (min?: number | null) =>
  min == null ? "—" : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;

export const ago = (iso?: string | null) => {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

export const scoreColor = (s?: number | null) =>
  s == null ? "#8A93A5" : s >= 67 ? "#3DE24B" : s >= 34 ? "#FFDE33" : "#FF4E42";

export const verdict = (s?: number | null) =>
  s == null ? "Calibrating — building your baseline" :
  s >= 80 ? "Fully recovered — good day to push" :
  s >= 67 ? "Recovered — train as planned" :
  s >= 50 ? "Moderate — keep intensity in check" :
  s >= 34 ? "Strained — favor easy movement" :
  "Run down — prioritize rest today";

export const dayLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
