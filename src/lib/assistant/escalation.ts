import { askClaude } from "./claude";
import { buildWhatsappSupportUrl } from "@/lib/whatsapp";
import type { ChatMessage, EscalationInfo } from "./types";

/**
 * Escalation specialist: when the assistant can't resolve something (or the
 * customer explicitly asks for a human), generate a short handoff summary
 * and a WhatsApp CTA -- reusing the same buildWhatsappSupportUrl /
 * storeConfig.whatsappNumber path the checkout flow already uses for order
 * confirmation, rather than a new contact channel.
 */

const SUMMARY_SYSTEM = `Summarize this customer support chat in 1-2 short sentences for a human teammate who is about to take over on WhatsApp. Mention what the customer wants and anything already established (order ID, product, issue). Do not add greetings or sign-offs -- just the facts a teammate needs to pick up the conversation.`;

export async function buildEscalation(
  sessionId: string,
  history: ChatMessage[],
  latestMessage: string,
): Promise<EscalationInfo> {
  const transcript =
    history
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
      .join("\n") + `\nCustomer: ${latestMessage}`;

  let summary: string;
  try {
    summary = await askClaude(SUMMARY_SYSTEM, transcript, 150);
  } catch {
    summary = `Customer needs help: "${latestMessage}"`;
  }
  if (!summary) summary = `Customer needs help: "${latestMessage}"`;

  const whatsappUrl = buildWhatsappSupportUrl(summary, sessionId);
  return { whatsappUrl, summary };
}
