import { getAssistantSupabase } from "./supabase-admin";
import type { ChatMessage, ConversationOutcome, ConversationRecord, RouteHistoryEntry } from "./types";

const MAX_TURNS = 15;

/** Turn cap: past this many user messages, stop calling Claude and offer escalation. */
export const MAX_ASSISTANT_TURNS = MAX_TURNS;

type Row = {
  session_id: string;
  customer_identifier: string | null;
  messages: ChatMessage[] | null;
  route_history: RouteHistoryEntry[] | null;
  outcome: ConversationOutcome;
};

function rowToRecord(row: Row): ConversationRecord {
  return {
    sessionId: row.session_id,
    customerIdentifier: row.customer_identifier,
    messages: row.messages ?? [],
    routeHistory: row.route_history ?? [],
    outcome: row.outcome ?? "in_progress",
  };
}

/** Loads the persisted conversation for a session, or null if none exists yet (or Supabase isn't configured). */
export async function loadConversation(sessionId: string): Promise<ConversationRecord | null> {
  const sb = getAssistantSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("assistant_conversations")
    .select("session_id, customer_identifier, messages, route_history, outcome")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Row);
}

/**
 * Upserts the full conversation state after every turn -- safer than only
 * persisting at "conclude", so a customer closing the tab mid-chat doesn't
 * lose the transcript. Best-effort: a persistence failure never blocks the
 * reply from reaching the customer.
 */
export async function saveConversation(record: ConversationRecord): Promise<void> {
  const sb = getAssistantSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.from("assistant_conversations").upsert(
      {
        session_id: record.sessionId,
        customer_identifier: record.customerIdentifier,
        messages: record.messages,
        route_history: record.routeHistory,
        outcome: record.outcome,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );
    if (error) console.error("[assistant] Failed to save conversation:", error.message);
  } catch (err) {
    console.error("[assistant] Failed to save conversation:", err);
  }
}

export function appendMessage(record: ConversationRecord, message: ChatMessage): ConversationRecord {
  return { ...record, messages: [...record.messages, message] };
}

export function appendRoute(record: ConversationRecord, entry: RouteHistoryEntry): ConversationRecord {
  return { ...record, routeHistory: [...record.routeHistory, entry] };
}

export function newConversation(sessionId: string, customerIdentifier: string | null): ConversationRecord {
  return {
    sessionId,
    customerIdentifier,
    messages: [],
    routeHistory: [],
    outcome: "in_progress",
  };
}

/** Number of user turns so far -- used for the ~15-turn cap. */
export function userTurnCount(record: ConversationRecord): number {
  return record.messages.filter((m) => m.role === "user").length;
}
