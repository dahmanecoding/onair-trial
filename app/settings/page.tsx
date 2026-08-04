"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setIsSignedIn(!!data.session);
      setConnected(!!data.session);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleConnect() {
    if (!supabase) return;

    const { data: refreshed } = await supabase.auth.refreshSession();
    const token = refreshed.session?.access_token;

    if (!token) {
      router.push("/login");
      return;
    }

    window.location.href = `/api/google-health/connect?token=${encodeURIComponent(token)}`;
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-3 text-sm text-neutral-400">
        Connect your Google Health account to sync sleep, heart rate, steps, workouts, and readiness.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-neutral-300">Health connection</div>
        <div className="mt-1 text-lg font-medium">
          {loading ? "Checking status..." : connected ? "Google Health connected" : "Not connected"}
        </div>
        <p className="mt-2 text-sm text-neutral-400">
          {loading
            ? "Loading your session..."
            : connected
              ? "Your account is linked and ready to sync."
              : isSignedIn
                ? "Link Google Health to import your data into OnAir."
                : "Sign in first, then connect Google Health."}
        </p>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
        >
          {connected ? "Reconnect Google Health" : "Connect Google Health"}
        </button>
      </div>
    </main>
  );
}
