import { NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { CartLine, OrderPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Basic shape guard for the incoming JSON. */
function isValidPayload(body: unknown): body is OrderPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.orderRef === "string" &&
    Array.isArray(b.items) &&
    b.items.length > 0 &&
    typeof b.customer === "object" &&
    b.customer !== null
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const { orderRef, items, customer, upiTxnRef } = body;

  // Basic customer validation.
  const name = String(customer.name || "").trim();
  const phone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
  const address = String(customer.address || "").trim();
  if (!name || !/^[6-9]\d{9}$/.test(phone) || address.length < 10) {
    return NextResponse.json(
      { error: "Missing or invalid customer details" },
      { status: 400 },
    );
  }

  // Re-price every line against the server catalogue — never trust the client
  // total. Unknown slugs are rejected.
  const validatedItems: CartLine[] = [];
  let amount = 0;
  for (const raw of items as CartLine[]) {
    const product = getProduct(String(raw.slug));
    if (!product) {
      return NextResponse.json(
        { error: `Unknown item: ${raw.slug}` },
        { status: 400 },
      );
    }
    const qty = Math.max(1, Math.min(50, Math.floor(Number(raw.qty) || 1)));
    const size =
      product.sizes && raw.size && product.sizes.includes(String(raw.size))
        ? String(raw.size)
        : undefined;

    // Keep only personalization fields the product actually declares, and
    // clamp each to its configured max length.
    let custom: Record<string, string> | undefined;
    if (product.personalization && raw.custom) {
      const clean: Record<string, string> = {};
      for (const field of product.personalization) {
        const val = raw.custom[field.key];
        if (typeof val === "string" && val.trim()) {
          clean[field.key] = val.trim().slice(0, field.maxLength);
        }
      }
      if (Object.keys(clean).length) custom = clean;
    }

    validatedItems.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      qty,
      size,
      custom,
      emoji: product.emoji,
      accent: product.accent,
    });
    amount += product.price * qty;
  }

  const order = {
    order_ref: orderRef,
    amount,
    currency: "INR",
    status: "awaiting_confirmation" as const,
    items: validatedItems,
    customer_name: name,
    customer_phone: phone,
    customer_email: String(customer.email || "").trim() || null,
    customer_address: address,
    notes: String(customer.notes || "").trim() || null,
    upi_txn_ref: upiTxnRef ? String(upiTxnRef).trim() : null,
  };

  // Persist to Supabase when configured. If it isn't (or the insert fails),
  // the order is still captured via the WhatsApp handoff on the client.
  let persisted = false;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("orders").insert(order);
    if (error) {
      console.error("[orders] Supabase insert failed:", error.message);
    } else {
      persisted = true;
    }
  }

  return NextResponse.json({
    ok: true,
    orderRef,
    amount,
    persisted,
  });
}
