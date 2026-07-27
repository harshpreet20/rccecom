import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for the assistant, using the service-role key
 * so it can write to `assistant_conversations` -- a table with RLS enabled
 * and NO anon/authenticated policies (see
 * supabase/migrations/20260727120000_assistant_conversations.sql). The
 * public anon client from src/lib/supabase.ts intentionally cannot write
 * here, mirroring how discounts/orders keep writes behind an RPC or
 * server-validated insert rather than a freely-writable anon table.
 *
 * Never import this from a client component -- SUPABASE_SERVICE_ROLE_KEY
 * must stay server-only.
 */
let cached: SupabaseClient | null | undefined;

export function getAssistantSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
