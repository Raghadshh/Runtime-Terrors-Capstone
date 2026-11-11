-- Real-life reward goals (Figma screens 26, 27 and 28).
-- Run after 20261002_accounts_profiles.sql and 20261006_f1_tasks_reminders.sql.
-- A child_id of null means the reward is available to everyone in the family.
begin;

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.adult_profiles(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  points integer not null check (points between 1 and 100000),
  description text not null default '' check (length(description) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rewards_user_idx on public.rewards(user_id);
create index if not exists rewards_child_idx on public.rewards(child_id);
create index if not exists rewards_points_idx on public.rewards(user_id, points);

drop trigger if exists rewards_updated on public.rewards;
create trigger rewards_updated before update on public.rewards
  for each row execute function public.touch_updated_at();

alter table public.rewards enable row level security;
revoke all on public.rewards from anon, authenticated;
grant select, insert, update, delete on public.rewards to authenticated;

create policy "Read own rewards" on public.rewards for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Create own rewards" on public.rewards for insert to authenticated with check (
  user_id = (select auth.uid()) and (child_id is null or exists (
    select 1 from public.child_profiles c join public.adult_profiles a on a.id = c.parent_id
      where c.id = child_id and c.parent_id = (select auth.uid()) and a.role = 'parent'
  ))
);
create policy "Update own rewards" on public.rewards for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid()) and (child_id is null or exists (
      select 1 from public.child_profiles c join public.adult_profiles a on a.id = c.parent_id
        where c.id = child_id and c.parent_id = (select auth.uid()) and a.role = 'parent'
    ))
  );
create policy "Delete own rewards" on public.rewards for delete to authenticated
  using (user_id = (select auth.uid()));

-- Give every existing family the three starter goals once.
insert into public.rewards (user_id, child_id, name, points, description)
select a.id, null, goal.name, goal.points, goal.description
from public.adult_profiles a
cross join (values
  ('Choose dinner', 80, 'Pick what is for dinner'),
  ('Extra game time', 150, '30 extra minutes of screen time'),
  ('Movie night', 200, 'Pick a movie for family night')
) as goal(name, points, description)
where not exists (select 1 from public.rewards r where r.user_id = a.id);

-- New accounts get the same starter goals when their adult profile is created.
create or replace function public.seed_default_rewards() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.rewards r where r.user_id = new.id) then
    insert into public.rewards (user_id, child_id, name, points, description) values
      (new.id, null, 'Choose dinner', 80, 'Pick what is for dinner'),
      (new.id, null, 'Extra game time', 150, '30 extra minutes of screen time'),
      (new.id, null, 'Movie night', 200, 'Pick a movie for family night');
  end if;
  return new;
end;
$$;
revoke all on function public.seed_default_rewards() from public, anon, authenticated;

drop trigger if exists adult_profiles_seed_rewards on public.adult_profiles;
create trigger adult_profiles_seed_rewards after insert on public.adult_profiles
  for each row execute function public.seed_default_rewards();

-- Refresh the reward screens when another signed-in device saves a change.
do $$
begin
  alter publication supabase_realtime add table public.rewards;
exception when duplicate_object then null;
end;
$$;

commit;
