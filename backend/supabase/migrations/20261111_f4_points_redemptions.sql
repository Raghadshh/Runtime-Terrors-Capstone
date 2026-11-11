-- F4: persistent points, configurable routine awards, and reward redemption.
-- Apply after 20261110_reward_children.sql. Safe to rerun with the same F4 schema.
begin;

-- These fields may already exist in projects that enabled completion photos manually.
alter table public.tasks add column if not exists requires_photo boolean not null default false;
alter table public.tasks add column if not exists approval_status text not null default 'none';
alter table public.tasks add column if not exists completion_photo_url text;
-- Some projects already store configurable routine points. Preserve those values.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'routines' and column_name = 'points'
  ) then
    alter table public.routines add column points integer not null default 10 check (points between 0 and 1000);
    -- Only routines without an existing points field need the old two-points-per-step amount.
    update public.routines r set points = least(1000, 2 * (
      select count(*) from public.routine_steps s where s.routine_id = r.id
    ));
  end if;
end;
$$;

-- Keep the amount and recipient at completion time, even if the activity is edited later.
-- One award per occurrence prevents undo/re-complete from earning the same points twice.
create table if not exists public.point_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.adult_profiles(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  source_type text not null check (source_type in ('task', 'routine')),
  source_id uuid not null,
  occurrence_date date not null,
  points integer not null check (points between 0 and 1000),
  awarded boolean not null default true,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, occurrence_date)
);
create index if not exists point_earnings_owner_idx on public.point_earnings(user_id, child_id);

