"use client";

import { useMemo, useState } from "react";

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);

  const googleHealthAuthUrl = useMemo(() => {
    return "/api/google-health/connect";
  }, []);

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-3 text-sm text-neutral-400">
        Connect your Google Health account to sync sleep, heart rate, steps,
        workouts, and readiness.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-neutral-300">Health connection</div>
        <div className="mt-1 text-lg font-medium">
          {connected ? "Google Health connected" : "Not connected"}
        </div>
        <p className="mt-2 text-sm text-neutral-400">
          {connected
            ? "Your account is linked and ready to sync."
            : "Link Google Health to import your data into OnAir."}
        </p>

        <a
          href={googleHealthAuthUrl}
          className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-medium text-black"
        >
          {connected ? "Reconnect Google Health" : "Connect Google Health"}
        </a>
      </div>
    </main>
  );
}// PLACEHOLDER: fetched content needed here
