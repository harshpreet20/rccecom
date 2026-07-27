import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key. Needed for the
 * account API routes: the anon key can't SELECT `orders` or `customer_profiles`
 * directly (see supabase/schema.sql, supabase/customer_accounts.sql), so
 * reading a customer's own data server-side (after verifying their auth
 * token) goes through this client instead. Never import this from anything
 * that runs in the browser.
 */
let cached: SupabaseClient | null | undefined;

export function getServiceSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
