-- User profiles table
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  default_household_id uuid references public.households(id) on delete set null,
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Self-only policies
create policy "Users can view own profile"
  on public.user_profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.user_profiles for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
