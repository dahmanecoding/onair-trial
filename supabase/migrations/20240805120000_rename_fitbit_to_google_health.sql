-- Migration: rename all Fitbit references → Google Health
-- Safe to re-run: every statement is guarded.

-- 1. Rename the table
ALTER TABLE IF EXISTS public.fitbit_tokens RENAME TO google_health_tokens;

-- 2. Rename the legacy column
ALTER TABLE IF EXISTS public.google_health_tokens RENAME COLUMN fitbit_user_id TO google_user_id;

-- 3. Unschedule old cron jobs
SELECT cron.unschedule('fitbit-sync-10min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fitbit-sync-10min'
);
SELECT cron.unschedule('fitbit-sync-nightly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fitbit-sync-nightly'
);

-- 4. Re-create cron jobs pointing to google-health-sync
SELECT cron.schedule(
  'google-health-sync-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://asbeddbtxmgulwklmunj.supabase.co/functions/v1/google-health-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret')
    ),
    body := jsonb_build_object('mode','incremental','trigger','cron')
  );
  $$
);

SELECT cron.schedule(
  'google-health-sync-nightly',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://asbeddbtxmgulwklmunj.supabase.co/functions/v1/google-health-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret')
    ),
    body := jsonb_build_object('mode','reconcile','trigger','cron')
  );
  $$
);
