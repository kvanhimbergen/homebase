-- Receipt scans table
create table public.receipt_scans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  extracted_data jsonb not null default '{}',
  line_items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.receipt_scans enable row level security;

create policy "Users can view household receipt scans"
  on public.receipt_scans for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household receipt scans"
  on public.receipt_scans for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household receipt scans"
  on public.receipt_scans for update
  using (household_id in (select public.user_household_ids()));

-- Documents table
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  storage_path text not null,
  file_type text not null,
  file_size bigint,
  tags text[] not null default '{}',
  expires_at timestamptz,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Users can view household documents"
  on public.documents for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household documents"
  on public.documents for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household documents"
  on public.documents for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete household documents"
  on public.documents for delete
  using (household_id in (select public.user_household_ids()));

-- Email rules table
create table public.email_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sender_pattern text not null,
  subject_pattern text,
  action text not null check (action in ('create_transaction', 'attach_receipt', 'ignore')),
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.email_rules enable row level security;

create policy "Users can view household email rules"
  on public.email_rules for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household email rules"
  on public.email_rules for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household email rules"
  on public.email_rules for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete household email rules"
  on public.email_rules for delete
  using (household_id in (select public.user_household_ids()));
