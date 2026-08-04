"use client";
import { useEffect, useState } from "react";
import { supabase, FN_URL } from "@/lib/supabase";
import Header from "@/components/Header";
import { ago } from "@/lib/format";

export default function Settings() {
  const [runs, setRuns] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(8)
      .then(({ data }) => setRuns(data ?? []));
    // Any data at all implies a working Fitbit connection.
    supabase.from("daily_metrics").select("id").limit(1)
      .then(({ data }) => setConnected((data?.length ?? 0) > 0));
  }, []);

  const connectFitbit = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) window.location.href = `${FN_URL}/fitbit-oauth?action=start&token=${encodeURIComponent(token)}`;
  };

  return (
    <>
      <Header title="Setup" />
      <div className="space-y-4">
        <div className="rounded-2xl border border-hair bg-surface p-4">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted">DATA SOURCE</p>
          <p className="mt-1 text-sm text-muted">Band → Nilox app → Health Connect → Health Sync → Fitbit → here.</p>
          <button onClick={connectFitbit} className="mt-3 w-full rounded-xl bg-ink py-3 font-display font-semibold text-bg">
            {connected ? "Reconnect Fitbit" : "Connect Fitbit"}
          </button>
          {connected === false && <p className="mt-2 text-[11px] text-muted">Connect once — historical data backfills automatically afterwards.</p>}
        </div>

        <div className="rounded-2xl border border-hair bg-surface p-4">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted">SYNC LOG</p>
          {runs.length === 0 ? <p className="mt-2 text-sm text-muted">No runs yet — the scheduler fires every 10 minutes.</p> : (
            <ul className="mt-2 space-y-1">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted">{ago(r.started_at)} · {r.mode}</span>
                  <span style={{ color: r.status === "ok" ? "#3DE24B" : r.status === "error" ? "#FF4E42" : "#8A93A5" }}>
                    {r.status ?? "running"} {r.status === "ok" ? `· ${r.records_upserted}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-hair bg-surface p-4">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted">ACCOUNT</p>
          <p className="mt-1 text-sm">{email}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-3 w-full rounded-xl border border-hair py-3 text-sm text-muted">
            Sign out
          </button>
        </div>
        <p className="text-center font-mono text-[10px] text-muted">Not a medical device — wellness purposes only</p>
      </div>
    </>
  );
}
