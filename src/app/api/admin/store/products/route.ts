import { NextResponse } from "next/server";
import { authedClient, getBearer } from "@/lib/admin/supabase-authed";

export const dynamic = "force-dynamic";

/** Whitelist of columns the CRM may write, so unexpected keys are ignored. */
const FIELDS = [
  "slug",
  "name",
  "blurb",
  "description",
  "price",
  "category",
  "sizes",
  "personalization",
  "highlights",
  "accent",
  "emoji",
  "image",
  "stock",
  "badge",
  "sold_out",
  "active",
  "sort_order",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "kind",
  "amazon_url",
  "flipkart_url",
] as const;

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (UNSAFE_KEYS.has(f)) continue;
    if (f in body) out[f] = body[f];
  }
  return out;
}

/** GET /api/store/products — full catalogue incl. inactive (staff only). */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ products: data || [] });
}

/** POST /api/store/products — create a product. */
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
  if (!row.slug || !row.name || row.price == null) {
    return NextResponse.json(
      { error: "slug, name and price are required" },
      { status: 400 },
    );
  }
  if (typeof row.price !== "number" || !Number.isFinite(row.price) || row.price < 0) {
    return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
  }

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("*")
    .maybeSingle();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "A product with that slug already exists." : error.message },
      { status: conflict ? 409 : 403 },
    );
  }
  return NextResponse.json({ ok: true, product: data });
}

/** PATCH /api/store/products — update a product by id. */
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
  if ("price" in updates && (typeof updates.price !== "number" || !Number.isFinite(updates.price) || updates.price < 0)) {
    return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
  }

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ ok: true, product: data });
}

/** DELETE /api/store/products?id=... — remove a product. */
export async function DELETE(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = authedClient(token);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
