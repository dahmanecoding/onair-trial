"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && path !== "/login") router.replace("/login");
      else if (data.session && path === "/login") router.replace("/");
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [path, router]);
  if (!ready) return <div className="min-h-screen bg-bg" />;
  return <>{children}</>;
}
