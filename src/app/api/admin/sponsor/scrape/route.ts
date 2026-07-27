import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { createAdminClient } from "@/lib/admin/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawHandle = (body.handle || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");

  if (!rawHandle) {
    return NextResponse.json({ error: "Missing sponsor handle" }, { status: 400 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) return NextResponse.json({ error: "Missing APIFY_API_TOKEN" }, { status: 500 });

  const supabase = createAdminClient();

  const { data: cached } = await supabase
    .from("sponsor_scrapes")
    .select("*")
    .eq("sponsor_handle", rawHandle)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single();

  if (cached && Date.now() - new Date(cached.scraped_at).getTime() < 24 * 60 * 60 * 1000) {
    return NextResponse.json({ sponsor: cached.data, handle: rawHandle, cached: true });
  }

  try {
    const client = new ApifyClient({ token: apifyToken });
    const run = await client.actor("apify/instagram-scraper").call(
      {
        directUrls: [`https://www.instagram.com/${rawHandle}/`],
        resultsType: "posts",
        resultsLimit: 30,
        searchType: "hashtag",
        searchLimit: 1,
      },
      { waitSecs: 120 }
    );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const posts = items.map((item: any) => ({
      id: item.id || item.shortCode,
      shortCode: item.shortCode,
      caption: item.caption || "",
      likes: item.likesCount || item.likes || 0,
      comments: item.commentsCount || item.comments || 0,
      views: item.videoViewCount || item.views || 0,
      timestamp: item.timestamp || item.takenAtTimestamp,
      type: item.type || "unknown",
      url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
      hashtags: item.hashtags || [],
      ownerUsername: rawHandle,
    }));

    const totalLikes = posts.reduce((s: number, p: any) => s + p.likes, 0);
    const totalComments = posts.reduce((s: number, p: any) => s + p.comments, 0);
    const totalViews = posts.reduce((s: number, p: any) => s + p.views, 0);
    const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
    const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;
    const topPost = posts.sort((a: any, b: any) => b.likes - a.likes)[0] || null;

    const sponsorData = {
      handle: rawHandle,
      postCount: posts.length,
      totalLikes,
      totalComments,
      totalViews,
      avgLikes,
      avgComments,
      topPost,
      posts,
      scrapedAt: new Date().toISOString(),
    };

    await supabase.from("sponsor_scrapes").insert({
      sponsor_handle: rawHandle,
      data: sponsorData,
    });

    return NextResponse.json({ sponsor: sponsorData, handle: rawHandle, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle")?.replace(/^@/, "") || "";

  if (!handle) return NextResponse.json({ error: "Missing handle param" }, { status: 400 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sponsor_scrapes")
    .select("*")
    .eq("sponsor_handle", handle)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ error: "No data for this sponsor. Scrape first." }, { status: 404 });

  return NextResponse.json({ sponsor: data.data, handle });
}
