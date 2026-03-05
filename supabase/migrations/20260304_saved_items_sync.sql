-- Cloud-sync table for saved reps and bills (Step 4: User Accounts)
-- Enables bidirectional merge between localStorage and Supabase

create table if not exists public.saved_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('rep', 'bill')),
  item_key text not null,
  item_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, item_type, item_key)
);

-- Enable Row Level Security
alter table public.saved_items enable row level security;

-- Users can only see their own saved items
create policy "Users can read own saved items"
  on public.saved_items for select
  using (auth.uid() = user_id);

-- Users can insert their own saved items
create policy "Users can insert own saved items"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

-- Users can update their own saved items
create policy "Users can update own saved items"
  on public.saved_items for update
  using (auth.uid() = user_id);

-- Users can delete their own saved items
create policy "Users can delete own saved items"
  on public.saved_items for delete
  using (auth.uid() = user_id);

-- Index for fast lookups by user
create index if not exists idx_saved_items_user
  on public.saved_items(user_id, item_type);

-- Auto-update updated_at timestamp
create or replace function public.update_saved_items_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger saved_items_updated_at
  before update on public.saved_items
  for each row execute function public.update_saved_items_timestamp();
