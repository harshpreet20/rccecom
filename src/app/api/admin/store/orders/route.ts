import { NextResponse } from "next/server";
import { authedClient, getBearer } from "@/lib/admin/supabase-authed";

export const dynamic = "force-dynamic";

const STATUSES = [
  "awaiting_confirmation",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

/** GET /api/store/orders — list orders (approved admin/sales only, via RLS). */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = authedClient(token);
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status && STATUSES.includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    // RLS denial surfaces here for non-staff.
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return NextResponse.json({ orders: data || [] });
}

/** PATCH /api/store/orders — update an order's status. */
export async function PATCH(request: Request) {
  const token = getBearer(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
  }

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (!data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order: data });
}
