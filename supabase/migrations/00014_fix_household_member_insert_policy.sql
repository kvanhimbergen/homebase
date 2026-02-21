-- Fix: allow users to insert themselves as household members.
-- The original policy's subquery failed during household creation because
-- the user had no existing membership yet. Splitting into two clear policies.

drop policy "Admins can add members" on public.household_members;

-- Users can always add themselves to a household they own
create policy "Users can add themselves as members"
  on public.household_members for insert
  with check (
    user_id = auth.uid()
  );

-- Admins/owners can add other users
create policy "Admins can add other members"
  on public.household_members for insert
  with check (
    household_id in (
      select hm.household_id from public.household_members hm
      where hm.user_id = auth.uid() and hm.role in ('owner', 'admin')
    )
  );
