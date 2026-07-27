import { NextResponse } from "next/server";
import { authedClient, getBearer } from "@/lib/admin/supabase-authed";

export const dynamic = "force-dynamic";

const FIELDS = [
  "code",
  "type",
  "value",
  "active",
  "starts_at",
  "ends_at",
  "usage_limit",
  "min_order_amount",
] as const;

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f];
  }
  return out;
}

/** GET /api/store/discounts — full list (staff only). */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ discounts: data || [] });
}

/** POST /api/store/discounts — create a discount code. */
export async function POST(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = pick(body);
  if (typeof row.code === "string") row.code = row.code.trim().toUpperCase();
  if (!row.code || row.value == null) {
    return NextResponse.json({ error: "code and value are required" }, { status: 400 });
  }

  const supabase = authedClient(token);
  const { data, error } = await supabase.from("discounts").insert(row).select("*").maybeSingle();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "A discount with that code already exists." : error.message },
      { status: conflict ? 409 : 403 },
    );
  }
  return NextResponse.json({ ok: true, discount: data });
}

/** PATCH /api/store/discounts — update a discount by id. */
export async function PATCH(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates = pick(body);
  if (typeof updates.code === "string") updates.code = updates.code.trim().toUpperCase();

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("discounts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (!data) return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  return NextResponse.json({ ok: true, discount: data });
}

/** DELETE /api/store/discounts?id=... */
export async function DELETE(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = authedClient(token);
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
