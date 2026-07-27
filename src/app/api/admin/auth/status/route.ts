import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/admin/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: verified, error: verifyError } = await anon.auth.getUser(token);
  if (verifyError || !verified?.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const authUserId = verified.user.id;
  const email = verified.user.email;
  if (!email) {
    return NextResponse.json({ error: "Account has no email" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: byAuthId } = await supabase
      .from("app_users")
      .select("*")
      .eq("auth_user_id", authUserId)
      .single();

    if (byAuthId) {
      return NextResponse.json({
        role: byAuthId.role,
        status: byAuthId.status,
        userId: byAuthId.id,
      });
    }

    // Match by email for migrated users whose auth_user_id changed. Both
    // authUserId and email come from the verified session above, never from
    // the request body, so this can't be used to rebind an arbitrary row.
    const { data: byEmail } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", email)
      .single();

    if (byEmail) {
      await supabase
        .from("app_users")
        .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
        .eq("id", byEmail.id);

      return NextResponse.json({
        role: byEmail.role,
        status: byEmail.status,
        userId: byEmail.id,
      });
    }

    const { data: newUser, error } = await supabase
      .from("app_users")
      .insert({
        auth_user_id: authUserId,
        email,
        role: "user",
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      role: newUser.role,
      status: newUser.status,
      userId: newUser.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