create table if not exists public.reward_redemptions (
  id uuid primary key,
  user_id uuid not null references public.adult_profiles(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  reward_id uuid not null,
  reward_name text not null,
  points_spent integer not null check (points_spent between 1 and 100000),
  redeemed_at timestamptz not null default now()
);
create index if not exists reward_redemptions_owner_idx on public.reward_redemptions(user_id, child_id, redeemed_at desc);

alter table public.point_earnings enable row level security;
alter table public.reward_redemptions enable row level security;
revoke all on public.point_earnings, public.reward_redemptions from anon, authenticated;
grant select on public.point_earnings, public.reward_redemptions to authenticated;
drop policy if exists "Read own point earnings" on public.point_earnings;
create policy "Read own point earnings" on public.point_earnings for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Read own redemptions" on public.reward_redemptions;
create policy "Read own redemptions" on public.reward_redemptions for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.record_task_points() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tasks;
begin
  select * into t from public.tasks where id = new.task_id;
  -- Serialize point changes for this account, including simultaneous redemptions.
  perform 1 from public.adult_profiles where id = t.user_id for update;
  insert into public.point_earnings(user_id, child_id, source_type, source_id, occurrence_date, points, awarded)
    values(t.user_id, t.child_id, 'task', t.id, new.occurrence_date, t.points, not t.requires_photo)
    on conflict (source_type, source_id, occurrence_date) do nothing;
  return new;
end;
$$;
drop trigger if exists task_points on public.task_completions;
create trigger task_points after insert on public.task_completions
  for each row execute function public.record_task_points();

create or replace function public.approve_task_points() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.requires_photo and new.approval_status = 'approved' then
    perform 1 from public.adult_profiles where id = new.user_id for update;
    -- Approval applies to the latest submitted occurrence, never all recurring days.
    update public.point_earnings set awarded = true
      where source_type = 'task' and source_id = new.id and not awarded
        and occurrence_date = (select max(occurrence_date) from public.task_completions where task_id = new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists task_approval_points on public.tasks;
create trigger task_approval_points after update of approval_status on public.tasks
  for each row execute function public.approve_task_points();

create or replace function public.record_routine_points() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.routines;
begin
  select routines.* into r from public.routines routines
    join public.routine_steps s on s.routine_id = routines.id where s.id = new.step_id;
  perform 1 from public.adult_profiles where id = r.user_id for update;
  if not exists (
    select 1 from public.routine_steps s where s.routine_id = r.id and not exists (
      select 1 from public.routine_step_completions c where c.step_id = s.id and c.occurrence_date = new.occurrence_date
    )
  ) then
    insert into public.point_earnings(user_id, child_id, source_type, source_id, occurrence_date, points)
      values(r.user_id, r.child_id, 'routine', r.id, new.occurrence_date, r.points)
      on conflict (source_type, source_id, occurrence_date) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists routine_points on public.routine_step_completions;
create trigger routine_points after insert on public.routine_step_completions
  for each row execute function public.record_routine_points();

-- Preserve the old save_routine signature for existing callers. This wrapper is atomic.
create or replace function public.save_routine_with_points(
  p_id uuid, p_name text, p_subtitle text, p_days smallint[], p_time time,
  p_child_id uuid, p_steps jsonb, p_points integer
) returns uuid language plpgsql security invoker set search_path = public as $$
declare saved_id uuid;
begin
  if p_points is null or p_points not between 0 and 1000 then
    raise exception 'Points must be a whole number from 0 to 1000.';
  end if;
  saved_id := public.save_routine(p_id, p_name, p_subtitle, p_days, p_time, p_child_id, p_steps);
  update public.routines set points = p_points where id = saved_id;
  return saved_id;
end;
$$;

create or replace function public.get_point_balance(p_child_id uuid default null) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object('balance', earned - spent, 'earned', earned) from
    (select coalesce(sum(points), 0) as earned from public.point_earnings
      where user_id = auth.uid() and child_id is not distinct from p_child_id and awarded) e,
    (select coalesce(sum(points_spent), 0) as spent from public.reward_redemptions
      where user_id = auth.uid() and child_id is not distinct from p_child_id) s;
$$;

create or replace function public.redeem_reward(p_reward_id uuid, p_child_id uuid, p_request_id uuid, p_expected_cost integer)
returns public.reward_redemptions language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid := auth.uid();
  account_role text;
  goal public.rewards;
  receipt public.reward_redemptions;
  available bigint;
begin
  if owner_id is null then raise exception 'Log in to redeem rewards.'; end if;
  if p_request_id is null then raise exception 'A redemption request ID is required.'; end if;
  -- The lock makes checking the balance and spending points one operation across devices.
  select role into account_role from public.adult_profiles where id = owner_id for update;
  if account_role is null then raise exception 'Account not found.'; end if;
  select * into receipt from public.reward_redemptions where id = p_request_id and user_id = owner_id;
  if found then
    if receipt.child_id is distinct from p_child_id or receipt.reward_id is distinct from p_reward_id then
      raise exception 'This request was already used for another redemption.';
    end if;
    return receipt;
  end if;
  if account_role = 'parent' and p_child_id is null then raise exception 'Choose a child profile first.'; end if;
  if p_child_id is not null and (account_role <> 'parent' or not exists (
    select 1 from public.child_profiles where id = p_child_id and parent_id = owner_id
  )) then raise exception 'Choose one of your own child profiles.'; end if;
  select * into goal from public.rewards where id = p_reward_id and user_id = owner_id for share;
  if not found then raise exception 'Reward not found. Refresh your rewards.'; end if;
  if cardinality(goal.child_ids) > 0 and not coalesce(p_child_id = any(goal.child_ids), false) then
    raise exception 'This reward is not assigned to this profile.';
  end if;
  if p_expected_cost is distinct from goal.points then raise exception 'The reward cost changed. Refresh your rewards before redeeming.'; end if;
  select coalesce(sum(points), 0) into available from public.point_earnings
    where user_id = owner_id and child_id is not distinct from p_child_id and awarded;
  available := available - (select coalesce(sum(points_spent), 0) from public.reward_redemptions
    where user_id = owner_id and child_id is not distinct from p_child_id);
  if available < goal.points then raise exception 'Not enough points for this reward yet.'; end if;
  insert into public.reward_redemptions(id, user_id, child_id, reward_id, reward_name, points_spent)
    values(p_request_id, owner_id, p_child_id, goal.id, goal.name, goal.points) returning * into receipt;
  return receipt;
end;
$$;

revoke all on function public.record_task_points(), public.approve_task_points(), public.record_routine_points() from public, anon, authenticated;
revoke all on function public.save_routine_with_points(uuid,text,text,smallint[],time,uuid,jsonb,integer),
  public.get_point_balance(uuid), public.redeem_reward(uuid,uuid,uuid,integer) from public, anon;
grant execute on function public.save_routine_with_points(uuid,text,text,smallint[],time,uuid,jsonb,integer),
  public.get_point_balance(uuid), public.redeem_reward(uuid,uuid,uuid,integer) to authenticated;

-- Carry existing completions forward using the currently saved point amounts.
insert into public.point_earnings(user_id, child_id, source_type, source_id, occurrence_date, points, awarded)
select t.user_id, t.child_id, 'task', t.id, c.occurrence_date, t.points,
  not t.requires_photo or (t.approval_status = 'approved' and c.occurrence_date =
    (select max(latest.occurrence_date) from public.task_completions latest where latest.task_id = t.id))
from public.task_completions c join public.tasks t on t.id = c.task_id
on conflict (source_type, source_id, occurrence_date) do nothing;

insert into public.point_earnings(user_id, child_id, source_type, source_id, occurrence_date, points)
select r.user_id, r.child_id, 'routine', r.id, c.occurrence_date, r.points
from public.routines r join public.routine_steps s on s.routine_id = r.id
join public.routine_step_completions c on c.step_id = s.id
group by r.id, c.occurrence_date
having count(*) = (select count(*) from public.routine_steps all_steps where all_steps.routine_id = r.id)
on conflict (source_type, source_id, occurrence_date) do nothing;

do $$
begin
  begin
    alter publication supabase_realtime add table public.point_earnings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.reward_redemptions;
  exception when duplicate_object then null;
  end;
end;
$$;
notify pgrst, 'reload schema';
commit;
