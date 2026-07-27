-- Customer accounts — public storefront login/signup + order history.
--
-- Adds a `customer_profiles` table keyed to Supabase Auth users. The store's
-- anon key already can't read `public.orders` directly (see schema.sql), so
-- order history for a logged-in customer is served server-side via
-- `src/app/api/account/orders/route.ts` using the service role key, after
-- verifying the caller's session token and looking up *their own*
-- customer_profiles row for the phone/email to match against.

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

-- A customer may only read/update their own profile row. No anon access,
-- no cross-customer access — auth.uid() must match the row's id.
create policy "customers can view their own profile"
  on public.customer_profiles for select
  using (auth.uid() = id);

create policy "customers can update their own profile"
  on public.customer_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "customers can create their own profile"
  on public.customer_profiles for insert
  with check (auth.uid() = id);

-- Keep updated_at current on every row update.
create or replace function public.set_customer_profiles_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_customer_profiles_updated_at();
