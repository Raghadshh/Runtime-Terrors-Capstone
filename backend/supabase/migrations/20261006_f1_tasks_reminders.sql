-- F1 Tasks & Reminders (R5-R10).
-- Run in the Supabase SQL Editor after 20261002_accounts_profiles.sql.
-- Column names match the Task type in frontend/src/shared/lib/types.ts.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.adult_profiles (id) on delete cascade,
  child_id uuid references public.child_profiles (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 500),
  category text not null default 'General' check (length(category) <= 40),
  date date not null,
  time time not null,
  duration_minutes integer not null default 10 check (duration_minutes between 1 and 600),
  repeat_kind text not null default 'none'
    check (repeat_kind in ('none', 'daily', 'weekdays', 'weekly', 'custom')),
  -- 0 = Monday ... 6 = Sunday (same as formatting helpers in the app)
  repeat_days smallint[] not null default '{}'
    check (repeat_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  reminder_enabled boolean not null default true,
  reminder_offset integer not null default 0 check (reminder_offset between 0 and 1440),
  points integer not null default 0 check (points between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_repeat_days_needed check (
    repeat_kind not in ('weekly', 'custom') or cardinality(repeat_days) > 0
  )
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_child_id_idx on public.tasks (child_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at before update on public.tasks
  for each row execute function public.touch_updated_at();

-- One row each time a task is finished on a given day (R9).
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  completed_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  unique (task_id, occurrence_date)
);

create index if not exists task_completions_task_id_idx on public.task_completions (task_id);

-- Security (NF5): adults only reach their own tasks, and can only assign tasks to their own children.
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

revoke all on public.tasks from anon, authenticated;
revoke all on public.task_completions from anon, authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, delete on public.task_completions to authenticated;

create policy "Read own tasks" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own tasks" on public.tasks
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (child_id is null or exists (
      select 1 from public.child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())))
  );
create policy "Update own tasks" on public.tasks
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (child_id is null or exists (
      select 1 from public.child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())))
  );
create policy "Delete own tasks" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Read completions of own tasks" on public.task_completions
  for select to authenticated using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())));
create policy "Complete own tasks" on public.task_completions
  for insert to authenticated with check (
    (select auth.uid()) = completed_by
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())));
create policy "Undo completions of own tasks" on public.task_completions
  for delete to authenticated using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())));

-- Live updates so edits show up right away on other signed-in devices.
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end;
$$;