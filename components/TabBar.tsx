"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Today", d: "M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z" },
  { href: "/sleep", label: "Sleep", d: "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" },
  { href: "/heart", label: "Heart", d: "M12 21s-7.5-4.7-9.5-9A5.4 5.4 0 0 1 12 6.3 5.4 5.4 0 0 1 21.5 12c-2 4.3-9.5 9-9.5 9z" },
  { href: "/workouts", label: "Train", d: "M4 10v4M7 7v10M20 10v4M17 7v10M7 12h10" },
  { href: "/settings", label: "Setup", d: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4l2-1-1-3-2.2.4a7 7 0 0 0-1.4-1.4L18 4l-3-1-1 2h-4L9 3 6 4l.6 2.9A7 7 0 0 0 5.2 8.4L3 8l-1 3 2 1-2 1 1 3 2.2-.4a7 7 0 0 0 1.4 1.4L6 20l3 1 1-2h4l1 2 3-1-.6-2.9a7 7 0 0 0 1.4-1.4L22 16l1-3z" },
];

export default function TabBar() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md justify-around px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const active = path === t.href;
          return (
            <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 ${active ? "bg-white/[.06]" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={active ? "#EDEFF3" : "#8A93A5"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.d} />
              </svg>
              <span className={`font-mono text-[10px] tracking-wider ${active ? "text-ink" : "text-muted"}`}>{t.label.toUpperCase()}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
