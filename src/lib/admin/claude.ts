import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in .env");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function askClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = response.content[0];
  if (block && block.type === "text") return cleanHtmlOutput(block.text);
  return "";
}

function cleanHtmlOutput(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  // Only run HTML-tag extraction on responses that actually look like HTML.
  // Not every caller wants HTML back -- micro-intel.ts's retrain() expects a
  // JSON array of strings, and running this against e.g.
  // `["Use <strong> tags..."]` would truncate it down to `<strong>`.
  if (text.startsWith("<")) {
    const firstTag = text.indexOf("<");
    const lastTag = text.lastIndexOf(">");
    if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
      text = text.substring(firstTag, lastTag + 1);
    }
  }

  text = text.replace(/—/g, " - ").replace(/–/g, " - ");
  return text;
}
