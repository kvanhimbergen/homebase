-- Accounts table
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete set null,
  plaid_account_id text unique,
  name text not null,
  official_name text,
  type text not null,
  subtype text,
  mask text,
  balance_current numeric,
  balance_available numeric,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Users can view household accounts"
  on public.accounts for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household accounts"
  on public.accounts for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household accounts"
  on public.accounts for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete household accounts"
  on public.accounts for delete
  using (household_id in (select public.user_household_ids()));
