import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ===== Google OAuth 2.0 for the Google Health API =====
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clean = (s: string) => s.replace(/\s+/g, "");
const CLIENT_ID = clean(Deno.env.get("GOOGLE_CLIENT_ID") ?? "");
const CLIENT_SECRET = clean(Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "");
const SYNC_SECRET = clean(Deno.env.get("SYNC_SECRET") ?? "");
const APP_URL = clean(Deno.env.get("APP_URL") ?? "/").replace(/\/$/, "");
const SELF_URL = `${SB_URL}/functions/v1/google-health-oauth`;
const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.profile.readonly",
].join(" ");

const db = createClient(SB_URL, SERVICE_KEY);

async function hmac(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SYNC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const page = (title: string, body: string, status = 400) =>
  new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="background:#0B0F1A;color:#E8EAF2;font-family:system-ui;padding:2rem;max-width:30rem;margin:auto"><h2>${title}</h2><p style="color:#8A93AD">${body}</p><p><a style="color:#7FB4E6" href="${APP_URL}">Back to OnAir</a></p></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  try {
    const missing = [
      !CLIENT_ID && "GOOGLE_CLIENT_ID",
      !CLIENT_SECRET && "GOOGLE_CLIENT_SECRET",
      !SYNC_SECRET && "SYNC_SECRET",
      (!Deno.env.get("APP_URL")) && "APP_URL",
    ].filter(Boolean);
    if (missing.length) {
      return page("Setup incomplete",
        `These Edge Function secrets are not set yet: <b>${missing.join(", ")}</b>.<br><br>Add them in the Supabase dashboard under Edge Functions \u2192 Secrets, then try again.`, 503);
    }

    const url = new URL(req.url);

    if (url.searchParams.get("action") === "start") {
      const jwt = url.searchParams.get("token") ?? "";
      const { data, error } = await db.auth.getUser(jwt);
      if (error || !data?.user) return page("Session expired", "Open the app, sign in, and press Connect again from Settings.", 401);
      const uid = data.user.id;
      const state = `${uid}.${await hmac(uid)}`;
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("client_id", CLIENT_ID);
      auth.searchParams.set("redirect_uri", SELF_URL);
      auth.searchParams.set("scope", SCOPES);
      auth.searchParams.set("access_type", "offline");
      auth.searchParams.set("prompt", "consent");
      auth.searchParams.set("include_granted_scopes", "true");
      auth.searchParams.set("state", state);
      return Response.redirect(auth.toString(), 302);
    }

    if (url.searchParams.get("error")) {
      return page("Connection cancelled", `Google returned: ${url.searchParams.get("error")}. You can retry from Settings.`);
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? "";
    if (!code) {
      return page("Nothing to do here", "This address is the OAuth callback. To connect your data, open the app and press <b>Connect Google Health</b> in Settings.", 200);
    }
    const [uid, sig] = state.split(".");
    if (!uid || sig !== (await hmac(uid))) return page("Invalid request state", "Start the connection from the app's Settings page.", 403);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code", code,
        redirect_uri: SELF_URL, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) return page("Token exchange failed", `Google said: ${(await tokenRes.text()).slice(0, 300)}`, 502);
    const tok = await tokenRes.json();
    if (!tok.refresh_token) {
      return page("No refresh token received",
        "Google only issues the offline refresh token on a fresh consent. Remove this app's access at myaccount.google.com \u2192 Security \u2192 Third-party access, then press Connect again.");
    }

    await db.from("google_health_tokens").upsert([{
      user_id: uid,
      google_user_id: null,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      scope: tok.scope ?? null,
      updated_at: new Date().toISOString(),
    }], { onConflict: "user_id" });

    fetch(`${SB_URL}/functions/v1/google-health-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-secret": SYNC_SECRET },
      body: JSON.stringify({ mode: "backfill", days: 90, trigger: "oauth-connect" }),
    }).catch(() => {});

    // Robust even if APP_URL is malformed: fall back to a success page.
    try {
      return Response.redirect(new URL(`${APP_URL}/?connected=1`).toString(), 302);
    } catch {
      return page("Connected!", "Your Google Health data is linked and the first sync is running. You can close this tab and open the app.", 200);
    }
  } catch (e) {
    console.error("google-health-oauth error", e);
    return page("Something went wrong", `Unexpected error: ${String(e).slice(0, 200)}. Check the function logs.`, 500);
  }
});
