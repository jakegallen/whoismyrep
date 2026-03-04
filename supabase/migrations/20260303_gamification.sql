-- ============================================================
-- Gamification Phase 1: user_profiles, xp_events, user_achievements
-- ============================================================

-- 1. User profile + XP/level tracking
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  home_state text,
  home_district text,
  xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  total_active_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- 2. XP event log (append-only)
create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  action text not null,
  xp_earned integer not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy "Users can read own xp events"
  on public.xp_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own xp events"
  on public.xp_events for insert
  with check (auth.uid() = user_id);

create index idx_xp_events_user_date
  on public.xp_events(user_id, created_at desc);

-- 3. Achievements unlocked by user
create table if not exists public.user_achievements (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique(user_id, achievement_key)
);

alter table public.user_achievements enable row level security;

create policy "Users can read own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
