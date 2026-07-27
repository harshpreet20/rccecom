import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { collectTrustpilotResults, collectGoogleResults } from "@/lib/admin/reviews";
import { buildBrainContext } from "@/lib/admin/brain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const secret = process.env.APIFY_WEBHOOK_SECRET;

  if (!secret || searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!source || (source !== "trustpilot" && source !== "google")) {
    return NextResponse.json({ error: "Missing or invalid source param" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const runId = body?.resource?.id || body?.eventData?.actorRunId;

    if (!runId) {
      return NextResponse.json({ error: "No run ID in webhook payload" }, { status: 400 });
    }

    const result = source === "trustpilot"
      ? await collectTrustpilotResults(runId)
      : await collectGoogleResults(runId);

    // Auto-regenerate brain context with new review data (in-process --
    // see scrape-status route for why this isn't an HTTP self-fetch).
    buildBrainContext(true).catch(() => {});

    return NextResponse.json({ success: true, source, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
