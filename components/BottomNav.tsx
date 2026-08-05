"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Heart, Activity, Play } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/auth") return null;

  const links = [
    { href: "/", label: "Edge", icon: Sun },
    { href: "/sleep", label: "Sleep", icon: Moon },
    { href: "/heart", label: "Heart", icon: Heart },
    { href: "/body", label: "Body", icon: Activity },
    { href: "/workouts", label: "Workouts", icon: Play },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
      <div className="glass glass-pill px-3 py-3 flex items-center gap-2 shadow-2xl backdrop-blur-3xl bg-black/40 border border-white/20">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`nav-btn rounded-full flex items-center justify-center px-4 py-2 transition-all ${
                isActive ? "nav-active opacity-100" : "opacity-70"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={20} />
                {isActive && (
                  <span className="font-bold text-[11px] tracking-wide ml-1">
                    {link.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
