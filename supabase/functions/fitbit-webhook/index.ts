import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const VERIFY_CODE = Deno.env.get("FITBIT_VERIFY_CODE") ?? "";
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Fitbit subscriber verification handshake
  if (req.method === "GET") {
    const v = url.searchParams.get("verify");
    if (v && VERIFY_CODE && v === VERIFY_CODE) return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  }

  if (req.method === "POST") {
    let notifications: any[] = [];
    try { notifications = await req.json(); } catch { /* empty body is fine */ }

    const work = (async () => {
      for (const n of notifications ?? []) {
        try {
          await fetch(`${SB_URL}/functions/v1/fitbit-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-sync-secret": SYNC_SECRET },
            body: JSON.stringify({ mode: "targeted", collection: n.collectionType, date: n.date, trigger: "webhook" }),
          });
        } catch (e) { console.warn("targeted sync dispatch failed", e); }
      }
    })();
    // Respond fast (Fitbit requires < 5s), finish work in background
    // @ts-ignore EdgeRuntime available in Supabase edge functions
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work); else await work;
    return new Response(null, { status: 204 });
  }

  return new Response("method not allowed", { status: 405 });
});
