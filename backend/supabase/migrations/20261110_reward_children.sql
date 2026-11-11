-- Allow one reward to be shared with any subset of the family's children.
-- An empty child_ids array means the reward is available to everyone.
-- Run after 20261109_rewards.sql.
begin;

alter table public.rewards
  add column if not exists child_ids uuid[] not null default '{}';

-- Keep rewards created before this migration working.
update public.rewards
set child_ids = array[child_id]
where child_id is not null
  and cardinality(child_ids) = 0;

alter table public.rewards
  drop constraint if exists rewards_child_ids_limit;
alter table public.rewards
  add constraint rewards_child_ids_limit check (cardinality(child_ids) <= 50);

create index if not exists rewards_child_ids_idx
  on public.rewards using gin (child_ids);

-- Re-check every selected child belongs to the signed-in parent.
drop policy if exists "Create own rewards" on public.rewards;
create policy "Create own rewards" on public.rewards for insert to authenticated with check (
  user_id = (select auth.uid())
  and (child_id is null or child_id = any(child_ids))
  and (
    cardinality(child_ids) = 0 or not exists (
      select 1 from unnest(child_ids) as target(id)
      where not exists (
        select 1 from public.child_profiles c
        join public.adult_profiles a on a.id = c.parent_id
        where c.id = target.id
          and c.parent_id = (select auth.uid())
          and a.role = 'parent'
      )
    )
  )
);

drop policy if exists "Update own rewards" on public.rewards;
create policy "Update own rewards" on public.rewards for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and (child_id is null or child_id = any(child_ids))
    and (
      cardinality(child_ids) = 0 or not exists (
        select 1 from unnest(child_ids) as target(id)
        where not exists (
          select 1 from public.child_profiles c
          join public.adult_profiles a on a.id = c.parent_id
          where c.id = target.id
            and c.parent_id = (select auth.uid())
            and a.role = 'parent'
        )
      )
    )
  );

commit;
