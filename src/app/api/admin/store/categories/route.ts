import { NextResponse } from "next/server";
import { authedClient, getBearer } from "@/lib/admin/supabase-authed";

export const dynamic = "force-dynamic";

const FIELDS = ["name", "slug", "description", "sort_order", "active"] as const;

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (UNSAFE_KEYS.has(f)) continue;
    if (f in body) out[f] = body[f];
  }
  return out;
}

/** GET /api/store/categories — full list incl. inactive (staff only). */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ categories: data || [] });
}

/** POST /api/store/categories — create a category. */
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
  if (!row.name || !row.slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const supabase = authedClient(token);
  const { data, error } = await supabase.from("categories").insert(row).select("*").maybeSingle();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "A category with that slug already exists." : error.message },
      { status: conflict ? 409 : 403 },
    );
  }
  return NextResponse.json({ ok: true, category: data });
}

/** PATCH /api/store/categories — update a category by id. */
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

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("categories")
    .update(pick(body))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (!data) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json({ ok: true, category: data });
}

/** DELETE /api/store/categories?id=... */
export async function DELETE(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = authedClient(token);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
