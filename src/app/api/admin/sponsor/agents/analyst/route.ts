import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport, createAdminClient } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

export const maxDuration = 180;

const BASE_SYSTEM = `You are the SPONSOR ANALYST agent. Analyze both @racquetsclubcommunity and a sponsor brand account to assess partnership fit.

Report on:
- Audience overlap potential
- Engagement compatibility
- Content style alignment
- Recommended content types for co-branded posts
- Expected reach multiplier from cross-promotion
- Risk factors

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Sponsor Partnership Analysis"
- A "Partnership Compatibility Score" box at the top with a large score (out of 100) and a brief verdict
- A side-by-side comparison section showing key metrics for both accounts (posts, avg likes, engagement style)
- An "Audience Overlap Potential" section with analysis
- An "Engagement Compatibility" section comparing engagement patterns
- A "Content Style Alignment" section with observations
- A "Recommended Co-Branded Content Types" section with specific suggestions
- An "Expected Reach Multiplier" section with projected numbers
- A "Risk Factors" section with amber (#F59E0B) accented warnings
- A "Recommendations" section with numbered action items using green (#10B981) accents
- Use green (#10B981) as the primary accent for positive indicators, amber (#F59E0B) for warnings
- Clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write in friendly, conversational English, explain data insights in plain language
- Be specific with numbers, don't say "good fit", say "23 avg likes vs their 150 avg likes - 6.5x reach potential"

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
    getLearnings("sponsor-analyst"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const sponsorPosts = sponsor.posts || [];
  const sponsorTotalLikes = sponsorPosts.reduce((s: number, p: any) => s + (p.likes || 0), 0);
  const sponsorTotalComments = sponsorPosts.reduce((s: number, p: any) => s + (p.comments || 0), 0);
  const sponsorAvgLikes = sponsorPosts.length ? Math.round(sponsorTotalLikes / sponsorPosts.length) : 0;
  const sponsorAvgComments = sponsorPosts.length ? Math.round(sponsorTotalComments / sponsorPosts.length) : 0;
  const sponsorTopPost = [...sponsorPosts].sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))[0] || null;

  const sponsorPostTypes = sponsorPosts.reduce((acc: Record<string, number>, p: any) => {
    const type = p.type || "post";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const context = `SPONSOR BRAND (@${sponsorHandle}):
- ${sponsorPosts.length} posts, ${sponsorTotalLikes} total likes, ${sponsorTotalComments} total comments
- Average: ${sponsorAvgLikes} likes, ${sponsorAvgComments} comments per post
- Content mix: ${Object.entries(sponsorPostTypes).map(([type, count]) => `${type}: ${count}`).join(", ")}
- Top post: "${sponsorTopPost?.caption?.slice(0, 100) || "N/A"}" (${sponsorTopPost?.likes || 0} likes)

MY ACCOUNT (@${me.handle}):
- ${me.postCount} posts, ${me.totalLikes} total likes, ${me.totalComments} total comments, ${me.totalViews} total views
- Average: ${me.avgLikes} likes, ${me.avgComments} comments per post
- Engagement rate: ${me.engagementRate}%
- Top post: "${me.topPost?.caption?.slice(0, 100)}" (${me.topPost?.likes} likes)

COMPETITORS (for context):
${competitors.map((c) => `@${c.handle}: ${c.postCount} posts, avg ${c.avgLikes} likes. Top: "${c.topPost?.caption?.slice(0, 100)}" (${c.topPost?.likes} likes)`).join("\n")}

Analyze the partnership fit between @racquetsclubcommunity and @${sponsorHandle}. Provide a compatibility score, detailed analysis, and actionable recommendations.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("sponsor-analyst", result);
    return NextResponse.json({ agent: "sponsor-analyst", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
