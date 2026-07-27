import { askClaude } from "./claude";
import { storeConfig } from "@/lib/config";
import type { ChatMessage } from "./types";
import type { ShoppingContext, DiscountFact } from "./context";
import type { OrderLookupResult } from "./order-lookup";

/**
 * Specialist reply builders. Every specialist here is read-only: none of
 * them can place an order, apply a discount, or mutate any data -- that's
 * always the /checkout flow. Each prompt is explicitly told to only state
 * facts that are handed to it in the context block, and to ask a clarifying
 * question (or hand off) instead of guessing when it lacks a fact.
 */

const ISSUE_KEYWORDS =
  /\b(fail(ed)?|declin(ed|e)|not (working|received)|didn'?t (work|arrive)|missing|damaged|wrong (item|size|address)|stuck|out of stock|refund|exchange|late|delay(ed)?|broken|cancel)\b/i;

export function looksLikeOrderIssue(message: string): boolean {
  return ISSUE_KEYWORDS.test(message);
}

function historyBlock(history: ChatMessage[]): string {
  if (!history.length) return "(no earlier messages this session)";
  return history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
    .join("\n");
}

const GUARDRAIL = `Rules:
- Only state prices, stock, sizes, shipping/tax figures, or discount validity that appear in the CONTEXT block below. Never guess or invent a number.
- If you need a fact that isn't in the context, ask a short clarifying question instead of guessing.
- You cannot place an order, change an order, or apply a discount -- all purchases go through the site's normal /checkout flow. If the customer wants to buy, point them to the product page or checkout.
- Keep replies short and conversational -- a few sentences, not an essay. No markdown headers.
- You are speaking for ${storeConfig.name} (${storeConfig.shortName}), an Indian racquet-sports merch store.`;

/** Product/policy specialist -- catalogue, sizing, shipping/tax, discount codes. Read-only. */
export async function productPolicyReply(
  message: string,
  history: ChatMessage[],
  ctx: ShoppingContext,
  discount: DiscountFact,
): Promise<string> {
  const discountLine =
    discount.checked && discount.valid
      ? `Discount code "${discount.code}" IS valid: ${discount.type === "percent" ? `${discount.value}% off` : `₹${discount.value} off`}.`
      : discount.checked
        ? `The discount code the customer mentioned is NOT valid right now (${discount.reason ?? "not found"}).`
        : "The customer has not mentioned a discount code.";

  const system = `${GUARDRAIL}

You are the product & policy specialist. Answer questions about the catalogue, sizing, personalization, shipping fees, tax, and discount codes.

CONTEXT
Catalogue:
${ctx.catalogueText}

Shipping & payment:
${ctx.shippingText}

${ctx.sizeChartText}

${discountLine}

Conversation so far:
${historyBlock(history)}`;

  return askClaude(system, message, 500);
}

/** Lookup + order-issue specialist -- order status from Supabase, and read-only troubleshooting. Never mutates anything. */
export async function orderSupportReply(
  message: string,
  history: ChatMessage[],
  lookup: OrderLookupResult,
  isIssue: boolean,
): Promise<string> {
  let orderFacts: string;
  switch (lookup.status) {
    case "found": {
      const o = lookup.order;
      const items = o.items?.map((i) => `${i.qty} × ${i.name}`).join(", ") || "(items unavailable)";
      orderFacts = `Order ${o.order_ref}: status = "${o.status}", total = ₹${o.amount}, placed ${o.created_at}, items: ${items}.`;
      break;
    }
    case "not_found":
      orderFacts = "No order was found matching the order ID and phone number provided. Double-check both are correct.";
      break;
    case "needs_more_info":
      orderFacts =
        lookup.missing === "order_ref"
          ? "The customer has not yet given their order ID (looks like RCC-XXXXXX)."
          : "The customer gave an order ID but not the 10-digit mobile number used at checkout.";
      break;
    case "unavailable":
      orderFacts = "Order lookup is temporarily unavailable (system issue) -- do not guess a status.";
      break;
  }

  const role = isIssue
    ? "You are the order-issue specialist: help with payment problems, stock conflicts, delivery problems, and return/exchange policy questions."
    : "You are the order-lookup specialist: answer questions about an existing order's status (packed/shipped/delivered) and tracking.";

  const issueGuidance = isIssue
    ? `\nFor payment failures: reassure them their UPI payment reference is what RCC reconciles against, and if debited but not confirmed, escalate to a human with the UPI reference number.
For stock conflicts: explain the item may be sold out or a size unavailable -- check the catalogue context is not something you have here, so ask them to check the product page, or escalate.
For returns/exchanges: RCC handles these case-by-case over WhatsApp -- do not state a specific policy you don't have; offer to connect them to a human for anything requiring an actual account or order change.`
    : "";

  const system = `${GUARDRAIL}

${role}
${issueGuidance}

CONTEXT (order lookup result -- this is the ONLY order data you have, do not invent anything else)
${orderFacts}

If order lookup says "needs_more_info", ask the customer for exactly the missing piece (order ID looks like RCC-XXXXXX; phone is the 10-digit number used at checkout) -- do not ask for both again if one is already known.
If the customer needs something you cannot verify or do here (an actual refund, order change, or account action), say you'll connect them with the team.

Conversation so far:
${historyBlock(history)}`;

  return askClaude(system, message, 500);
}

/** Closing message for the wrap_up route. */
export async function wrapUpReply(message: string, history: ChatMessage[]): Promise<string> {
  const system = `${GUARDRAIL}

The customer is ending the chat (saying bye/thanks/done). Send a brief, warm sign-off. Mention they can always come back, or track an order at /track, or reach ${storeConfig.supportEmail}. Keep it to 1-2 sentences.

Conversation so far:
${historyBlock(history)}`;
  return askClaude(system, message, 150);
}
