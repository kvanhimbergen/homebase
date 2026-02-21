-- Plaid items table
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  plaid_item_id text not null unique,
  plaid_access_token text not null,
  institution_name text,
  cursor text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plaid_items enable row level security;

-- Restricted to owner/admin only
create policy "Admins can view plaid items"
  on public.plaid_items for select
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can insert plaid items"
  on public.plaid_items for insert
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can update plaid items"
  on public.plaid_items for update
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can delete plaid items"
  on public.plaid_items for delete
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
