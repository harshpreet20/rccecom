/** Shared types for the AI shopping/support assistant. */

/** The five routes the triage step can hand a message off to. */
export type AssistantRoute =
  | "product_discovery"
  | "order_support"
  | "general_policy"
  | "escalate"
  | "wrap_up";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  timestamp: string;
};

export type RouteHistoryEntry = {
  route: AssistantRoute;
  timestamp: string;
};

export type ConversationOutcome = "resolved" | "escalated" | "abandoned" | "in_progress";

export type ConversationRecord = {
  sessionId: string;
  customerIdentifier: string | null;
  messages: ChatMessage[];
  routeHistory: RouteHistoryEntry[];
  outcome: ConversationOutcome;
};

/** Read-only order status, exactly what lookup_order() returns. */
export type OrderStatus = {
  order_ref: string;
  status: string;
  amount: number;
  created_at: string;
  items: { name: string; qty: number }[];
};

export type EscalationInfo = {
  whatsappUrl: string;
  summary: string;
};

export type AssistantTurnResult = {
  reply: string;
  route: AssistantRoute;
  escalated?: EscalationInfo;
  outcome: ConversationOutcome;
};
