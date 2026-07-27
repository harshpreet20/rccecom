import { ApifyClient } from "apify-client";
import { createAdminClient } from "@/lib/admin/supabase-server";

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/racquetsclubcommunity.com";
const GOOGLE_MAPS_URL = process.env.GOOGLE_MAPS_URL || "";
const GOOGLE_SEARCH_QUERY = process.env.GOOGLE_BUSINESS_NAME || "Racquets Club Community RCC Badminton Community";

function buildGoogleScraperInput() {
  const input: Record<string, any> = {
    maxReviews: 100,
    reviewsSort: "newest",
    language: "en",
  };
  if (GOOGLE_MAPS_URL) {
    input.startUrls = [{ url: GOOGLE_MAPS_URL }];
  }
  input.searchStringsArray = [GOOGLE_SEARCH_QUERY];
  return input;
}

export async function startReviewScrapes() {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://content-agent-gamma.vercel.app";
  const webhookUrl = `${baseUrl}/api/review-webhook`;

  const [tpRun, gRun] = await Promise.all([
    client.actor("apify/trustpilot-scraper").start(
      { startUrls: [{ url: TRUSTPILOT_URL }], maxItems: 50 },
      { webhooks: [{ eventTypes: ["ACTOR.RUN.SUCCEEDED"], requestUrl: `${webhookUrl}?source=trustpilot` }] }
    ),
    client.actor("compass/google-maps-reviews-scraper").start(
      buildGoogleScraperInput(),
      { webhooks: [{ eventTypes: ["ACTOR.RUN.SUCCEEDED"], requestUrl: `${webhookUrl}?source=google` }] }
    ),
  ]);

  const supabase = createAdminClient();
  await supabase.from("scrape_runs").upsert(
    {
      id: "reviews_latest",
      run_id: tpRun.id,
      dataset_id: tpRun.defaultDatasetId,
      status: "RUNNING",
      started_at: new Date().toISOString(),
      handles: [`trustpilot:${tpRun.id}`, `google:${gRun.id}:${gRun.defaultDatasetId}`],
    },
    { onConflict: "id" }
  );

  return { trustpilotRunId: tpRun.id, googleRunId: gRun.id };
}

export async function collectTrustpilotResults(runId: string) {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });
  const run = await client.run(runId).get();
  if (!run || run.status !== "SUCCEEDED") return { collected: 0 };

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return saveTrustpilotReviews(items);
}

export async function collectGoogleResults(runId: string) {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });
  const run = await client.run(runId).get();
  if (!run || run.status !== "SUCCEEDED") return { collected: 0 };

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return saveGoogleReviews(items);
}

async function saveTrustpilotReviews(items: any[]) {
  const reviews = items.map((item: any) => ({
    reviewer_name: item.userName || item.consumer?.displayName || "Anonymous",
    rating: item.rating || item.stars || 0,
    title: item.title || item.heading || "",
    review_text: item.text || item.reviewBody || "",
    review_date: item.date || item.publishedDate || item.createdAt || "",
    data: {
      verified: item.isVerified || false,
      reply: item.reply || null,
      likes: item.likes || 0,
      language: item.language || "en",
    },
  }));

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("reviews")
    .select("review_text")
    .eq("source", "trustpilot");

  const existingTexts = new Set((existing || []).map((r: any) => r.review_text));
  const newReviews = reviews.filter((r) => r.review_text && !existingTexts.has(r.review_text));

  if (newReviews.length > 0) {
    await supabase.from("reviews").insert(
      newReviews.map((r) => ({ source: "trustpilot" as const, ...r }))
    );
  }

  return { collected: newReviews.length, total: reviews.length };
}

async function saveGoogleReviews(items: any[]) {
  const reviews = items.map((item: any) => ({
    reviewer_name: item.name || item.authorName || item.reviewer?.name || "Anonymous",
    rating: item.stars || item.rating || item.reviewRating || 0,
    title: "",
    review_text: item.text || item.reviewText || item.snippet || "",
    review_date: item.publishedAtDate || item.date || item.time || "",
    data: {
      reviewer_photo: item.reviewerPhotoUrl || item.authorPhoto || null,
      response: item.responseFromOwnerText || item.ownerResponse || null,
      likes: item.likesCount || 0,
      review_url: item.reviewUrl || null,
    },
  }));

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("reviews")
    .select("review_text")
    .eq("source", "google");

  const existingTexts = new Set((existing || []).map((r: any) => r.review_text));
  const newReviews = reviews.filter((r) => r.review_text && !existingTexts.has(r.review_text));

  if (newReviews.length > 0) {
    await supabase.from("reviews").insert(
      newReviews.map((r) => ({ source: "google" as const, ...r }))
    );
  }

  return { collected: newReviews.length, total: reviews.length };
}

