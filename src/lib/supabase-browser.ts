import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client for customer auth (login/signup/session).
 * Uses the public anon key — same project as `src/lib/supabase.ts`, but that
 * client disables session persistence (it's for server-side product/order
 * reads). Customer auth needs a real, persisted browser session, so it gets
 * its own client instance.
 */
let cached: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cached;
}
