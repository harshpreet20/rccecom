-- Assistant conversations: transcripts for the customer-facing AI shopping /
-- order-support chat widget (src/components/AssistantWidget.tsx).
--
-- Stores the full message transcript, which specialists were routed to, and
-- the session outcome, so the team can review and improve the assistant.
--
-- Security posture mirrors discounts/orders in supabase/schema.sql: RLS is
-- enabled with NO policies for anon/authenticated, so the public anon key
-- can neither read nor write this table at all (RLS with zero policies
-- denies by default). All access goes through the assistant chat API route
-- (src/app/api/assistant/chat/route.ts) using the Supabase service-role key
-- (see src/lib/assistant/supabase-admin.ts) -- there is no anon-writable
-- table for arbitrary JSON here, matching the validate_discount_code() /
-- lookup_order() RPC precedent of never exposing raw table access.

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  -- Phone / email / order ref the customer volunteered, if any (read-only
  -- identification -- see src/lib/assistant/order-lookup.ts). Never a new
  -- auth scheme; just a label for the transcript.
  customer_identifier text,
  -- Full transcript: [{ role: "user" | "assistant", content: string, timestamp: string }, ...]
  messages jsonb not null default '[]'::jsonb,
  -- Which specialist handled each turn, for later analysis:
  -- [{ route: "product_discovery" | "order_support" | "general_policy" | "escalate" | "wrap_up", timestamp: string }, ...]
  route_history jsonb not null default '[]'::jsonb,
  outcome text not null default 'in_progress'
    check (outcome in ('resolved', 'escalated', 'abandoned', 'in_progress')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per session_id -- the API route upserts on every turn.
create unique index if not exists assistant_conversations_session_id_key
  on public.assistant_conversations (session_id);

create index if not exists assistant_conversations_created_at_idx
  on public.assistant_conversations (created_at desc);

alter table public.assistant_conversations enable row level security;

-- Intentionally no policies: with RLS enabled and zero policies, PostgREST
-- (and therefore the anon/publishable key) can neither select nor insert
-- nor update this table. Only the service-role key -- which bypasses RLS
-- entirely -- can write, and only from the server.

comment on table public.assistant_conversations is
  'Transcripts for the customer-facing AI shopping/support widget. Server-write-only via service role; no anon RLS policies.';
