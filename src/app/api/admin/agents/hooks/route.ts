import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";
import { requireAdmin } from "@/lib/admin/require-admin";

const BASE_SYSTEM = `You are the HOOK & SCRIPT agent for a badminton/racquet sports Instagram account.
Your job: write 3 reel scripts with attention-grabbing hooks.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Reel Scripts & Hooks"
- For each script, a styled card with:
  - Script number and a catchy title
  - "THE HOOK" section (first 3 seconds) — bold, highlighted in a colored box (#EC4899 pink background with white text)
  - "THE SCRIPT" section (15-30 seconds) — the body content in a clean white area
  - "CALL TO ACTION" — in a separate highlighted row
  - Estimated length badge
- Use pink (#EC4899) and violet (#8B5CF6) accents, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write in friendly, conversational English, like you're briefing a content creator
- Make the hooks punchy and scroll-stopping

CRITICAL FORMAT RULES:
- Output ONLY raw HTML. No markdown, no code fences, no backticks, no text before or after the HTML.
- Never use em dashes or en dashes. Use " - " (space hyphen space) instead.
- Your entire response must start with < and end with >. Nothing else.`;

export async function POST(request: Request) {
  const auth = await requireAdmin(request, ["admin", "content"]);
  if (!auth.ok) return auth.response;

  const data = await loadDataWithFallback();
  if (!data) return NextResponse.json({ error: "No data. Run: npm run scrape" }, { status: 404 });

  const me = getMyStats(data);
  const competitors = getCompetitorStats(data);
  const [learnings, brain] = await Promise.all([
    getLearnings("hooks"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const topCompetitorPosts = competitors
    .flatMap((c) => c.posts.slice(0, 5))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10);

  const context = `MY ACCOUNT (@${me.handle}): avg ${me.avgLikes} likes per post.

TOP COMPETITOR POSTS (by likes):
${topCompetitorPosts.map((p) => `"${p.caption?.slice(0, 150)}" — ${p.likes} likes (@${p.ownerUsername})`).join("\n")}

Write 3 reel scripts with hooks that would work for my badminton community account.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("hooks", result);
    return NextResponse.json({ agent: "hooks", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
