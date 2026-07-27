import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport, createAdminClient } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

export const maxDuration = 180;

const BASE_SYSTEM = `You are the SPONSOR PLANNER agent. Create a 2-DAY CONTENT ACTIVATION plan for Saturday and Sunday featuring a sponsor activation between @racquetsclubcommunity and a sponsor brand.

The plan includes:
- Pre-activation teaser (Friday evening story)
- Saturday content (2-3 posts/reels)
- Sunday content (2-3 posts/reels)
- Post-activation recap (Monday story)

Each slot must have: content type, posting time, brief description, and CTA.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Sponsor Activation - Weekend Content Plan"
- A brief intro paragraph naming the sponsor and the weekend activation strategy
- A timeline layout with 4 sections: Friday (teaser), Saturday (main), Sunday (main), Monday (recap)
- For each content slot, a styled card with:
  - Day name and posting time
  - Content type badge (Reel/Carousel/Story/Post) with colored background (#8B5CF6 violet for Reel, #EC4899 pink for Carousel, #F59E0B amber for Story, #3B82F6 blue for Post)
  - Topic title in bold mentioning the sponsor integration
  - Brief description (1-2 sentences)
  - CTA in a highlighted box
- A summary section with activation tips and best practices
- Use violet (#8B5CF6) as the primary accent, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write in friendly, conversational English, like a social media manager briefing
- Make it feel like a real activation calendar you'd share with the sponsor

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
  const [learnings, brain] = await Promise.all([
    getLearnings("sponsor-planner"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const recentPosts = me.posts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const sponsorTopPosts = (sponsor.posts || [])
    .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 5);

  const context = `SPONSOR BRAND (@${sponsorHandle}):
Top posts:
${sponsorTopPosts.map((p: any) => `"${p.caption?.slice(0, 150)}" - ${p.likes || 0} likes [${p.type || "post"}]`).join("\n")}

MY ACCOUNT (@${me.handle}): ${me.postCount} posts, avg ${me.avgLikes} likes, avg ${me.avgComments} comments.

MY RECENT POSTS:
${recentPosts.map((p) => `[${p.type}] "${p.caption?.slice(0, 100)}" - ${p.likes} likes, ${p.comments} comments`).join("\n")}

Create a 2-day weekend content activation plan for @racquetsclubcommunity x @${sponsorHandle}. Include Friday teaser, Saturday content (2-3 slots), Sunday content (2-3 slots), and Monday recap.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("sponsor-planner", result);
    return NextResponse.json({ agent: "sponsor-planner", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
