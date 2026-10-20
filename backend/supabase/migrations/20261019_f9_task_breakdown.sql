-- F9 Task Breakdown: save ordered steps for an existing task.
-- Run after the existing accounts and tasks migrations.

begin;

create table public.task_steps (
  id uuid primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  position integer not null check (position between 0 and 49),
  completed boolean not null default false,
  unique (task_id, position) deferrable initially deferred
);

create index task_steps_task_idx on public.task_steps(task_id);

alter table public.task_steps enable row level security;

revoke all on public.task_steps from anon, authenticated;
grant select, insert, update, delete on public.task_steps to authenticated;

create policy "Manage own task steps"
on public.task_steps
for all
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = (select auth.uid())
  )
);

-- Save the entire step list atomically.
create function public.save_task_steps(
  p_task_id uuid,
  p_steps jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_task_id uuid;
  item jsonb;
  step_ids uuid[] := '{}';
  step_id uuid;
  step_position integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Log in to save task steps.';
  end if;

  select id into saved_task_id
  from public.tasks
  where id = p_task_id
    and user_id = (select auth.uid())
  for update;

  if saved_task_id is null then
    raise exception 'Task not found or you do not have permission to edit it.';
  end if;

  if jsonb_typeof(p_steps) is distinct from 'array' then
    raise exception 'Task steps must be a list.';
  end if;

  if jsonb_array_length(p_steps) > 50 then
    raise exception 'Use no more than 50 steps.';
  end if;

  for item in select value from jsonb_array_elements(p_steps) loop
    step_id := (item->>'id')::uuid;

    if step_id is null or step_id = any(step_ids) then
      raise exception 'Each step needs a unique ID.';
    end if;

    if length(trim(item->>'title')) not between 1 and 100 then
      raise exception 'Each step must have a title of 1 to 100 characters.';
    end if;

    step_ids := array_append(step_ids, step_id);

    insert into public.task_steps(id, task_id, title, position, completed)
    values (
      step_id,
      saved_task_id,
      trim(item->>'title'),
      step_position,
      coalesce((item->>'completed')::boolean, false)
    )
    on conflict (id) do update
      set title = excluded.title,
          position = excluded.position,
          completed = excluded.completed
      where task_steps.task_id = saved_task_id;

    if not found then
      raise exception 'A step belongs to a different task.';
    end if;

    step_position := step_position + 1;
  end loop;

  delete from public.task_steps
  where task_id = saved_task_id
    and not (id = any(step_ids));

  return saved_task_id;
end;
$$;

revoke all on function public.save_task_steps(uuid, jsonb) from public, anon;
grant execute on function public.save_task_steps(uuid, jsonb) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.task_steps;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

commit;
