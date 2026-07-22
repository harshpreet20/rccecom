import { NextResponse } from "next/server";
import { fetchProduct } from "@/lib/catalogue";
import { getSupabase } from "@/lib/supabase";
import { priceOrder } from "@/lib/pricing";
import { fetchStoreSettings } from "@/lib/store-settings";
import { checkDiscountCode, consumeDiscountCode } from "@/lib/discounts";
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

  const { orderRef, items, customer, upiTxnRef, discountCode: requestedCode } = body;

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
  for (const raw of items as CartLine[]) {
    const product = await fetchProduct(String(raw.slug));
    if (!product) {
      return NextResponse.json(
        { error: `Unknown item: ${raw.slug}` },
        { status: 400 },
      );
    }
    // Re-check availability at order time too, not just in the UI -- the
    // customer's cart may predate the item going out of stock (CRM edit
    // between add-to-cart and checkout, or a direct API call).
    if (product.soldOut) {
      return NextResponse.json(
        { error: "sold_out", message: `${product.name} is no longer available.` },
        { status: 409 },
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
      kind: product.kind,
      emoji: product.emoji,
      accent: product.accent,
    });
  }

  // Authoritative totals — shipping/tax settings and the discount code come
  // from the server (CRM-managed store_settings + discounts tables), never
  // trusting whatever the client displayed, so the persisted amount matches
  // the QR the customer was shown.
  const settings = await fetchStoreSettings();
  const rawSubtotal = validatedItems.reduce((n, l) => n + l.price * l.qty, 0);

  let appliedDiscount: { code: string; type: "percent" | "flat"; value: number } | null = null;
  if (requestedCode) {
    const check = await checkDiscountCode(requestedCode, rawSubtotal);
    if (check.valid && check.type && check.value != null) {
      appliedDiscount = { code: check.code || requestedCode, type: check.type, value: check.value };
    } else {
      // The code became invalid (expired/used/etc.) between being shown to
      // the customer and this request. The UPI QR they already paid was for
      // a total that included this discount -- silently repricing higher
      // here would record/demand more than they actually paid, so reject
      // instead of proceeding without the discount.
      return NextResponse.json(
        {
          error: "discount_invalid",
          message: "This discount code is no longer valid. Please remove it and try again.",
        },
        { status: 409 },
      );
    }
  }

  const { subtotal, tax, taxRatePct, shipping, discount, discountCode, total } =
    priceOrder(validatedItems, { settings, discount: appliedDiscount });

  const order = {
    order_ref: orderRef,
    amount: total,
    subtotal,
    tax_amount: tax,
    tax_rate_pct: taxRatePct,
    shipping_amount: shipping,
    discount_amount: discount,
    discount_code: discountCode,
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
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("orders").insert(order);
    if (error) {
      console.error("[orders] Supabase insert failed:", error.message);
    } else {
      persisted = true;
      if (appliedDiscount) await consumeDiscountCode(appliedDiscount.code);
    }
  }

  return NextResponse.json({
    ok: true,
    orderRef,
    amount: total,
    subtotal,
    tax,
    shipping,
    discount,
    discountCode,
    persisted,
  });
}
