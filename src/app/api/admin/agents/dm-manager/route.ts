import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";
import { requireAdmin } from "@/lib/admin/require-admin";

const BASE_SYSTEM = `You are the DM MANAGER agent for a badminton/racquet sports community Instagram account.
Your job: create DM templates for common scenarios.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "DM Templates"
- A brief intro paragraph about the brand voice
- For each of the 5 templates, a styled card with:
  - Scenario name as a bold header with a relevant emoji
  - A "TONE" badge (Friendly/Professional/Casual/Warm) with colored background
  - The actual DM template in a styled quote block with a light blue (#EFF6FF) background
  - A "PRO TIP" line in small italic text explaining when/how to use it
- The 5 scenarios: welcome new follower, reply to collab request, promote upcoming event, re-engage inactive follower, thank someone for sharing
- Use blue (#3B82F6) as the primary accent, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write templates that feel personal and genuine, not corporate or spammy
- Include placeholder markers like [Name] or [Event] where personalization goes

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
  const [learnings, brain] = await Promise.all([
    getLearnings("dm-manager"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const context = `MY ACCOUNT (@${me.handle}): A badminton/racquet sports community.
- ${me.postCount} posts, avg ${me.avgLikes} likes
- Content style based on recent captions:
${me.posts.slice(0, 5).map((p) => `"${p.caption?.slice(0, 80)}"`).join("\n")}

Generate 5 DM templates that match my brand voice.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("dm-manager", result);
    return NextResponse.json({ agent: "dm-manager", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
