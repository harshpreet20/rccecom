import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { OrderStatus } from "./types";

/**
 * Order identification for the assistant, reusing the exact same lookup
 * method as src/app/track/page.tsx and src/app/api/orders/lookup/route.ts:
 * the `lookup_order` RPC only returns a row when BOTH the order ref AND the
 * phone number used at checkout match, so one field alone can never be used
 * to enumerate orders. This is intentionally the only "auth" the assistant
 * has -- there is no customer login system in this storefront, and the
 * assistant does not invent one.
 */

const ORDER_REF_RE = /\bRCC-[A-Z0-9]{4,10}\b/i;
const PHONE_RE = /\b[6-9]\d{9}\b/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

export type ExtractedIdentity = {
  orderRef: string | null;
  phone: string | null;
  email: string | null;
};

/** Pulls an order ref / phone / email out of free text, if present. */
export function extractIdentity(text: string): ExtractedIdentity {
  const refMatch = text.match(ORDER_REF_RE);
  const phoneMatch = text.match(PHONE_RE);
  const emailMatch = text.match(EMAIL_RE);
  return {
    orderRef: refMatch ? refMatch[0].toUpperCase() : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    email: emailMatch ? emailMatch[0] : null,
  };
}

/** Merges identity found in the current message with whatever was captured earlier in the session. */
export function mergeIdentity(a: ExtractedIdentity, b: ExtractedIdentity): ExtractedIdentity {
  return {
    orderRef: a.orderRef || b.orderRef,
    phone: a.phone || b.phone,
    email: a.email || b.email,
  };
}

export type OrderLookupResult =
  | { status: "found"; order: OrderStatus }
  | { status: "not_found" }
  | { status: "needs_more_info"; missing: "order_ref" | "phone" }
  | { status: "unavailable" };

/**
 * Read-only order status lookup -- same RPC, same both-fields-required rule
 * as the /track page. Returns "needs_more_info" rather than guessing when
 * only one of the two identifiers is known, so the assistant asks a
 * clarifying question instead of fabricating a match.
 */
export async function lookupOrder(identity: ExtractedIdentity): Promise<OrderLookupResult> {
  if (!isSupabaseConfigured()) return { status: "unavailable" };
  if (!identity.orderRef && !identity.phone) return { status: "needs_more_info", missing: "order_ref" };
  if (!identity.orderRef) return { status: "needs_more_info", missing: "order_ref" };
  if (!identity.phone) return { status: "needs_more_info", missing: "phone" };

  const sb = getSupabase();
  if (!sb) return { status: "unavailable" };

  const { data, error } = await sb.rpc("lookup_order", {
    p_ref: identity.orderRef,
    p_phone: identity.phone,
  });
  if (error) return { status: "unavailable" };

  const order = Array.isArray(data) ? data[0] : data;
  if (!order) return { status: "not_found" };
  return { status: "found", order: order as OrderStatus };
}
