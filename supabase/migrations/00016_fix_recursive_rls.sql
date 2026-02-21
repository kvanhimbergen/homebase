-- Fix recursive RLS policies on household_members.
-- Policies that query household_members from within household_members
-- cause infinite recursion. Use security definer functions instead.

-- Helper: check if current user is admin/owner of a given household
create or replace function public.is_household_admin(p_household_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Drop all existing household_members policies
drop policy if exists "Users can add themselves as members" on public.household_members;
drop policy if exists "Admins can add other members" on public.household_members;
drop policy if exists "Admins can update members" on public.household_members;
drop policy if exists "Admins can remove members" on public.household_members;

-- Recreate without recursion
create policy "Members can insert themselves"
  on public.household_members for insert
  with check (
    user_id = auth.uid()
    or public.is_household_admin(household_id)
  );

create policy "Admins can update members"
  on public.household_members for update
  using (public.is_household_admin(household_id));

create policy "Admins or self can delete members"
  on public.household_members for delete
  using (
    user_id = auth.uid()
    or public.is_household_admin(household_id)
  );

-- Also fix invitations insert policy (same recursion issue)
drop policy if exists "Admins can create invitations" on public.invitations;

create policy "Admins can create invitations"
  on public.invitations for insert
  with check (public.is_household_admin(household_id));
