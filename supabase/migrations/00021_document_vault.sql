-- Document Vault: categories, versioning, favorites, member association

-- 1. Create document_categories table (mirrors categories pattern from 00006)
create table public.document_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  parent_id uuid references public.document_categories(id) on delete set null,
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.document_categories enable row level security;

create policy "Users can view household document categories"
  on public.document_categories for select
  using (household_id in (select public.user_household_ids()));

create policy "Users can insert household document categories"
  on public.document_categories for insert
  with check (household_id in (select public.user_household_ids()));

create policy "Users can update household document categories"
  on public.document_categories for update
  using (household_id in (select public.user_household_ids()));

create policy "Users can delete non-system document categories"
  on public.document_categories for delete
  using (household_id in (select public.user_household_ids()) and not is_system);

-- 2. Alter documents table with new columns
alter table public.documents
  add column category_id uuid references public.document_categories(id) on delete set null,
  add column member_id uuid references auth.users(id) on delete set null,
  add column is_favorite boolean not null default false,
  add column version int not null default 1,
  add column version_group_id uuid default gen_random_uuid(),
  add column is_latest_version boolean not null default true,
  add column document_year int,
  add column metadata jsonb not null default '{}',
  add column notes text;

-- 3. Indexes
create index idx_documents_category_id on public.documents(category_id);
create index idx_documents_version_group_id on public.documents(version_group_id);
create index idx_documents_is_favorite on public.documents(household_id, is_favorite) where is_favorite = true;
create index idx_documents_expires_at on public.documents(expires_at) where expires_at is not null;
create index idx_document_categories_household on public.document_categories(household_id);
create index idx_document_categories_parent on public.document_categories(parent_id);

-- 4. RLS policy on user_profiles for household member visibility
create policy "Household members can view each other's profiles"
  on public.user_profiles for select
  using (
    id in (
      select hm.user_id from public.household_members hm
      where hm.household_id in (select public.user_household_ids())
    )
  );
