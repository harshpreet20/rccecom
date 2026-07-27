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

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (UNSAFE_KEYS.has(f)) continue;
    if (f in body) out[f] = body[f];
  }
  return out;
}

/** Validates `value` when present, using `type` (existing or incoming) to
 * decide whether a percentage cap applies. Returns an error string, or null
 * if valid / not present. */
function validateValue(value: unknown, type: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "value must be a non-negative number";
  }
  if (type === "percentage" && value > 100) {
    return "percentage discounts cannot exceed 100";
  }
  return null;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const row = pick(body);
  if (typeof row.code === "string") row.code = row.code.trim().toUpperCase();
  if (!row.code || row.value == null) {
    return NextResponse.json({ error: "code and value are required" }, { status: 400 });
  }
  const valueError = validateValue(row.value, row.type);
  if (valueError) return NextResponse.json({ error: valueError }, { status: 400 });

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const id = body.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates = pick(body);
  if (typeof updates.code === "string") updates.code = updates.code.trim().toUpperCase();

  const supabase = authedClient(token);

  // Resolve the effective discount type from the existing row when the
  // update doesn't specify one, so a percentage discount's 100% cap can't
  // be bypassed by omitting `type` from the PATCH body.
  let effectiveType = updates.type;
  if (effectiveType === undefined) {
    const { data: existing } = await supabase
      .from("discounts")
      .select("type")
      .eq("id", id)
      .maybeSingle();
    effectiveType = existing?.type;
  }

  const valueError = validateValue(updates.value, effectiveType);
  if (valueError) return NextResponse.json({ error: valueError }, { status: 400 });

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
