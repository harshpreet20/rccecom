import { NextResponse } from "next/server";
import { handleAssistantTurn } from "@/lib/assistant/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/assistant/chat -- the AI shopping/support assistant's only API
 * route. Body: { sessionId, message, customerIdentifier? }. Runs the triage
 * + specialist step server-side (Claude is never called from the client) and
 * returns { reply, route, escalated?, outcome }. Persists the conversation
 * transcript on every turn (see src/lib/assistant/conversation.ts).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const sessionId = typeof b.sessionId === "string" ? b.sessionId.trim() : "";
  const message = typeof b.message === "string" ? b.message : "";
  const customerIdentifier =
    typeof b.customerIdentifier === "string" && b.customerIdentifier.trim()
      ? b.customerIdentifier.trim()
      : undefined;

  if (!sessionId || sessionId.length > 200) {
    return NextResponse.json({ error: "Missing or invalid sessionId" }, { status: 400 });
  }
  if (!message.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  try {
    const result = await handleAssistantTurn(sessionId, message, customerIdentifier);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[assistant/chat] Failed to handle turn:", err);
    return NextResponse.json(
      {
        reply:
          "Sorry, something went wrong on our end. Please try again, or track your order at /track.",
        route: "escalate",
        outcome: "abandoned",
      },
      { status: 200 },
    );
  }
}
