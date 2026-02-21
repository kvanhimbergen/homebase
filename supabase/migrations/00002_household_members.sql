-- Household members table
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

alter table public.household_members enable row level security;