interface TrustpilotReview {
  reviewer_name: string;
  rating: number;
  title: string;
  review_text: string;
  review_date: string;
  data: Record<string, any>;
}

interface GoogleReview {
  reviewer_name: string;
  rating: number;
  title: string;
  review_text: string;
  review_date: string;
  data: Record<string, any>;
}

export async function scrapeTrustpilot(): Promise<{
  reviews: TrustpilotReview[];
  summary: { total: number; avgRating: number; newCount: number };
}> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });

  const run = await client.actor("apify/trustpilot-scraper").call(
    { startUrls: [{ url: TRUSTPILOT_URL }], maxItems: 50 },
    { waitSecs: 120 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const result = await saveTrustpilotReviews(items);

  const reviews: TrustpilotReview[] = items.map((item: any) => ({
    reviewer_name: item.userName || item.consumer?.displayName || "Anonymous",
    rating: item.rating || item.stars || 0,
    title: item.title || item.heading || "",
    review_text: item.text || item.reviewBody || "",
    review_date: item.date || item.publishedDate || item.createdAt || "",
    data: {
      verified: item.isVerified || false,
      reply: item.reply || null,
      likes: item.likes || 0,
      language: item.language || "en",
    },
  }));

  const allRatings = reviews.map((r) => r.rating).filter((r) => r > 0);
  const avgRating = allRatings.length > 0
    ? Math.round((allRatings.reduce((s, r) => s + r, 0) / allRatings.length) * 10) / 10
    : 0;

  return {
    reviews,
    summary: { total: result.total, avgRating, newCount: result.collected },
  };
}

export async function scrapeGoogleReviews(): Promise<{
  reviews: GoogleReview[];
  summary: { total: number; avgRating: number; newCount: number };
}> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const client = new ApifyClient({ token: apifyToken });

  const run = await client.actor("compass/google-maps-reviews-scraper").call(
    buildGoogleScraperInput(),
    { waitSecs: 120 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const result = await saveGoogleReviews(items);

  const reviews: GoogleReview[] = items.map((item: any) => ({
    reviewer_name: item.name || item.authorName || item.reviewer?.name || "Anonymous",
    rating: item.stars || item.rating || item.reviewRating || 0,
    title: "",
    review_text: item.text || item.reviewText || item.snippet || "",
    review_date: item.publishedAtDate || item.date || item.time || "",
    data: {
      reviewer_photo: item.reviewerPhotoUrl || item.authorPhoto || null,
      response: item.responseFromOwnerText || item.ownerResponse || null,
      likes: item.likesCount || 0,
      review_url: item.reviewUrl || null,
    },
  }));

  const allRatings = reviews.map((r) => r.rating).filter((r) => r > 0);
  const avgRating = allRatings.length > 0
    ? Math.round((allRatings.reduce((s, r) => s + r, 0) / allRatings.length) * 10) / 10
    : 0;

  return {
    reviews,
    summary: { total: result.total, avgRating, newCount: result.collected },
  };
}

export async function pollAndCollectReviews(): Promise<{
  trustpilot: { collected: number } | null;
  google: { collected: number } | null;
}> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) throw new Error("Missing APIFY_API_TOKEN");

  const supabase = createAdminClient();
  const { data: runData } = await supabase
    .from("scrape_runs")
    .select("*")
    .eq("id", "reviews_latest")
    .single();

  if (!runData || runData.status === "SUCCEEDED") {
    return { trustpilot: null, google: null };
  }

  const client = new ApifyClient({ token: apifyToken });
  const handles = (runData.handles || []) as string[];

  let tpResult: { collected: number } | null = null;
  let gResult: { collected: number } | null = null;

  for (const h of handles) {
    if (h.startsWith("trustpilot:")) {
      const runId = h.split(":")[1];
      try {
        const run = await client.run(runId).get();
        if (run?.status === "SUCCEEDED") {
          tpResult = await collectTrustpilotResults(runId);
        }
      } catch { /* skip */ }
    } else if (h.startsWith("google:")) {
      const parts = h.split(":");
      const runId = parts[1];
      try {
        const run = await client.run(runId).get();
        if (run?.status === "SUCCEEDED") {
          gResult = await collectGoogleResults(runId);
        }
      } catch { /* skip */ }
    }
  }

  if (tpResult || gResult) {
    await supabase.from("scrape_runs").upsert(
      { id: "reviews_latest", status: "SUCCEEDED", finished_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  }

  return { trustpilot: tpResult, google: gResult };
}

export async function getStoredReviews(source?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("reviews")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(100);

  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
