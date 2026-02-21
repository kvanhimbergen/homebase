-- Invitations table
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid(),
  status text not null check (status in ('pending', 'accepted', 'expired')) default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (token)
);

alter table public.invitations enable row level security;
