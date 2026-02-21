-- Fix: owners need to see their households even before they're in household_members.
-- The original policy only used user_household_ids() which queries household_members,
-- creating a chicken-and-egg problem during household creation.

drop policy "Users can view their households" on public.households;

create policy "Users can view their households"
  on public.households for select
  using (
    owner_id = auth.uid()
    or id in (select public.user_household_ids())
  );
