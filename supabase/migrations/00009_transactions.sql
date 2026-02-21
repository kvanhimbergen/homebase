-- Transactions table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  plaid_transaction_id text unique,
  amount numeric not null,
  date date not null,
  name text not null,
  merchant_name text,
  notes text,
  source text not null check (source in ('plaid', 'manual', 'csv', 'ofx', 'email', 'receipt')),
  ai_category_confidence numeric,
  is_split boolean not null default false,
  parent_transaction_id uuid references public.transactions(id) on delete cascade,
  import_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_household_date on public.transactions (household_id, date desc);
create index idx_transactions_category on public.transactions (category_id);
create index idx_transactions_account on public.transactions (account_id);

alter table public.transactions enable row level security;

create policy "Users can view household transactions"
  on public.transactions for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household transactions"
  on public.transactions for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household transactions"
  on public.transactions for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete household transactions"
  on public.transactions for delete
  using (household_id in (select public.user_household_ids()));
