-- Run after the migrations. All test data is rolled back.
begin;
insert into auth.users(id, email) values
 ('40000000-0000-4000-8000-000000000001', 'points-parent@example.com'),
 ('40000000-0000-4000-8000-000000000002', 'points-other@example.com'),
 ('40000000-0000-4000-8000-000000000003', 'points-independent@example.com');
insert into public.adult_profiles(id, role, full_name) values
 ('40000000-0000-4000-8000-000000000001', 'parent', 'Points parent'),
 ('40000000-0000-4000-8000-000000000002', 'parent', 'Other parent'),
 ('40000000-0000-4000-8000-000000000003', 'independent', 'Points independent');
insert into public.child_profiles(id, parent_id, name, age) values
 ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Child A', 10),
 ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Child B', 9),
 ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'Other child', 9);
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

do $$
declare
  child_a uuid := '41000000-0000-4000-8000-000000000001';
  child_b uuid := '41000000-0000-4000-8000-000000000002';
  task_a uuid;
  task_b uuid;
  photo_task uuid;
  routine_id uuid;
  reward_id uuid;
  receipt public.reward_redemptions;
  request_id uuid := gen_random_uuid();
begin
  insert into public.tasks(title, child_id, date, time, points) values('A', child_a, '2026-11-10', '07:00', 20) returning id into task_a;
  insert into public.tasks(title, child_id, date, time, points) values('B', child_b, '2026-11-10', '07:00', 90) returning id into task_b;
  insert into public.task_completions(task_id, occurrence_date) values(task_a, '2026-11-10'), (task_b, '2026-11-10');
  assert (public.get_point_balance(child_a)->>'balance')::int = 20, 'Child balance mixed with another child';
  assert (public.get_point_balance(null)->>'balance')::int = 0, 'Personal balance mixed with child';
  insert into public.task_completions(task_id, occurrence_date) values(task_a, '2026-11-10') on conflict do nothing;
  delete from public.task_completions where task_id = task_a;
  insert into public.task_completions(task_id, occurrence_date) values(task_a, '2026-11-10');
  assert (public.get_point_balance(child_a)->>'balance')::int = 20, 'Undo/re-complete awarded twice';
  update public.tasks set points = 30 where id = task_a;
  assert (public.get_point_balance(child_a)->>'balance')::int = 20, 'Editing points changed past earnings';
  insert into public.task_completions(task_id, occurrence_date) values(task_a, '2026-11-11');
  assert (public.get_point_balance(child_a)->>'balance')::int = 50, 'Points did not accumulate across days';

  insert into public.tasks(title, child_id, date, time, points, requires_photo) values('Photo', child_a, '2026-11-11', '07:00', 15, true) returning id into photo_task;
  insert into public.task_completions(task_id, occurrence_date) values(photo_task, '2026-11-11');
  update public.tasks set approval_status = 'pending' where id = photo_task;
  assert (public.get_point_balance(child_a)->>'balance')::int = 50, 'Unapproved photo earned points';
  update public.tasks set approval_status = 'changes' where id = photo_task;
  assert (public.get_point_balance(child_a)->>'balance')::int = 50, 'Needs changes earned points';
  update public.tasks set approval_status = 'approved' where id = photo_task;
  update public.tasks set approval_status = 'approved' where id = photo_task;
  assert (public.get_point_balance(child_a)->>'balance')::int = 65, 'Approval did not award exactly once';
  insert into public.task_completions(task_id, occurrence_date) values(photo_task, '2026-11-12');
  assert (public.get_point_balance(child_a)->>'balance')::int = 65, 'Old approval applied to another day';
  update public.tasks set approval_status = 'pending' where id = photo_task;
  update public.tasks set approval_status = 'approved' where id = photo_task;
  assert (public.get_point_balance(child_a)->>'balance')::int = 80, 'Next photo occurrence not awarded';

  routine_id := public.save_routine_with_points(null, 'Routine', '', array[0,1,2,3,4,5,6]::smallint[], '07:00', child_a,
    '[{"id":"42000000-0000-4000-8000-000000000001","title":"One","minutes":2},
      {"id":"42000000-0000-4000-8000-000000000002","title":"Two","minutes":3}]', 25);
  assert (select points from public.routines where id = routine_id) = 25, 'Routine point price not saved';
  insert into public.routine_step_completions(step_id, occurrence_date) values('42000000-0000-4000-8000-000000000001', '2026-11-11');
  assert (public.get_point_balance(child_a)->>'balance')::int = 80, 'Partial routine earned points';
  insert into public.routine_step_completions(step_id, occurrence_date) values('42000000-0000-4000-8000-000000000002', '2026-11-11');
  delete from public.routine_step_completions where step_id = '42000000-0000-4000-8000-000000000002';
  insert into public.routine_step_completions(step_id, occurrence_date) values('42000000-0000-4000-8000-000000000002', '2026-11-11');
  assert (public.get_point_balance(child_a)->>'balance')::int = 105, 'Routine earned more than its configured award';
  begin
    perform public.save_routine_with_points(routine_id, 'Invalid edit', '', array[0]::smallint[], '07:00', child_a,
      '[{"id":"42000000-0000-4000-8000-000000000001","title":"One","minutes":2}]', -1);
    raise exception 'Invalid routine points accepted';
  exception when raise_exception then
    if sqlerrm <> 'Points must be a whole number from 0 to 1000.' then raise; end if;
  end;
  assert (select name from public.routines where id = routine_id) = 'Routine', 'Failed save changed routine';

  insert into public.rewards(name, points, child_id, child_ids) values('Movie', 60, child_a, array[child_a]) returning id into reward_id;
  receipt := public.redeem_reward(reward_id, child_a, request_id, 60);
  assert receipt.points_spent = 60 and receipt.reward_name = 'Movie', 'Wrong price saved';
  perform public.redeem_reward(reward_id, child_a, request_id, 60);
  assert (public.get_point_balance(child_a)->>'balance')::int = 45, 'Retry deducted points twice';
  assert (public.get_point_balance(child_a)->>'earned')::int = 105, 'Spending changed total earned';
  assert (public.get_point_balance(child_b)->>'balance')::int = 90, 'Spent another child balance';
  begin
    perform public.redeem_reward(reward_id, child_a, gen_random_uuid(), 60);
    raise exception 'Overspent balance';
  exception when raise_exception then
    if sqlerrm <> 'Not enough points for this reward yet.' then raise; end if;
  end;
  begin
    perform public.redeem_reward(reward_id, child_b, gen_random_uuid(), 60);
    raise exception 'Redeemed an unassigned reward';
  exception when raise_exception then
    if sqlerrm <> 'This reward is not assigned to this profile.' then raise; end if;
  end;
  begin
    perform public.redeem_reward(reward_id, '41000000-0000-4000-8000-000000000003', gen_random_uuid(), 60);
    raise exception 'Redeemed for another family';
  exception when raise_exception then
    if sqlerrm <> 'Choose one of your own child profiles.' then raise; end if;
  end;
  update public.rewards set points = 40, name = 'Edited movie' where id = reward_id;
  begin
    perform public.redeem_reward(reward_id, child_a, gen_random_uuid(), 60);
    raise exception 'Stale displayed price was accepted';
  exception when raise_exception then
    if sqlerrm <> 'The reward cost changed. Refresh your rewards before redeeming.' then raise; end if;
  end;
  assert (select points_spent from public.reward_redemptions where id = request_id) = 60, 'Editing changed historic cost';
  delete from public.rewards where id = reward_id;
  delete from public.tasks where id = task_a;
  delete from public.routines where id = routine_id;
  assert (public.get_point_balance(child_a)->>'balance')::int = 45, 'Deletion erased earned points or spending';
  assert (select reward_name from public.reward_redemptions where id = request_id) = 'Movie', 'Deletion erased receipt';
  begin
    insert into public.point_earnings(user_id, source_type, source_id, occurrence_date, points)
      values(auth.uid(), 'task', gen_random_uuid(), current_date, 999);
    raise exception 'Client could mint points';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reward_redemptions(id, user_id, reward_name, points_spent) values(gen_random_uuid(), auth.uid(), 'Fake', 1);
    raise exception 'Client could forge a receipt';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
do $$
begin
  assert not exists(select 1 from public.point_earnings), 'Another family can see earnings';
  assert not exists(select 1 from public.reward_redemptions), 'Another family can see receipts';
end;
$$;

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
do $$
declare t uuid; r uuid;
begin
  insert into public.tasks(title, date, time, points) values('Personal', current_date, '07:00', 25) returning id into t;
  insert into public.task_completions(task_id, occurrence_date) values(t, current_date);
  insert into public.rewards(name, points) values('Personal reward', 25) returning id into r;
  perform public.redeem_reward(r, null, gen_random_uuid(), 25);
  assert (public.get_point_balance(null)->>'balance')::int = 0, 'Exact balance or independent redemption failed';
end;
$$;
rollback;
