-- Phase 3: Leaderboard materialized view

-- Materialized view for fast leaderboard queries
create materialized view public.leaderboard as
  select
    up.id as user_id,
    up.display_name,
    up.avatar_url,
    up.xp,
    up.level,
    up.current_streak,
    up.total_active_days,
    (select count(*)::int from public.user_achievements ua where ua.user_id = up.id) as achievement_count,
    rank() over (order by up.xp desc) as xp_rank,
    rank() over (order by up.current_streak desc) as streak_rank
  from public.user_profiles up
  where up.xp > 0
    and up.display_name is not null;

create unique index idx_leaderboard_user on public.leaderboard(user_id);

-- Grant read access (leaderboard is public)
grant select on public.leaderboard to anon, authenticated;
