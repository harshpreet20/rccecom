import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client bound to a signed-in user's access token, so every
 * query runs as that authenticated user and RLS (public.is_commerce_staff)
 * decides what they can see. This is how the CRM reads/writes orders and
 * products securely without a service-role key — only approved admin/sales
 * sessions get through.
 */
export function authedClient(token: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Pull the Bearer token from an incoming request. */
export function getBearer(request: Request): string | null {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}
