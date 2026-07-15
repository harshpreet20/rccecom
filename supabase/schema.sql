-- RCC Merch Store — orders table
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) for the
-- project you want orders written to. The store's API uses the service-role
-- key, which bypasses RLS, so no public policies are needed — the anon key is
-- never used to read/write orders.

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_ref         text not null unique,
  amount            integer not null,               -- total in whole rupees
  currency          text not null default 'INR',
  status            text not null default 'awaiting_confirmation',
  items             jsonb not null,                 -- array of ordered line items
  customer_name     text not null,
  customer_phone    text not null,                  -- 10-digit mobile
  customer_email    text,
  customer_address  text not null,
  notes             text,
  upi_txn_ref       text,                           -- UPI reference / UTR entered by customer
  created_at        timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (customer_phone);

-- Allowed status values (kept as a comment for reference; not enforced so RCC
-- can add their own workflow states freely):
--   awaiting_confirmation | confirmed | packed | shipped | delivered | cancelled

-- Enable Row Level Security. With no policies, only the service-role key
-- (used server-side by the store) can access rows — safe by default.
alter table public.orders enable row level security;
