-- Phase 2: Daily challenges & challenge progress

-- Daily challenges (one per day, same for all users)
create table if not exists public.daily_challenges (
  id bigint generated always as identity primary key,
  challenge_date date not null unique,
  challenge_type text not null,      -- 'read_bills', 'explore_reps', 'quiz', 'save_items'
  title text not null,
  description text not null,
  target_count integer not null default 1,
  xp_reward integer not null default 50,
  created_at timestamptz not null default now()
);
alter table public.daily_challenges enable row level security;
create policy "Anyone can read challenges" on public.daily_challenges for select using (true);

-- User progress on daily challenges
create table if not exists public.challenge_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  challenge_id bigint not null references public.daily_challenges(id),
  progress integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique(user_id, challenge_id)
);
alter table public.challenge_progress enable row level security;
create policy "Users can read own progress" on public.challenge_progress for select using (auth.uid() = user_id);
create policy "Users can insert own progress" on public.challenge_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on public.challenge_progress for update using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_challenge_progress_user on public.challenge_progress(user_id, challenge_id);
create index if not exists idx_daily_challenges_date on public.daily_challenges(challenge_date desc);
