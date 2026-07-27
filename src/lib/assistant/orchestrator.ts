import { isAssistantConfigured } from "./claude";
import {
  MAX_ASSISTANT_TURNS,
  appendMessage,
  appendRoute,
  loadConversation,
  newConversation,
  saveConversation,
  userTurnCount,
} from "./conversation";
import { buildShoppingContext, checkMentionedDiscount, extractDiscountCode } from "./context";
import { extractIdentity, lookupOrder, mergeIdentity, type ExtractedIdentity } from "./order-lookup";
import { classifyRoute } from "./triage";
import { productPolicyReply, orderSupportReply, wrapUpReply, looksLikeOrderIssue } from "./specialists";
import { buildEscalation } from "./escalation";
import type { AssistantTurnResult, ChatMessage, ConversationRecord } from "./types";

/**
 * The triage graph, run server-side, one turn at a time:
 *
 *   Welcome/identity  -- do we know an order ref / phone / email yet?
 *        |
 *   Triage Agent      -- classify into a route (src/lib/assistant/triage.ts)
 *        |
 *   +----+----+----+----+
 *   |    |    |    |    |
 * product order general escalate wrap_up
 * disc.  supp  policy
 *   |    |    |
 *   +--- specialists (src/lib/assistant/specialists.ts) ---+
 *        |
 *   Conclude/persist   -- appended + upserted on every turn (src/lib/assistant/conversation.ts)
 *
 * This is intentionally a couple of scoped Claude calls per turn (triage +
 * one specialist), not a standing agent loop -- see CLAUDE.md guardrails on
 * keeping this fast/cheap and read-only.
 */

function customerIdentifierFromIdentity(identity: ExtractedIdentity): string | null {
  return identity.orderRef || identity.phone || identity.email || null;
}

export async function handleAssistantTurn(
  sessionId: string,
  message: string,
  customerIdentifier?: string | null,
): Promise<AssistantTurnResult> {
  const trimmed = message.trim().slice(0, 2000);
  const now = new Date().toISOString();

  let record: ConversationRecord =
    (await loadConversation(sessionId)) ?? newConversation(sessionId, customerIdentifier ?? null);

  const userMsg: ChatMessage = { role: "user", content: trimmed, timestamp: now };
  record = appendMessage(record, userMsg);

  // Welcome/identity step: fold any identifier from this turn (or passed
  // explicitly by the client, e.g. from the /track-style form) into what
  // we've learned about this customer so far this session -- read-only,
  // reuses the exact same order-ref + phone matching as /track.
  const priorIdentity: ExtractedIdentity = {
    orderRef: record.customerIdentifier?.match(/^RCC-/i) ? record.customerIdentifier : null,
    phone: record.customerIdentifier?.match(/^\d{10}$/) ? record.customerIdentifier : null,
    email: record.customerIdentifier?.includes("@") ? record.customerIdentifier : null,
  };
  const explicitIdentity: ExtractedIdentity = {
    orderRef: customerIdentifier?.match(/^RCC-/i) ? customerIdentifier : null,
    phone: customerIdentifier?.match(/^\d{10}$/) ? customerIdentifier : null,
    email: customerIdentifier?.includes("@") ? customerIdentifier : null,
  };
  const identity = mergeIdentity(mergeIdentity(extractIdentity(trimmed), explicitIdentity), priorIdentity);
  const identifier = customerIdentifierFromIdentity(identity);
  if (identifier) record = { ...record, customerIdentifier: identifier };

  // Turn cap: stop calling Claude and offer a human handoff instead, so a
  // runaway conversation can't rack up unbounded API cost.
  if (userTurnCount(record) > MAX_ASSISTANT_TURNS) {
    const escalation = await buildEscalation(sessionId, record.messages.slice(0, -1), trimmed);
    const reply =
      "We've covered a lot in this chat -- let's get you straight to a teammate on WhatsApp so this gets sorted quickly.";
    record = appendMessage(record, { role: "assistant", content: reply, timestamp: new Date().toISOString() });
    record = appendRoute(record, { route: "escalate", timestamp: new Date().toISOString() });
    record = { ...record, outcome: "escalated" };
    await saveConversation(record);
    return { reply, route: "escalate", escalated: escalation, outcome: "escalated" };
  }

  if (!isAssistantConfigured()) {
    const reply =
      "The shopping assistant isn't fully set up yet -- please use /track for order status, or reach us on WhatsApp.";
    const escalation = await buildEscalation(sessionId, record.messages.slice(0, -1), trimmed).catch(() => null);
    record = appendMessage(record, { role: "assistant", content: reply, timestamp: new Date().toISOString() });
    record = appendRoute(record, { route: "escalate", timestamp: new Date().toISOString() });
    record = { ...record, outcome: "escalated" };
    await saveConversation(record);
    return {
      reply,
      route: "escalate",
      escalated: escalation ?? undefined,
      outcome: "escalated",
    };
  }

  const hasOrderContext = Boolean(identity.orderRef || identity.phone);
  const route = await classifyRoute(trimmed, hasOrderContext);
  const history = record.messages.slice(0, -1); // everything before this user turn

  let reply: string;
  let escalated: AssistantTurnResult["escalated"];
  let outcome: ConversationRecord["outcome"] = "in_progress";

  switch (route) {
    case "wrap_up": {
      reply = await wrapUpReply(trimmed, history);
      outcome = "resolved";
      break;
    }
    case "escalate": {
      const escalation = await buildEscalation(sessionId, history, trimmed);
      reply =
        "I'll connect you with the RCC team on WhatsApp so a person can take it from here -- tap below to continue the conversation.";
      escalated = escalation;
      outcome = "escalated";
      break;
    }
    case "order_support": {
      const lookup = await lookupOrder(identity);
      reply = await orderSupportReply(trimmed, history, lookup, looksLikeOrderIssue(trimmed));
      break;
    }
    case "product_discovery":
    case "general_policy":
    default: {
      const ctx = await buildShoppingContext();
      const discountCode = extractDiscountCode(trimmed);
      const discount = await checkMentionedDiscount(discountCode);
      reply = await productPolicyReply(trimmed, history, ctx, discount);
      break;
    }
  }

  record = appendMessage(record, { role: "assistant", content: reply, timestamp: new Date().toISOString() });
  record = appendRoute(record, { route, timestamp: new Date().toISOString() });
  record = { ...record, outcome };

  await saveConversation(record);

  return { reply, route, escalated, outcome };
}
