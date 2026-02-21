-- Categories table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  parent_id uuid references public.categories(id) on delete set null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can view household categories"
  on public.categories for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household categories"
  on public.categories for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household categories"
  on public.categories for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete non-system categories"
  on public.categories for delete
  using (household_id in (select public.user_household_ids()) and not is_system);
