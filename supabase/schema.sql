-- RCC Store — orders/products live in the SHARED RCC platform database
-- (Supabase project qpzfnpoijxfvpbzpfogl), provisioned via the platform
-- migrations `rcc_commerce_core` + `seed_flagship_products`.
--
-- The store connects with the PUBLIC anon key and Row Level Security limits it
-- to exactly two actions: create an order, and look one up via the RPC below.
-- This file documents that schema for reference.

-- Products (catalogue source of truth; managed from the RCC CRM).
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  blurb text,
  description text,
  price integer not null,
  category text,
  sizes jsonb not null default '[]',
  personalization jsonb not null default '[]',
  highlights jsonb not null default '[]',
  accent text default '#0e5a62',
  emoji text default '🎾',
  image text,
  stock integer,
  badge text,
  sold_out boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders (written by the store checkout; managed from the RCC CRM).
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text unique not null,
  amount integer not null,
  subtotal integer not null default 0,
  tax_amount integer not null default 0,
  tax_rate_pct integer not null default 0,
  shipping_amount integer not null default 0,
  currency text not null default 'INR',
  status text not null default 'awaiting_confirmation',
  items jsonb not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text not null,
  notes text,
  upi_txn_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: public can read active products and create orders; the orders table
-- itself is not readable with the anon key.
alter table public.products enable row level security;
alter table public.orders enable row level security;

create policy "public can read active products"
  on public.products for select using (active = true);

create policy "anyone can place an order"
  on public.orders for insert with check (true);

-- Customer order tracking (order ref + phone must both match).
create or replace function public.lookup_order(p_ref text, p_phone text)
returns table (order_ref text, status text, amount integer, created_at timestamptz, items jsonb)
language sql security definer set search_path = public as $$
  select o.order_ref, o.status, o.amount, o.created_at, o.items
  from public.orders o
  where upper(o.order_ref) = upper(p_ref)
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10)
        = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
  limit 1;
$$;
grant execute on function public.lookup_order(text, text) to anon, authenticated;

-- Assistant conversations (AI shopping/support widget) -- store-specific,
-- applied via supabase/migrations/20260727120000_assistant_conversations.sql
-- rather than the shared platform migrations above. RLS is enabled with no
-- anon/authenticated policies at all, so this table is server-write-only
-- (service-role key) -- see src/lib/assistant/supabase-admin.ts.
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  customer_identifier text,
  messages jsonb not null default '[]',
  route_history jsonb not null default '[]',
  outcome text not null default 'in_progress'
    check (outcome in ('resolved', 'escalated', 'abandoned', 'in_progress')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assistant_conversations enable row level security;
-- (no policies -- anon/authenticated get zero access; service role bypasses RLS)
