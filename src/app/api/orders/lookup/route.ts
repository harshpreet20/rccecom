import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Look up an order's status. Requires BOTH the order ref and the phone number
 * used at checkout, so one field alone can't be used to enumerate orders.
 * Returns only non-sensitive status fields.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Order tracking isn't set up yet. Please check your WhatsApp chat with RCC for updates.",
      },
      { status: 503 },
    );
  }

  let body: { orderRef?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderRef = String(body.orderRef || "").trim().toUpperCase();
  const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
  if (!orderRef || phone.length !== 10) {
    return NextResponse.json(
      { error: "Enter your order ID and the mobile number used at checkout." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("orders")
    .select("order_ref, status, amount, created_at, items")
    .eq("order_ref", orderRef)
    .eq("customer_phone", phone)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "No order found for that ID and mobile number." },
      { status: 404 },
    );
  }

  return NextResponse.json({ order: data });
}
