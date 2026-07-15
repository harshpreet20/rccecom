import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for the shared RCC platform database.
 *
 * Uses the public anon key (same NEXT_PUBLIC_SUPABASE_* convention as the RCC
 * CRM / content-agent app). The store only ever does two DB actions, both
 * allowed to anon by Row Level Security:
 *   1. INSERT a new order  (policy: "anyone can place an order")
 *   2. CALL lookup_order() (SECURITY DEFINER RPC — needs order ref + phone)
 * Reading the orders table directly is not permitted with this key, so
 * customer data can't be enumerated from the browser key.
 *
 * Returns null when Supabase isn't configured, so the store still works with
 * the WhatsApp handoff as the sole record of the order.
 */
let cached: SupabaseClient | null | undefined;

function envUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}
function envKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = envUrl();
  const key = envKey();
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const isSupabaseConfigured = () => Boolean(envUrl() && envKey());
