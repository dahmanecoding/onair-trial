"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { useDate } from "./DateContext";
import { format, isToday as isDateToday } from "date-fns";
import { Sun, Moon, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Header({ title, showDatePill = true }: { title: string, showDatePill?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { selectedDate, goBack, goForward, isToday } = useDate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch the user's avatar
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
      }
    });
  }, []);

  const dateLabel = isDateToday(selectedDate) ? "Today" : format(selectedDate, "MMM d");

  return (
    <div className="mb-6 flex flex-col gap-4 px-2">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        
        <div className="flex items-center gap-3">
          {/* Profile Icon */}
          <Link href="/profile" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-95 transition-transform border-[1px] border-white/20 p-0.5 overflow-hidden">
             {avatarUrl ? (
               <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
             ) : (
               <User size={18} className="opacity-80" />
             )}
          </Link>
          
          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-95 transition-transform text-accent"
          >
            {mounted && theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Sub Header Controls */}
      {showDatePill && (
        <div className="flex justify-center">
          <div className="glass glass-pill px-4 py-2 flex items-center gap-4 text-sm font-bold opacity-90 shadow-xl inline-flex">
            <button onClick={goBack} className="hover:text-accent transition-colors"><ChevronLeft size={16}/></button>
            <span className="tracking-widest uppercase text-[11px] w-16 text-center">{dateLabel}</span>
            <button onClick={goForward} disabled={isToday} className={`transition-colors ${isToday ? 'opacity-30' : 'hover:text-accent'}`}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
