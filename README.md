# OnAir Dashboard

Personal health dashboard pulling sleep, heart rate/HRV, readiness, and workout
data from a Nilox OnAir band, via Health Connect → Health Sync → Google Health API
→ Supabase → this Next.js PWA.

## Architecture

```
Nilox OnAir band → NILOX ONAIR app → Health Connect (Android)
                                          │
                                    Health Sync app
                                          │
                                   Google Fitbit account (Google Health API)
                                          │
                        Supabase Edge Functions (Deno, service role)
                          - fitbit-oauth    Google OAuth 2.0 flow
                          - fitbit-sync     ingest + readiness scoring, on a schedule
                          - fitbit-webhook  optional push-triggered targeted sync
                                          │
                             Postgres (RLS-protected, per-user)
                                          │
                          Next.js 14 PWA  (this repo)  →  Vercel
```

## Repo layout

```
app/            Next.js App Router pages (/, /sleep, /heart, /workouts, /settings, /login)
components/     Gauge, Ring, TabBar, Header, AuthGate, FreshnessLamp, SwRegister
lib/            supabase client, formatting helpers
public/         PWA manifest, service worker, icons
supabase/
  functions/    Edge Function source (fitbit-sync, fitbit-oauth, fitbit-webhook)
  migrations/   SQL schema, RLS policies, trigger, cron jobs
  config.toml   Supabase CLI project config
```

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`)
- A Supabase project (this repo targets `asbeddbtxmgulwklmunj` / "onair-dashboard")
- A Google Cloud project with the **Google Health API** enabled and an OAuth
  consent screen configured (External, scopes below)

## Local setup

```bash
npm install
npm run dev
```

The Supabase URL and publishable anon key are hardcoded in `lib/supabase.ts`
(safe to ship — all data access is enforced by RLS), so no `.env` file is
needed to run the frontend.

## Deploying the database + edge functions

```bash
supabase login
supabase link --project-ref asbeddbtxmgulwklmunj
supabase db push                 # applies supabase/migrations/*.sql
supabase functions deploy fitbit-sync    --no-verify-jwt
supabase functions deploy fitbit-oauth   --no-verify-jwt
supabase functions deploy fitbit-webhook --no-verify-jwt
```

### Required Edge Function secrets

Set these in the Supabase dashboard (Edge Functions → Secrets) or via
`supabase secrets set KEY=value`:

| Secret | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID (type **Web application**) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `SYNC_SECRET` | Shared secret checked on every sync call — generate a long random string |
| `APP_URL` | This app's deployed URL (used for OAuth success redirect). No trailing slash, no stray whitespace. |
| `FITBIT_VERIFY_CODE` | Only needed if you register a Google webhook subscriber; the app runs fine on polling without it |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to
every Edge Function by Supabase — do not set them yourself.

Google OAuth client redirect URI must be exactly:
`https://asbeddbtxmgulwklmunj.supabase.co/functions/v1/fitbit-oauth`

Google OAuth scopes requested:
```
https://www.googleapis.com/auth/googlehealth.sleep.readonly
https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly
https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly
https://www.googleapis.com/auth/googlehealth.profile.readonly
```

### Vault secret for cron

The two pg_cron jobs (`fitbit-sync-10min`, `fitbit-sync-nightly`) read the
sync secret from Supabase Vault rather than a hardcoded value. After running
the migration once, set it manually (this value is NOT in the migration file
on purpose — it's a secret):

```sql
select vault.create_secret('<same value as the SYNC_SECRET edge function secret>', 'sync_secret');
```

If you ever rotate `SYNC_SECRET`, update both the Edge Function secret and
the vault entry (`select vault.update_secret(...)`), or the cron-triggered
syncs will start getting `403 forbidden`.

### Consent screen note

While the Google OAuth consent screen is in **Testing** mode, refresh tokens
expire after ~7 days, requiring a manual reconnect from Settings. Publish the
consent screen to Production to avoid this.

## Deploying the frontend

```bash
vercel --prod
```

or connect this repo to a Vercel project and let it build on push
(framework preset: Next.js, no special build settings needed).

## Data flow notes

- All writes to Postgres happen via the edge functions using the service-role
  key; the anon/authenticated client role can only **read** its own rows
  (enforced by RLS policies in the migration).
- `fitbit_tokens` has RLS enabled with **no policies at all** — it's
  intentionally unreachable from the client entirely, service-role only.
- Readiness score = weighted blend of HRV (50%), sleep quality (30%), and
  resting HR (20%) vs. a rolling baseline (`profiles.baseline_window_days`,
  default 30 days). Components degrade gracefully if a signal doesn't have
  enough history yet.
- `fitbit-webhook` is currently inert in practice — Google Health API webhook
  subscriptions are project-level, not per-user, so polling via the two cron
  jobs covers all syncing today. The function is included for when that gets
  wired up.
