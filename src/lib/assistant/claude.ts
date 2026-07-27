import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude client for the customer-facing shopping/support assistant.
 *
 * Mirrors the client-init pattern in src/lib/admin/claude.ts (same env var,
 * same non-streaming Messages call shape) but lives entirely in the
 * storefront's own namespace -- this module is never imported from
 * src/lib/admin/*, and vice versa.
 *
 * Server-only: never import this file from a client component. The API key
 * is read from process.env and never sent to the browser.
 */

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in .env");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** True when the assistant can actually call Claude. */
export const isAssistantConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * A single, non-streaming Claude call. Kept deliberately small (one system
 * prompt + one user turn) so triage and each specialist reply stay fast and
 * cheap -- this is not an agent framework, just a couple of scoped calls per
 * customer message.
 */
export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = response.content[0];
  if (block && block.type === "text") return block.text.trim();
  return "";
}
