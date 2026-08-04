import FreshnessLamp from "@/components/FreshnessLamp";
export default function Header({ title }: { title: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <span className="block font-mono text-[10px] font-medium tracking-[.24em] text-muted">{title === "Today" ? "TODAY · LIVE" : "ONAIR / " + title.toUpperCase()}</span>
        <span className="mt-1 block font-display text-[25px] font-bold tracking-[-.055em] text-ink">{title === "Today" ? "Your day" : title}</span>
      </div>
      <FreshnessLamp />
    </header>
  );
}
