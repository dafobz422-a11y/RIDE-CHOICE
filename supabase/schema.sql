-- RideChoice database schema for Supabase.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.
--
-- Each table keeps the app's own JSON shape in `data` (see src/lib/types.ts)
-- plus the columns needed for ownership and ordering. Row-level security
-- limits every row to the signed-in rider who owns it.

-- Profiles: one per auth user, created automatically on sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- The rider's last search (pickup, dropoff, optional scheduled time).
create table if not exists public.drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  scheduled_for timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists bookings_user_created_idx on public.bookings (user_id, created_at desc);

create table if not exists public.ratings (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ratings_user_idx on public.ratings (user_id);

-- Row-level security: riders can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.drafts enable row level security;
alter table public.bookings enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "Own profile" on public.profiles;
create policy "Own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Own preferences" on public.preferences;
create policy "Own preferences" on public.preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Own drafts" on public.drafts;
create policy "Own drafts" on public.drafts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Own bookings" on public.bookings;
create policy "Own bookings" on public.bookings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Own ratings" on public.ratings;
create policy "Own ratings" on public.ratings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Create the profile row when someone signs up, taking the name they entered.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
