-- Run after the migrations. Test records are temporary and rolled back.
begin;
insert into auth.users(id, email) values
 ('10000000-0000-4000-8000-000000000001', 'routine-test-parent-a@example.com'),
 ('10000000-0000-4000-8000-000000000002', 'routine-test-parent-b@example.com');
insert into public.adult_profiles(id, role, full_name) values
 ('10000000-0000-4000-8000-000000000001', 'parent', 'Routine test A'),
 ('10000000-0000-4000-8000-000000000002', 'parent', 'Routine test B');
insert into public.child_profiles(id, parent_id, name, age) values
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Test child A', 10),
 ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Test child B', 9);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
declare
  rid uuid;
  copy_id uuid;
begin
  rid := public.save_routine(null, 'Morning', '', array[0,1,2,3,4]::smallint[], '07:00',
    '20000000-0000-4000-8000-000000000001',
    '[{"id":"30000000-0000-4000-8000-000000000001","title":"Get dressed","minutes":5},
      {"id":"30000000-0000-4000-8000-000000000002","title":"Brush teeth","minutes":3}]');
  if (select count(*) from public.routine_steps where routine_id = rid) <> 2 then
    raise exception 'Routine steps were not saved.';
  end if;
  insert into public.routine_step_completions(step_id, occurrence_date)
    values ('30000000-0000-4000-8000-000000000001', '2026-10-19');
  -- Reordering keeps IDs and their completion history.
  perform public.save_routine(rid, 'Morning edited', '', array[0,1,2,3,4]::smallint[], '07:30',
    '20000000-0000-4000-8000-000000000001',
    '[{"id":"30000000-0000-4000-8000-000000000002","title":"Brush teeth","minutes":3},
      {"id":"30000000-0000-4000-8000-000000000001","title":"Get dressed","minutes":5}]');
  if (select position from public.routine_steps where id = '30000000-0000-4000-8000-000000000001') <> 1
    or (select count(*) from public.routine_step_completions) <> 1 then
    raise exception 'Reordering lost the saved order or progress.';
  end if;
  if exists(select 1 from public.routine_step_completions where occurrence_date = '2026-10-20') then
    raise exception 'Completion leaked to another day.';
  end if;
  -- Invalid step rolls back the name update as well.
  begin
    perform public.save_routine(rid, 'Should roll back', '', array[0]::smallint[], '07:00', null,
      '[{"id":"30000000-0000-4000-8000-000000000001","title":"Invalid","minutes":-5}]');
    raise exception 'Negative minutes were accepted.';
  exception when check_violation then null;
  end;
  if (select name from public.routines where id = rid) <> 'Morning edited' then
    raise exception 'Failed save did not roll back.';
  end if;
  begin
    perform public.save_routine(null, 'Bad assignment', '', array[0]::smallint[], '07:00',
      '20000000-0000-4000-8000-000000000002',
      '[{"id":"30000000-0000-4000-8000-000000000004","title":"Step","minutes":1}]');
    raise exception 'Assigned another parent''s child.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.routine_step_completions(step_id, occurrence_date)
      values ('30000000-0000-4000-8000-000000000002', '2026-10-18');
    raise exception 'Completed a step on an unscheduled day.';
  exception when insufficient_privilege then null;
  end;
  copy_id := public.save_routine(null, 'Morning copy', '', array[0]::smallint[], '07:00', null,
    '[{"id":"30000000-0000-4000-8000-000000000003","title":"Get dressed","minutes":5}]');
  if exists(select 1 from public.routine_step_completions where step_id = '30000000-0000-4000-8000-000000000003') then
    raise exception 'Copy inherited completed progress.';
  end if;
end;
$$;

-- Another authenticated adult must not read or change these routines.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists(select 1 from public.routines) or exists(select 1 from public.routine_steps)
     or exists(select 1 from public.routine_step_completions) then
    raise exception 'Other adult can read private routine data.';
  end if;
  begin
    insert into public.routine_step_completions(step_id, occurrence_date)
      values ('30000000-0000-4000-8000-000000000001', '2026-10-20');
    raise exception 'Other adult can complete this routine.';
  exception when insufficient_privilege then null;
  end;
  delete from public.routine_steps where id = '30000000-0000-4000-8000-000000000001';
  if found then raise exception 'Other adult can delete this step.'; end if;
end;
$$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
declare rid uuid;
begin
  select id into rid from public.routines where name = 'Morning edited';
  delete from public.routines where id = rid;
  if exists(select 1 from public.routine_steps where routine_id = rid)
    or exists(select 1 from public.routine_step_completions where step_id = '30000000-0000-4000-8000-000000000001') then
    raise exception 'Deleting the routine left steps or completions behind.';
  end if;
end;
$$;
rollback;
