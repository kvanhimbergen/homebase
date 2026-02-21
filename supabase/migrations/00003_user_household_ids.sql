-- Helper function to get household IDs for the current user
create or replace function public.user_household_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;
