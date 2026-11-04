-- ============================================================
-- SandSpot — booking layer schema
-- Run this in Supabase → SQL Editor when the API layer opens.
-- Tables are additive: nothing here touches existing data.
-- Backend switch in JS happens automatically once `bookings`
-- exists and REST GET /bookings returns 200.
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- profiles (role: player | venue | admin) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text        not null default 'player'
                           check (role in ('player', 'venue', 'admin')),
  display_name text,
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- auto-create a profile for every signup
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public language plpgsql as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- helpers used in policies
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- who owns which court ----------
create table if not exists public.venue_owners (
  user_id    uuid not null references auth.users(id) on delete cascade,
  court_id   uuid not null references public.courts(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, court_id)
);
create index if not exists venue_owners_court on public.venue_owners (court_id);
alter table public.venue_owners enable row level security;

create policy "venue_owners: read own grants"
  on public.venue_owners for select
  using (auth.uid() = user_id
         or public.is_admin()
         -- players may see venue identity of a court page
         or true);

create policy "venue_owners: admin grants"
  on public.venue_owners for insert with check (public.is_admin());

-- ---------- the bookings ----------
create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  court_id   uuid        not null references public.courts(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  slot_date  date        not null,
  slot_start time        not null,
  slot_end   time        not null,
  status     text        not null default 'confirmed'
                         check (status in ('confirmed', 'cancelled')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_court_date on public.bookings (court_id, slot_date);
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- one confirmed booking per court/date/hour; history survives cancels
create unique index if not exists bookings_active_slot
  on public.bookings (court_id, slot_date, slot_start)
  where status = 'confirmed';

alter table public.bookings enable row level security;

create policy "bookings: read for availability"
  on public.bookings for select using (true);

create policy "bookings: book for self"
  on public.bookings for insert
  with check (auth.uid() = user_id and status = 'confirmed');

create policy "bookings: cancel own"
  on public.bookings for update using (auth.uid() = user_id);

create policy "bookings: venue cancels own courts"
  on public.bookings for update
  using (exists (
    select 1 from public.venue_owners vo
    where vo.court_id = bookings.court_id and vo.user_id = auth.uid()
  ));

create policy "bookings: admin moderates"
  on public.bookings for update using (public.is_admin());

-- ============================================================
-- Activation checklist (later phase):
--   1. Dashboard → SQL Editor → run this file.
--   2. Auth → enable Email signup (confirm-by-email off for beta).
--   3. Invite your admin: Auth → Add user → promotes via SQL:
--      update profiles set role='admin' where id='<user-uuid>';
--   4. Grant a venue account:
--      insert into venue_owners (user_id, court_id)
--        select '<venue-user-uuid>', id from courts where name ilike '%Kite Beach%';
-- Until then the frontend runs the same logic in sandbox mode
-- (assets/suite.js) — identical state machine, localStorage backing.
-- ============================================================
