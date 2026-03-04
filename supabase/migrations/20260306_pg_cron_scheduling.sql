-- pg_cron scheduling for leaderboard refresh and daily challenge generation
-- Requires pg_cron extension (enabled by default on Supabase Pro+)

-- Enable pg_cron if not already enabled
create extension if not exists pg_cron with schema pg_catalog;

-- Grant usage to postgres role (needed for scheduling)
grant usage on schema cron to postgres;

-- ──────────────────────────────────────────────────
-- 1. Refresh leaderboard materialized view every hour
-- ──────────────────────────────────────────────────
select cron.schedule(
  'refresh-leaderboard',
  '0 * * * *',                -- every hour on the hour
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard$$
);

-- ──────────────────────────────────────────────────
-- 2. Generate daily challenge at midnight UTC each day
--    Uses a DB function that calls net.http_post to
--    invoke the generate-daily-challenge edge function.
-- ──────────────────────────────────────────────────

-- Helper function: insert today's challenge directly in SQL
-- (avoids needing pg_net / HTTP calls from cron)
create or replace function public.generate_daily_challenge()
returns void as $$
declare
  today date := current_date;
  day_of_year int;
  tpl record;
  templates jsonb := '[
    {"challenge_type":"read_bills","title":"Bill Explorer","description":"Read 3 different bills today","target_count":3,"xp_reward":50},
    {"challenge_type":"explore_reps","title":"Rep Researcher","description":"Learn about 2 different politicians today","target_count":2,"xp_reward":50},
    {"challenge_type":"read_bills","title":"Legislative Deep Dive","description":"Read 5 different bills today","target_count":5,"xp_reward":75},
    {"challenge_type":"explore_reps","title":"Know Your Reps","description":"Explore 3 different politician profiles today","target_count":3,"xp_reward":50},
    {"challenge_type":"save_items","title":"Building Your Watchlist","description":"Save 2 representatives or bills to your watchlist","target_count":2,"xp_reward":50},
    {"challenge_type":"quiz","title":"Knowledge Check","description":"Complete the daily quiz","target_count":1,"xp_reward":50},
    {"challenge_type":"read_bills","title":"Informed Voter","description":"Read 2 bills and explore 1 politician","target_count":3,"xp_reward":50}
  ]';
  template jsonb;
begin
  -- Skip if today's challenge already exists
  if exists (select 1 from public.daily_challenges where challenge_date = today) then
    return;
  end if;

  -- Deterministic rotation based on day of year
  day_of_year := extract(doy from today)::int;
  template := templates -> (day_of_year % jsonb_array_length(templates));

  insert into public.daily_challenges (
    challenge_date,
    challenge_type,
    title,
    description,
    target_count,
    xp_reward
  ) values (
    today,
    template ->> 'challenge_type',
    template ->> 'title',
    template ->> 'description',
    (template ->> 'target_count')::int,
    (template ->> 'xp_reward')::int
  )
  on conflict (challenge_date) do nothing;
end;
$$ language plpgsql security definer;

select cron.schedule(
  'generate-daily-challenge',
  '1 0 * * *',                -- 00:01 UTC daily (1 min after midnight)
  $$select public.generate_daily_challenge()$$
);
