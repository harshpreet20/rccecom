import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { createAdminClient } from "@/lib/admin/supabase-server";
import { startReviewScrapes } from "@/lib/admin/reviews";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_COMPETITORS = "wtfpuneet,badmintonclubx,shuttlify,delhibadmintonclub,badmintonclubofindia,eastdelhisportsclub,kanikaaaa108,vibewithkanika_";
const MY_HANDLE = process.env.INSTAGRAM_HANDLE || "racquetsclubcommunity";
const COMPETITORS = (process.env.COMPETITOR_HANDLES || DEFAULT_COMPETITORS)
  .split(",")
  .filter(Boolean);
const ALL_HANDLES = [MY_HANDLE, ...COMPETITORS];

async function startScrape() {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });

  const input = {
    directUrls: ALL_HANDLES.map((h) => `https://www.instagram.com/${h}/`),
    resultsType: "posts",
    resultsLimit: 30,
    searchType: "hashtag",
    searchLimit: 1,
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://content-agent-gamma.vercel.app";
  const run = await client.actor("apify/instagram-scraper").start(input, {
    webhooks: [{
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      requestUrl: `${baseUrl}/api/scrape-status?collect=true`,
    }],
  });

  const supabase = createAdminClient();
  await supabase.from("scrape_runs").upsert(
    {
      id: "latest",
      run_id: run.id,
      dataset_id: run.defaultDatasetId,
      status: "RUNNING",
      started_at: new Date().toISOString(),
      handles: ALL_HANDLES,
    },
    { onConflict: "id" }
  );

  let reviewRuns = null;
  try {
    reviewRuns = await startReviewScrapes();
  } catch {
    // review scraping is non-critical; IG scrape still proceeds
  }

  return {
    success: true,
    status: "RUNNING",
    runId: run.id,
    reviewRuns,
    message: `Scraping ${ALL_HANDLES.length} handles + reviews — check back in a few minutes`,
  };
}

async function collectResults(runId: string, datasetId: string) {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });
  const { items } = await client.dataset(datasetId).listItems();

  const grouped: Record<string, any[]> = {};
  for (const handle of ALL_HANDLES) {
    grouped[handle] = [];
  }

  for (const item of items) {
    const owner =
      (item as any).ownerUsername ||
      (item as any).owner?.username ||
      (item as any).profileName ||
      "unknown";
    const normalizedOwner = owner.toLowerCase().replace(/^@/, "");

    const matchedHandle = ALL_HANDLES.find(
      (h) => h.toLowerCase() === normalizedOwner
    );

    const post = {
      id: (item as any).id || (item as any).shortCode,
      shortCode: (item as any).shortCode,
      caption: (item as any).caption || "",
      likes: (item as any).likesCount || (item as any).likes || 0,
      comments: (item as any).commentsCount || (item as any).comments || 0,
      views: (item as any).videoViewCount || (item as any).views || 0,
      timestamp: (item as any).timestamp || (item as any).takenAtTimestamp,
      type: (item as any).type || "unknown",
      url:
        (item as any).url ||
        `https://www.instagram.com/p/${(item as any).shortCode}/`,
      hashtags: (item as any).hashtags || [],
      ownerUsername: normalizedOwner,
    };

    if (matchedHandle) {
      grouped[matchedHandle].push(post);
    } else {
      if (!grouped["_other"]) grouped["_other"] = [];
      grouped["_other"].push(post);
    }
  }

  const output = {
    scrapedAt: new Date().toISOString(),
    myHandle: MY_HANDLE,
    competitors: COMPETITORS,
    profiles: grouped,
    totalPosts: items.length,
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from("scrapes").insert({
    my_handle: MY_HANDLE,
    competitors: COMPETITORS,
    data: output,
  });

  if (error) throw new Error(`Supabase save failed: ${error.message}`);

  await supabase.from("scrape_runs").upsert(
    { id: "latest", status: "SUCCEEDED", finished_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  return {
    success: true,
    status: "SUCCEEDED",
    totalPosts: items.length,
    handles: ALL_HANDLES,
    scrapedAt: output.scrapedAt,
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await startScrape();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await startScrape();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
