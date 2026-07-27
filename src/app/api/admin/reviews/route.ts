import { NextResponse } from "next/server";
import { scrapeTrustpilot, scrapeGoogleReviews, getStoredReviews } from "@/lib/admin/reviews";
import { createAdminClient } from "@/lib/admin/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || undefined;

  try {
    const reviews = await getStoredReviews(source);

    const ratings = reviews.map((r: any) => r.rating).filter((r: number) => r > 0);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length) * 10) / 10
      : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      if (r >= 1 && r <= 5) distribution[r]++;
    }

    return NextResponse.json({
      reviews,
      summary: { total: reviews.length, avgRating, distribution },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    if (source && source !== "trustpilot" && source !== "google") {
      return NextResponse.json({ error: "Invalid source. Use 'trustpilot' or 'google'." }, { status: 400 });
    }

    const result = source === "google"
      ? await scrapeGoogleReviews()
      : await scrapeTrustpilot();

    return NextResponse.json({
      success: true,
      source,
      ...result.summary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
