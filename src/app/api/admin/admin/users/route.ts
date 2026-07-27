import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/supabase-server";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request, ["admin"]);
  if (!auth.ok) return auth.response;

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
  const auth = await requireAdmin(request, ["admin"]);
  if (!auth.ok) return auth.response;

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
  const auth = await requireAdmin(request, ["admin"]);
  if (!auth.ok) return auth.response;

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
