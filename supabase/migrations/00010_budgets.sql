-- Budgets table
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric not null,
  period text not null check (period in ('monthly', 'weekly', 'yearly')) default 'monthly',
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_id, period)
);

alter table public.budgets enable row level security;

create policy "Users can view household budgets"
  on public.budgets for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household budgets"
  on public.budgets for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household budgets"
  on public.budgets for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete household budgets"
  on public.budgets for delete
  using (household_id in (select public.user_household_ids()));
