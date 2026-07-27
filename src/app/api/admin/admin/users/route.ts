import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/admin/supabase-server";

export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return null;

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: verified } = await anon.auth.getUser(token);
  if (!verified?.user) return null;

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("app_users")
    .select("role, status")
    .eq("auth_user_id", verified.user.id)
    .single();

  if (!caller || caller.role !== "admin" || caller.status !== "approved") return null;
  return verified.user;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ users: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, status, role } = body;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      updates.status = status;
    }
    if (role && ["admin", "sales", "content", "user"].includes(role)) {
      updates.role = role;
    }

    const { error } = await supabase
      .from("app_users")
      .update(updates)
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("app_users")
      .delete()
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
