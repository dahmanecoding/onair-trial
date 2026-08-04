-- OnAir Dashboard — initial schema
-- Reconstructed from the live project (asbeddbtxmgulwklmunj) on 2026-08-04.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

-- ---------- extensions ----------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net with schema public;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists supabase_vault with schema vault;

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Rome',
  baseline_window_days integer not null default 30,
  created_at timestamptz not null default now()
);

create table if not exists public.fitbit_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  fitbit_user_id text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

create table if not exists public.sleep_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_id text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  minutes_asleep integer,
  minutes_deep integer,
  minutes_light integer,
  minutes_rem integer,
  minutes_awake integer,
  efficiency integer,
  is_main_sleep boolean default true,
  raw jsonb,
  unique (user_id, source_id)
);

create table if not exists public.workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_id text not null,
  activity_type text,
  start_at timestamptz not null,
  duration_sec integer,
  calories integer,
  avg_hr integer,
  max_hr integer,
  hr_zones jsonb,
  raw jsonb,
  unique (user_id, source_id)
);

create table if not exists public.daily_metrics (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  metric text not null,
  value numeric,
  raw jsonb,
  unique (user_id, date, metric)
);

create table if not exists public.hr_intraday (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ts timestamptz not null,
  bpm integer not null,
  unique (user_id, ts)
);

create table if not exists public.readiness_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  score integer,
  hrv_component numeric,
  sleep_component numeric,
  rhr_component numeric,
  inputs jsonb,
  computed_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.sync_runs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  trigger text not null default 'cron',
  mode text not null default 'incremental',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text,
  records_upserted integer default 0,
  error text
);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.fitbit_tokens enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.workouts enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.hr_intraday enable row level security;
alter table public.readiness_scores enable row level security;
alter table public.sync_runs enable row level security;

-- profiles: user can read/update their own row (insert happens via trigger, service role only)
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- data tables: read-only for the owning user; all writes come from the service-role edge functions
drop policy if exists "own sleep" on public.sleep_sessions;
create policy "own sleep" on public.sleep_sessions for select using (auth.uid() = user_id);

drop policy if exists "own workouts" on public.workouts;
create policy "own workouts" on public.workouts for select using (auth.uid() = user_id);

drop policy if exists "own metrics" on public.daily_metrics;
create policy "own metrics" on public.daily_metrics for select using (auth.uid() = user_id);

drop policy if exists "own intraday" on public.hr_intraday;
create policy "own intraday" on public.hr_intraday for select using (auth.uid() = user_id);

drop policy if exists "own readiness" on public.readiness_scores;
create policy "own readiness" on public.readiness_scores for select using (auth.uid() = user_id);

drop policy if exists "own syncruns" on public.sync_runs;
create policy "own syncruns" on public.sync_runs for select using (auth.uid() = user_id);

-- fitbit_tokens: intentionally has NO client-facing policy. RLS is enabled with zero policies,
-- so it is completely inaccessible from the anon/authenticated client roles; only the
-- service-role key used inside edge functions can read or write it.

-- ---------- new-user bootstrap ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- vault secret used by the cron jobs below ----------
-- Run once manually (values are secret, so this is NOT included as a literal here):
--   select vault.create_secret('<SYNC_SECRET value>', 'sync_secret');
-- This must match the SYNC_SECRET edge function secret set on fitbit-sync / fitbit-oauth / fitbit-webhook.

-- ---------- scheduled sync ----------
select cron.unschedule('fitbit-sync-10min') where exists (
  select 1 from cron.job where jobname = 'fitbit-sync-10min'
);
select cron.schedule(
  'fitbit-sync-10min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://asbeddbtxmgulwklmunj.supabase.co/functions/v1/fitbit-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body := jsonb_build_object('mode','incremental','trigger','cron')
  );
  $$
);

select cron.unschedule('fitbit-sync-nightly') where exists (
  select 1 from cron.job where jobname = 'fitbit-sync-nightly'
);
select cron.schedule(
  'fitbit-sync-nightly',
  '30 3 * * *',
  $$
  select net.http_post(
    url := 'https://asbeddbtxmgulwklmunj.supabase.co/functions/v1/fitbit-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body := jsonb_build_object('mode','reconcile','trigger','cron')
  );
  $$
);
