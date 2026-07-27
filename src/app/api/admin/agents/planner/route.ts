import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";
import { requireAdmin } from "@/lib/admin/require-admin";

const BASE_SYSTEM = `You are the PLANNER agent for a badminton/racquet sports Instagram account.
Your job: create a 7-day content calendar.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "7-Day Content Calendar"
- A brief intro paragraph summarizing the strategy
- For each day, a row/card with:
  - Day name and date (starting from tomorrow)
  - Content type badge (Reel/Carousel/Story/Post) with colored background (#8B5CF6 violet for Reel, #EC4899 pink for Carousel, #F59E0B amber for Story, #3B82F6 blue for Post)
  - Topic title in bold
  - Best posting time
  - Brief description (1-2 sentences)
- A summary section at the bottom with posting tips
- Use violet (#8B5CF6) as the primary accent, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write in friendly, conversational English, like a social media manager briefing
- Make it feel like a real content calendar you'd print out

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
    getLearnings("planner"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const recentPosts = me.posts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const context = `MY ACCOUNT (@${me.handle}): ${me.postCount} posts, avg ${me.avgLikes} likes, avg ${me.avgComments} comments.

RECENT POSTS:
${recentPosts.map((p) => `[${p.type}] "${p.caption?.slice(0, 100)}" — ${p.likes} likes, ${p.comments} comments`).join("\n")}

Create a 7-day content calendar starting from tomorrow. Mix formats for maximum reach.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("planner", result);
    return NextResponse.json({ agent: "planner", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
