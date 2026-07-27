import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { authUserId, email } = body;
  if (!authUserId || !email) {
    return NextResponse.json({ error: "authUserId and email are required" }, { status: 400 });
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

    // Match by email for migrated users whose auth_user_id changed
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
