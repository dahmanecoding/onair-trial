"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
  { href: "/heart", label: "Health", d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
  { href: "/workouts", label: "Train", d: "M4 10v4M7 7v10M20 10v4M17 7v10M7 12h10" },
  { href: "/settings", label: "More", d: "M3 12h18M3 6h18M3 18h18" },
];

export default function TabBar() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-30">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1C1E22] text-xl font-bold text-white shadow-lg ring-1 ring-white/10 backdrop-blur-xl">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12l2 4 4-8"></path>
          </svg>
        </button>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 bg-[#111214] pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md justify-between px-6 py-3">
          {tabs.map((t) => {
            const active = path === t.href;
            return (
              <Link key={t.href} href={t.href} className="flex flex-col items-center gap-1.5 px-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke={active ? "#EDEFF3" : "#8A93A5"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.d} />
                </svg>
                <span className={`font-mono text-[10px] tracking-widest ${active ? "text-[#EDEFF3]" : "text-[#8A93A5]"}`}>{t.label}</span>
              </Link>
            );
          })}
          {/* Spacer for FAB so it doesn't cover anything */}
          <div className="w-10"></div>
        </div>
      </nav>
    </>
  );
}
