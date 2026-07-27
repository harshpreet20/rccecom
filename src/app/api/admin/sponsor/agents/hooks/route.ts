import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport, createAdminClient } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

export const maxDuration = 180;

const BASE_SYSTEM = `You are the SPONSOR HOOK & SCRIPT agent. Write 3 reel scripts with scroll-stopping hooks for sponsor activation content between @racquetsclubcommunity and a sponsor brand.
Each script must naturally weave the sponsor brand into the badminton community narrative. Avoid hard sells - make it feel organic. The sponsor should be integrated as a natural part of the story, not a forced mention.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Sponsor Activation - Reel Scripts & Hooks"
- A brief intro naming the sponsor and the creative approach
- For each script, a styled card with:
  - Script number and a catchy title mentioning the sponsor integration angle
  - "THE HOOK" section (first 3 seconds) - bold, highlighted in a colored box (#EC4899 pink background with white text)
  - "THE SCRIPT" section (15-30 seconds) - the body content in a clean white area, showing where the sponsor brand naturally appears
  - "SPONSOR INTEGRATION" - a brief note on how the brand is woven in
  - "CALL TO ACTION" - in a separate highlighted row
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
  const body = await request.json().catch(() => ({}));
  const sponsorHandle = (body.sponsorHandle || "").trim().replace(/^@/, "");
  if (!sponsorHandle) return NextResponse.json({ error: "Missing sponsorHandle" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: sponsorRow } = await supabase
    .from("sponsor_scrapes")
    .select("data")
    .eq("sponsor_handle", sponsorHandle)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single();
  if (!sponsorRow) return NextResponse.json({ error: "No sponsor data. Scrape first." }, { status: 404 });
  const sponsor = sponsorRow.data;

  const data = await loadDataWithFallback();
  if (!data) return NextResponse.json({ error: "No data. Run scrape first." }, { status: 404 });

  const me = getMyStats(data);
  const competitors = getCompetitorStats(data);
  const [learnings, brain] = await Promise.all([
    getLearnings("sponsor-hooks"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const sponsorTopPosts = (sponsor.posts || [])
    .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 5);

  const myTopPosts = me.posts
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);

  const topCompetitorPosts = competitors
    .flatMap((c) => c.posts.slice(0, 5))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10);

  const context = `SPONSOR BRAND (@${sponsorHandle}):
Top posts:
${sponsorTopPosts.map((p: any) => `"${p.caption?.slice(0, 150)}" - ${p.likes || 0} likes`).join("\n")}

MY ACCOUNT (@${me.handle}): avg ${me.avgLikes} likes per post.
My top posts:
${myTopPosts.map((p) => `"${p.caption?.slice(0, 150)}" - ${p.likes} likes`).join("\n")}

TOP COMPETITOR POSTS (by likes):
${topCompetitorPosts.map((p) => `"${p.caption?.slice(0, 150)}" - ${p.likes} likes (@${p.ownerUsername})`).join("\n")}

Write 3 reel scripts with hooks for a sponsor activation between @racquetsclubcommunity and @${sponsorHandle}. Make the sponsor integration feel natural and organic.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("sponsor-hooks", result);
    return NextResponse.json({ agent: "sponsor-hooks", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
