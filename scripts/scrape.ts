import { ApifyClient } from "apify-client";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_TOKEN) {
  console.error("Missing APIFY_API_TOKEN in .env");
  process.exit(1);
}

const MY_HANDLE = process.env.INSTAGRAM_HANDLE || "racquetsclubcommunity";
const COMPETITORS = (process.env.COMPETITOR_HANDLES || "").split(",").filter(Boolean);
const ALL_HANDLES = [MY_HANDLE, ...COMPETITORS];

const client = new ApifyClient({ token: APIFY_TOKEN });

async function scrapeProfiles() {
  console.log(`Scraping ${ALL_HANDLES.length} profiles: ${ALL_HANDLES.join(", ")}`);

  const input = {
    directUrls: ALL_HANDLES.map((h) => `https://www.instagram.com/${h}/`),
    resultsType: "posts",
    resultsLimit: 30,
    searchType: "hashtag",
    searchLimit: 1,
  };

  console.log("Starting Apify Instagram scraper...");
  const run = await client.actor("apify/instagram-scraper").call(input, {
    waitSecs: 300,
  });

  console.log(`Run finished with status: ${run.status}`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`Got ${items.length} posts total`);

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
      url: (item as any).url || `https://www.instagram.com/p/${(item as any).shortCode}/`,
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

  const outDir = resolve(__dirname, "../dashboard/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "data.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Data saved to ${outPath}`);

  // Save to Supabase for production. Uses the service-role key (not the
  // anon key) since this is a server-side CLI script and the `scrapes`
  // table has RLS enabled with no anon insert policy.
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    const supabase = createClient(sbUrl, sbKey);
    const { error } = await supabase.from("scrapes").insert({
      my_handle: MY_HANDLE,
      competitors: COMPETITORS,
      data: output,
    });
    if (error) {
      console.error("Failed to save to Supabase:", error.message);
    } else {
      console.log("Data also saved to Supabase");
    }
  }

  // Quick summary
  for (const [handle, posts] of Object.entries(grouped)) {
    if (handle === "_other") continue;
    const totalLikes = posts.reduce((sum: number, p: any) => sum + p.likes, 0);
    const avgLikes = posts.length ? Math.round(totalLikes / posts.length) : 0;
    console.log(
      `  ${handle}: ${posts.length} posts, avg ${avgLikes} likes`
    );
  }
}

scrapeProfiles().catch((err) => {
  console.error("Scrape failed:", err.message);
  process.exit(1);
});
