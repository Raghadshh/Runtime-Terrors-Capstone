-- F2 Routine Builder: R13, R14, R15 and R18.
-- Run after the existing accounts and tasks migrations in the Supabase SQL Editor.
begin;

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.adult_profiles(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  subtitle text not null default '' check (length(subtitle) <= 200),
  days smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]::smallint[]),
  time time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_user_idx on public.routines(user_id);
create index routines_child_idx on public.routines(child_id);
create trigger routines_updated before update on public.routines
  for each row execute function public.touch_updated_at();

create table public.routine_steps (
  id uuid primary key,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  minutes integer not null check (minutes between 1 and 600),
  position integer not null check (position between 0 and 49),
  unique (routine_id, position) deferrable initially deferred
);
create table public.routine_step_completions (
  step_id uuid not null references public.routine_steps(id) on delete cascade,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  primary key (step_id, occurrence_date)
);
alter table public.routines enable row level security;
alter table public.routine_steps enable row level security;
alter table public.routine_step_completions enable row level security;
revoke all on public.routines, public.routine_steps, public.routine_step_completions from anon, authenticated;
grant select, insert, update, delete on public.routines, public.routine_steps to authenticated;
grant select, insert, delete on public.routine_step_completions to authenticated;

create policy "Read own routines" on public.routines for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Create own routines" on public.routines for insert to authenticated with check (
  user_id = (select auth.uid()) and (child_id is null or exists (
    select 1 from public.child_profiles c join public.adult_profiles a on a.id = c.parent_id
      where c.id = child_id and c.parent_id = (select auth.uid()) and a.role = 'parent'
  ))
);
create policy "Update own routines" on public.routines for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid()) and (child_id is null or exists (
      select 1 from public.child_profiles c join public.adult_profiles a on a.id = c.parent_id
      where c.id = child_id and c.parent_id = (select auth.uid()) and a.role = 'parent'
    ))
  );
create policy "Delete own routines" on public.routines for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "Manage own routine steps" on public.routine_steps for all to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "Read own routine completions" on public.routine_step_completions for select to authenticated
  using (exists (select 1 from public.routine_steps s join public.routines r on r.id = s.routine_id
    where s.id = step_id and r.user_id = (select auth.uid())));
create policy "Complete own routine steps" on public.routine_step_completions for insert to authenticated
  with check (exists (select 1 from public.routine_steps s join public.routines r on r.id = s.routine_id
    where s.id = step_id and r.user_id = (select auth.uid())
      and ((extract(isodow from occurrence_date)::integer - 1)::smallint = any(r.days))));
create policy "Undo own routine steps" on public.routine_step_completions for delete to authenticated
  using (exists (select 1 from public.routine_steps s join public.routines r on r.id = s.routine_id
    where s.id = step_id and r.user_id = (select auth.uid())));

-- Save the routine and its ordered steps together. A failed step rolls back the whole save.
-- Existing step IDs are kept so reordering does not erase completion history.
create function public.save_routine(
  p_id uuid, p_name text, p_subtitle text, p_days smallint[], p_time time,
  p_child_id uuid, p_steps jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  saved_id uuid;
  item jsonb;
  step_ids uuid[] := '{}';
  step_id uuid;
  step_position integer := 0;
begin
  if auth.uid() is null then raise exception 'Log in to save routines.'; end if;
  if jsonb_typeof(p_steps) is distinct from 'array' then raise exception 'Add routine steps.'; end if;
  if jsonb_array_length(p_steps) not between 1 and 50 then raise exception 'Use 1 to 50 steps.'; end if;
  if p_id is null then
    insert into public.routines(name, subtitle, days, time, child_id)
      values(trim(p_name), trim(p_subtitle), p_days, p_time, p_child_id) returning id into saved_id;
  else
    update public.routines set name = trim(p_name), subtitle = trim(p_subtitle),
      days = p_days, time = p_time, child_id = p_child_id where id = p_id returning id into saved_id;
    if saved_id is null then raise exception 'Routine not found.'; end if;
  end if;
  for item in select value from jsonb_array_elements(p_steps) loop
    step_id := (item->>'id')::uuid;
    if step_id is null or step_id = any(step_ids) then raise exception 'Each step needs its own ID.'; end if;
    step_ids := array_append(step_ids, step_id);
    insert into public.routine_steps(id, routine_id, title, minutes, position)
      values(step_id, saved_id, trim(item->>'title'), (item->>'minutes')::integer, step_position)
      on conflict(id) do update set title = excluded.title, minutes = excluded.minutes, position = excluded.position
        where routine_steps.routine_id = saved_id;
    if not found then raise exception 'This step belongs to a different routine.'; end if;
    step_position := step_position + 1;
  end loop;
  delete from public.routine_steps where routine_id = saved_id and not (id = any(step_ids));
  return saved_id;
end;
$$;
revoke all on function public.save_routine(uuid,text,text,smallint[],time,uuid,jsonb) from public, anon;
grant execute on function public.save_routine(uuid,text,text,smallint[],time,uuid,jsonb) to authenticated;

-- Refresh the routine screens when another signed-in device saves a change.
do $$
begin
  alter publication supabase_realtime add table public.routines;
  alter publication supabase_realtime add table public.routine_steps;
  alter publication supabase_realtime add table public.routine_step_completions;
end;
$$;
commit;
