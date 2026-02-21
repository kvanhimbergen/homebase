-- Household RLS policies
create policy "Users can view their households"
  on public.households for select
  using (id in (select public.user_household_ids()));

create policy "Users can create households"
  on public.households for insert
  with check (owner_id = auth.uid());

create policy "Owners can update households"
  on public.households for update
  using (owner_id = auth.uid());

-- Household members RLS policies
create policy "Users can view members of their households"
  on public.household_members for select
  using (household_id in (select public.user_household_ids()));

create policy "Admins can add members"
  on public.household_members for insert
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
    or user_id = auth.uid()
  );

create policy "Admins can update members"
  on public.household_members for update
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can remove members"
  on public.household_members for delete
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
    or user_id = auth.uid()
  );

-- Invitations RLS policies
create policy "Users can view household invitations"
  on public.invitations for select
  using (household_id in (select public.user_household_ids()));

create policy "Admins can create invitations"
  on public.invitations for insert
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can update invitations"
  on public.invitations for update
  using (household_id in (select public.user_household_ids()));
