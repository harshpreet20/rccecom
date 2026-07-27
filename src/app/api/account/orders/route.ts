import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/orders
 *
 * Returns the authenticated customer's own order history. The caller's
 * identity comes only from their verified Supabase session token (Bearer
 * header) — never from a client-supplied phone/email/id, and never from
 * the customer_profiles table (which the customer can edit freely and is
 * therefore not a trustworthy identity source) — so one customer can never
 * read another's orders by editing their own profile.
 */
export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Order history isn't set up yet." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verified identity only -- never the editable customer_profiles row.
  const email = (userData.user.email || "").trim();
  if (!email) {
    return NextResponse.json({ orders: [] });
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "order_ref, status, amount, subtotal, shipping_amount, tax_amount, items, customer_email, customer_phone, created_at",
    )
    .ilike("customer_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }

  const result = (orders || []).map((o) => ({
    orderRef: o.order_ref,
    status: o.status,
    amount: o.amount,
    subtotal: o.subtotal,
    shipping: o.shipping_amount,
    tax: o.tax_amount,
    items: Array.isArray(o.items) ? o.items : [],
    createdAt: o.created_at,
  }));

  return NextResponse.json({ orders: result });
}
