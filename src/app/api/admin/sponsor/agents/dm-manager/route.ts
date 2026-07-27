import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport, createAdminClient } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";
import { requireAdmin } from "@/lib/admin/require-admin";

export const maxDuration = 180;

const BASE_SYSTEM = `You are the SPONSOR DM MANAGER agent. Create 5 DM templates for sponsor outreach and engagement between @racquetsclubcommunity and a sponsor brand.

The 5 scenarios:
1. Initial outreach/pitch to sponsor brand - introducing @racquetsclubcommunity and proposing a partnership
2. Follow-up after no reply - polite nudge with added value
3. Negotiating terms/deliverables - discussing content deliverables, timelines, and expectations
4. Post-activation thank you + results sharing - sharing metrics and expressing gratitude
5. Re-engagement for future partnerships - reaching out again for ongoing collaboration

Be professional but warm. Include placeholders like [Brand Name], [Deliverable], [Date], [Metric], [Results Link].

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Sponsor DM Templates"
- A brief intro paragraph about the outreach strategy and brand voice
- For each of the 5 templates, a styled card with:
  - Scenario name as a bold header with the scenario number
  - A "TONE" badge (Professional/Friendly/Warm/Confident/Collaborative) with blue (#3B82F6) colored background and white text
  - The actual DM template in a styled quote block with a light blue (#EFF6FF) background
  - A "WHEN TO SEND" line explaining the timing and context
  - A "PRO TIP" line in small italic text with advice on personalizing the message
- Use blue (#3B82F6) as the primary accent, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write templates that feel personal and genuine, not corporate or spammy
- Include specific references to the sponsor brand's content where relevant

CRITICAL FORMAT RULES:
- Output ONLY raw HTML. No markdown, no code fences, no backticks, no text before or after the HTML.
- Never use em dashes or en dashes. Use " - " (space hyphen space) instead.
- Your entire response must start with < and end with >. Nothing else.`;

export async function POST(request: Request) {
  const auth = await requireAdmin(request, ["admin", "content"]);
  if (!auth.ok) return auth.response;

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
    getLearnings("sponsor-dm-manager"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const sponsorPosts = sponsor.posts || [];
  const sponsorAvgLikes = sponsorPosts.length
    ? Math.round(sponsorPosts.reduce((s: number, p: any) => s + (p.likes || 0), 0) / sponsorPosts.length)
    : 0;
  const sponsorTopPost = [...sponsorPosts].sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))[0] || null;

  const context = `SPONSOR BRAND (@${sponsorHandle}):
- ${sponsorPosts.length} posts, avg ${sponsorAvgLikes} likes
- Top post: "${sponsorTopPost?.caption?.slice(0, 100) || "N/A"}" (${sponsorTopPost?.likes || 0} likes)
- Recent captions:
${sponsorPosts.slice(0, 5).map((p: any) => `"${p.caption?.slice(0, 80)}"`).join("\n")}

MY ACCOUNT (@${me.handle}): A badminton/racquet sports community.
- ${me.postCount} posts, avg ${me.avgLikes} likes
- Content style based on recent captions:
${me.posts.slice(0, 5).map((p) => `"${p.caption?.slice(0, 80)}"`).join("\n")}

Generate 5 DM templates for sponsor outreach and engagement with @${sponsorHandle}. Templates should reference the sponsor's content style and our community strengths.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("sponsor-dm-manager", result);
    return NextResponse.json({ agent: "sponsor-dm-manager", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
