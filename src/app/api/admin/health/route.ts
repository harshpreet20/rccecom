import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latency?: number; error?: string }> = {};

  // Check Supabase
  const sbStart = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("scrapes").select("id").limit(1);
    checks.database = error
      ? { status: "error", error: error.message, latency: Date.now() - sbStart }
      : { status: "ok", latency: Date.now() - sbStart };
  } catch (e: any) {
    checks.database = { status: "error", error: e.message, latency: Date.now() - sbStart };
  }

  // Check Anthropic API
  const aiStart = Date.now();
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    checks.anthropic = key
      ? { status: "ok", latency: Date.now() - aiStart }
      : { status: "error", error: "Missing ANTHROPIC_API_KEY" };
  } catch {
    checks.anthropic = { status: "error", latency: Date.now() - aiStart };
  }

  // Check Apify
  const apifyStart = Date.now();
  try {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      checks.scraper = { status: "error", error: "Missing APIFY_API_TOKEN" };
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("https://api.apify.com/v2/users/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      checks.scraper = res.ok
        ? { status: "ok", latency: Date.now() - apifyStart }
        : { status: "error", error: `Apify returned ${res.status}`, latency: Date.now() - apifyStart };
    }
  } catch (e: any) {
    checks.scraper = { status: "error", error: e.message, latency: Date.now() - apifyStart };
  }

  // Check latest scrape freshness
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("scrapes")
      .select("scraped_at")
      .order("scraped_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const age = Date.now() - new Date(data.scraped_at).getTime();
      const hours = Math.round(age / (1000 * 60 * 60));
      checks.data_freshness = hours <= 24
        ? { status: "ok" }
        : { status: "error", error: `Data is ${hours}h old` };
    } else {
      checks.data_freshness = { status: "error", error: "No scraped data" };
    }
  } catch {
    checks.data_freshness = { status: "error", error: "Could not check" };
  }

  // Check brain context — green if generated after last scrape, orange if regenerating/pending, red if missing
  try {
    const supabase = createAdminClient();

    const [brainRes, scrapeRes, statusRes] = await Promise.all([
      supabase
        .from("analytics")
        .select("fetched_at")
        .eq("metric_type", "brain_context")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("scrapes")
        .select("scraped_at")
        .order("scraped_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("analytics")
        .select("data")
        .eq("metric_type", "brain_status")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

    const isGenerating = (statusRes.data?.data as any)?.status === "generating";

    if (isGenerating) {
      checks.brain = { status: "error", error: "Regenerating" };
    } else if (!brainRes.data) {
      checks.brain = { status: "error", error: "Not generated yet" };
    } else if (!scrapeRes.data) {
      checks.brain = { status: "ok" };
    } else {
      const brainTime = new Date(brainRes.data.fetched_at).getTime();
      const scrapeTime = new Date(scrapeRes.data.scraped_at).getTime();
      checks.brain = brainTime >= scrapeTime
        ? { status: "ok" }
        : { status: "error", error: "New data available" };
    }
  } catch {
    checks.brain = { status: "error", error: "Could not check" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json({ healthy: allOk, checks });
}
