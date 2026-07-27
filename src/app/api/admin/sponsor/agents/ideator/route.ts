import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport, createAdminClient } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

export const maxDuration = 180;

const BASE_SYSTEM = `You are the SPONSOR IDEATOR agent. You create content ideas for a SPONSOR ACTIVATION between @racquetsclubcommunity and a sponsor brand.
Your job: generate 5 content ideas that naturally integrate the sponsor brand while keeping the badminton community engaged. Each idea must be classified into one of these categories:

- "AI REEL" - Can be fully created using AI video/image generation tools (Runway, Kling, Pika, Midjourney, Sora). Cinematic visuals, animations, 3D renders, motion graphics, stylized edits.
- "REAL" - Must be filmed manually. Real people on court, talking head, behind-the-scenes, tutorials, community events.
- "UGC" - User-generated content. Relies on community members submitting clips, reactions, challenges, or testimonials.

Ideas should feel authentic, not like ads. Include co-branded hooks that weave the sponsor naturally into badminton community content.

Output a clean, well-designed HTML report using inline styles. Use this structure:
- A heading for "Sponsor Activation - Content Ideas"
- A brief intro paragraph naming the sponsor and the activation strategy
- For each idea, a styled card with:
  - Numbered title
  - TWO badges side by side: format badge (Reel/Carousel/Story/Post) AND classification badge (AI REEL/REAL/UGC)
  - Use distinct badge colors: AI REEL = orange (#F97316), REAL = green (#10B981), UGC = blue (#3B82F6)
  - A one-line co-branded hook in italics
  - A "Why it works" paragraph (2-3 sentences) explaining how it integrates the sponsor authentically
- Use warm colors (#F59E0B amber, #EC4899 pink) for card accents, clean white cards with subtle borders
- Use simple inline CSS only (no external stylesheets, no style tags)
- Write in friendly, conversational English, no jargon, no JSON

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
    getLearnings("sponsor-ideator"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(BASE_SYSTEM, learnings), brain);

  const sponsorStats = {
    handle: sponsorHandle,
    posts: sponsor.posts?.length || 0,
    avgLikes: sponsor.posts?.length
      ? Math.round(sponsor.posts.reduce((s: number, p: any) => s + (p.likes || 0), 0) / sponsor.posts.length)
      : 0,
    topPost: sponsor.posts?.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))[0] || null,
  };

  const context = `SPONSOR BRAND (@${sponsorHandle}): ${sponsorStats.posts} posts, avg ${sponsorStats.avgLikes} likes.
Top post: "${sponsorStats.topPost?.caption?.slice(0, 100) || "N/A"}" (${sponsorStats.topPost?.likes || 0} likes)

MY ACCOUNT (@${me.handle}): ${me.postCount} posts, avg ${me.avgLikes} likes.
My top post: "${me.topPost?.caption?.slice(0, 100)}" (${me.topPost?.likes} likes)

COMPETITORS:
${competitors.map((c) => `@${c.handle}: ${c.postCount} posts, avg ${c.avgLikes} likes. Top: "${c.topPost?.caption?.slice(0, 100)}" (${c.topPost?.likes} likes)`).join("\n")}

Generate 5 sponsor activation content ideas for @racquetsclubcommunity x @${sponsorHandle}. Each idea should naturally integrate the sponsor brand while keeping the badminton community engaged. Classify each as AI REEL, REAL, or UGC.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("sponsor-ideator", result);
    return NextResponse.json({ agent: "sponsor-ideator", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
