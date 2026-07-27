import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/orders
 *
 * Returns the authenticated customer's own order history. The caller's
 * identity comes only from their verified Supabase session token (Bearer
 * header) — never from a client-supplied phone/email/id — so one customer
 * can never enumerate another's orders.
 *
 * Flow: verify the bearer token -> look up *that user's* customer_profiles
 * row for their phone/email -> query orders matching that phone or email.
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
  const user = userData.user;

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("phone, email")
    .eq("id", user.id)
    .maybeSingle();

  const phone = profile?.phone ? String(profile.phone).replace(/\D/g, "").slice(-10) : "";
  const email = (profile?.email || user.email || "").trim();

  if (!phone && !email) {
    return NextResponse.json({ orders: [] });
  }

  const filters: string[] = [];
  if (phone) filters.push(`customer_phone.eq.${phone}`);
  if (email) filters.push(`customer_email.ilike.${email}`);

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "order_ref, status, amount, subtotal, shipping_amount, tax_amount, items, customer_email, customer_phone, created_at",
    )
    .or(filters.join(","))
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
