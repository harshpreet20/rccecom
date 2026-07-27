import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/supabase-server";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent");
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 20;

  const supabase = createAdminClient();
  let query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agent) {
    query = query.eq("agent_name", agent);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request, ["admin", "content"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing report id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
