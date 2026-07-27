import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Server-only client that bypasses RLS. RLS on app_users (and other
 * staff-managed tables) is keyed off auth.uid(), which is never present on
 * these server routes -- so anon-key inserts/updates on behalf of a user
 * (self-registration, admin approving/editing other users) are rejected by
 * RLS ("new row violates row-level security policy"). Falls back to the
 * anon client if the service key isn't configured yet.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return createServerClient();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function saveReport(agentName: string, result: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({ agent_name: agentName, result })
    .select("id")
    .single();
  if (error) {
    console.error("Failed to save report:", error.message);
    return null;
  }
  return data?.id || null;
}
