"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const go = async () => {
    setBusy(true); setErr(null);
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password: pw })
      : supabase.auth.signUp({ email, password: pw });
    const { error } = await fn;
    setBusy(false);
    if (error) setErr(error.message);
    else router.replace("/");
  };

  return (
    <div className="flex min-h-[85vh] flex-col justify-center">
      <div className="mb-10 text-center">
        <div className="font-display text-4xl font-bold tracking-tight">ONAIR</div>
        <div className="mt-2 font-mono text-[11px] tracking-[0.3em] text-muted">RECOVERY · SLEEP · TRAINING</div>
      </div>
      <div className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
          className="w-full rounded-xl border border-hair bg-surface px-4 py-3 text-ink outline-none focus:border-ice" />
        <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" type="password"
          className="w-full rounded-xl border border-hair bg-surface px-4 py-3 text-ink outline-none focus:border-ice" />
        {err && <p className="text-sm text-low">{err}</p>}
        <button onClick={go} disabled={busy || !email || !pw}
          className="w-full rounded-xl bg-ink py-3 font-display font-semibold text-bg disabled:opacity-40">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full py-2 text-sm text-muted">
          {mode === "signin" ? "First time here? Create your account" : "Already set up? Sign in"}
        </button>
      </div>
      <p className="mt-10 text-center font-mono text-[10px] text-muted">Not a medical device — wellness purposes only</p>
    </div>
  );
}
