import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

const BASE_SYSTEM = `You are the IDEATOR agent for a badminton/racquet sports Instagram account.
Your job: analyze the account's posts and competitors' top-performing content, then generate 5 fresh content ideas.

For EACH idea you MUST classify it into one of these categories:
- "AI REEL" - Can be fully created using AI video/image generation tools (Runway, Kling, Pika, Midjourney, Sora). Cinematic visuals, animations, 3D renders, motion graphics, stylized edits.
- "REAL" - Must be filmed manually. Real people on court, talking head, behind-the-scenes, tutorials, community events.
- "UGC" - User-generated content. Relies on community members submitting clips, reactions, challenges, or testimonials.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Content Ideas Report"
- For each idea, a styled card with:
  - Numbered title
  - TWO badges side by side: format badge (Reel/Carousel/Story/Post) AND classification badge (AI REEL/REAL/UGC)
  - Use distinct badge colors: AI REEL = orange (#F97316), REAL = green (#10B981), UGC = blue (#3B82F6)
  - A one-line hook in italics
  - A "Why it works" paragraph (2-3 sentences)
- Use warm colors (#F59E0B amber, #EC4899 pink) for card accents, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write in friendly, conversational English, no jargon, no JSON

CRITICAL FORMAT RULES:
- Output ONLY raw HTML. No markdown, no code fences, no backticks, no text before or after the HTML.
- Never use em dashes or en dashes. Use " - " (space hyphen space) instead.
- Your entire response must start with < and end with >. Nothing else.`;

export async function POST() {
  const data = await loadDataWithFallback();
  if (!data) return NextResponse.json({ error: "No data. Run: npm run scrape" }, { status: 404 });

  const me = getMyStats(data);
  const competitors = getCompetitorStats(data);
  const [learnings, brain] = await Promise.all([
    getLearnings("ideator"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const context = `MY ACCOUNT (@${me.handle}): ${me.postCount} posts, avg ${me.avgLikes} likes.
My top post: "${me.topPost?.caption?.slice(0, 100)}" (${me.topPost?.likes} likes)

COMPETITORS:
${competitors.map((c) => `@${c.handle}: ${c.postCount} posts, avg ${c.avgLikes} likes. Top: "${c.topPost?.caption?.slice(0, 100)}" (${c.topPost?.likes} likes)`).join("\n")}

Generate 5 content ideas that could boost my engagement. For each idea, classify it as AI REEL, REAL, or UGC.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("ideator", result);
    return NextResponse.json({ agent: "ideator", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
