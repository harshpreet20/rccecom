import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { collectTrustpilotResults, collectGoogleResults } from "@/lib/admin/reviews";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

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

    // Auto-regenerate brain context with new review data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://content-agent-gamma.vercel.app";
    fetch(`${baseUrl}/api/admin/brain`, { method: "POST" }).catch(() => {});

    return NextResponse.json({ success: true, source, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
