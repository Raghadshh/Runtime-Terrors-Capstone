-- Run this migration in the Supabase SQL Editor before using Accounts & Profiles.
create table if not exists public.adult_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'independent')),
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  preferred_name text not null default '' check (length(preferred_name) <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.adult_profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  age integer not null check (age between 1 and 17),
  created_at timestamptz not null default now()
);

create index if not exists child_profiles_parent_id_idx on public.child_profiles (parent_id);

alter table public.adult_profiles enable row level security;
alter table public.child_profiles enable row level security;

revoke all on public.adult_profiles from anon, authenticated;
revoke all on public.child_profiles from anon, authenticated;
grant select, insert, update on public.adult_profiles to authenticated;
grant select, insert, update, delete on public.child_profiles to authenticated;

create policy "Read own adult profile" on public.adult_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Create own adult profile" on public.adult_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Update own adult profile" on public.adult_profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Read own child profiles" on public.child_profiles
  for select to authenticated using ((select auth.uid()) = parent_id);
create policy "Create own child profiles" on public.child_profiles
  for insert to authenticated with check (
    (select auth.uid()) = parent_id
    and exists (select 1 from public.adult_profiles where id = parent_id and role = 'parent')
  );
create policy "Update own child profiles" on public.child_profiles
  for update to authenticated using ((select auth.uid()) = parent_id)
  with check (
    (select auth.uid()) = parent_id
    and exists (select 1 from public.adult_profiles where id = parent_id and role = 'parent')
  );
create policy "Delete own child profiles" on public.child_profiles
  for delete to authenticated using ((select auth.uid()) = parent_id);
