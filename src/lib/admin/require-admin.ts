import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/admin/supabase-server";

export type AdminRole = "admin" | "sales" | "content" | "user";

interface RequireAdminOk {
  ok: true;
  user: { id: string; email?: string };
  role: string;
}

interface RequireAdminErr {
  ok: false;
  response: NextResponse;
}

/**
 * Shared gate for admin/CRM API routes. Verifies the request's bearer token
 * against Supabase auth (anon client, so it can't be spoofed), then looks up
 * the caller's app_users row via the service-role client and requires
 * status "approved" plus a role in `allowedRoles`.
 *
 * Returns 401 if there's no valid session, 403 if the session is valid but
 * the caller isn't authorized for this route. Callers should do:
 *
 *   const auth = await requireAdmin(request, ["admin", "content"]);
 *   if (!auth.ok) return auth.response;
 */
export async function requireAdmin(
  request: Request,
  allowedRoles: AdminRole[] = ["admin"]
): Promise<RequireAdminOk | RequireAdminErr> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: verified, error: verifyError } = await anon.auth.getUser(token);
  if (verifyError || !verified?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("app_users")
    .select("role, status")
    .eq("auth_user_id", verified.user.id)
    .single();

  if (!caller || caller.status !== "approved" || !allowedRoles.includes(caller.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, user: { id: verified.user.id, email: verified.user.email ?? undefined }, role: caller.role };
}
