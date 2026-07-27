import { askClaude } from "./claude";
import type { AssistantRoute } from "./types";

/**
 * Triage: classifies each incoming message into one of five routes. Kept to
 * a single, small Claude call (a short classification prompt) rather than a
 * full agent framework -- fast and cheap by design.
 *
 * A couple of cheap deterministic checks run first for the two "meta" routes
 * (explicit human handoff / explicit end-of-chat), since those don't need a
 * model call to detect and jumping straight there saves a round trip.
 */

const HUMAN_HANDOFF_RE =
  /\b(talk to (a )?(human|person|someone|agent)|real person|customer care|speak to (someone|support)|human support)\b/i;

const WRAP_UP_RE =
  /^\s*(bye|goodbye|thanks?,?\s*(that'?s|thats)\s*all|thank you,?\s*(that'?s|thats)\s*all|no,?\s*(that'?s|thats)\s*all|end chat|that'?s all,?\s*thanks?)\s*[.!]*\s*$/i;

const ROUTES: AssistantRoute[] = [
  "product_discovery",
  "order_support",
  "general_policy",
  "escalate",
  "wrap_up",
];

const TRIAGE_SYSTEM = `You are the triage step for the RCC (Racquets Club Community) merch store's customer support assistant.
Classify the customer's latest message into EXACTLY ONE of these labels:

- product_discovery: browsing, comparing, or asking about products, sizing, personalization, or discount codes.
- order_support: asking about an existing order's status, tracking, shipping/delivery, or "where is my order".
- general_policy: shipping fees, tax, payment methods, returns/exchange policy, general store questions.
- order_issue: payment problems, stock/availability conflicts, delivery problems, something went wrong with an order.
- escalate: explicitly wants a human, or the request is clearly outside what a store assistant can help with (e.g. legal, account deletion, security concern).
- wrap_up: says goodbye / thanks / done / nothing else needed.

Respond with EXACTLY ONE of these words and nothing else: product_discovery, order_support, general_policy, order_issue, escalate, wrap_up`;

/** order_issue folds into order_support downstream (same specialist handles both, see specialists.ts). */
type RawLabel = AssistantRoute | "order_issue";

export async function classifyRoute(message: string, hasOrderContext: boolean): Promise<AssistantRoute> {
  if (HUMAN_HANDOFF_RE.test(message)) return "escalate";
  if (WRAP_UP_RE.test(message)) return "wrap_up";

  try {
    const raw = (await askClaude(TRIAGE_SYSTEM, message, 20)).trim().toLowerCase() as RawLabel;
    if (raw === "order_issue") return "order_support";
    if ((ROUTES as string[]).includes(raw)) return raw as AssistantRoute;
  } catch {
    // fall through to heuristic default below
  }

  // Deterministic fallback if the model call fails or returns something
  // unexpected -- never block the turn on triage alone.
  return hasOrderContext ? "order_support" : "product_discovery";
}
