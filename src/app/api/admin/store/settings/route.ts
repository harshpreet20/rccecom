import { NextResponse } from "next/server";
import { authedClient, getBearer } from "@/lib/admin/supabase-authed";

export const dynamic = "force-dynamic";

const FIELDS = ["tax_rate_pct", "shipping_flat_rate", "free_shipping_threshold"] as const;

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (UNSAFE_KEYS.has(f)) continue;
    if (f in body) out[f] = body[f];
  }
  return out;
}

/** GET /api/store/settings — the singleton shipping/tax settings row. */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = authedClient(token);
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ settings: data });
}

/** PATCH /api/store/settings — update shipping/tax settings. */
export async function PATCH(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = pick(body);
  // These feed live checkout pricing on the storefront -- reject anything
  // that isn't a finite, non-negative number.
  for (const key of ["tax_rate_pct", "shipping_flat_rate", "free_shipping_threshold"] as const) {
    if (key in updates) {
      const v = updates[key];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
      }
    }
  }

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("store_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (!data) return NextResponse.json({ error: "Settings row not found" }, { status: 404 });
  return NextResponse.json({ ok: true, settings: data });
}
