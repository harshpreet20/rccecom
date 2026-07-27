import { NextResponse } from "next/server";
import { buildBrainContext } from "@/lib/admin/brain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const brain = await buildBrainContext(true);
    if (!brain) {
      return NextResponse.json(
        { error: "Could not generate brain context — check data and API key" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      generatedAt: brain.generatedAt,
      briefLength: brain.brief.length,
      competitors: brain.competitors.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { createAdminClient } = await import("@/lib/admin/supabase-server");
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("analytics")
      .select("data, fetched_at")
      .eq("metric_type", "brain_context")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return NextResponse.json({ exists: false, message: "No brain context yet. POST to generate." });
    }

    const age = Date.now() - new Date(data.fetched_at).getTime();
    const hours = Math.round(age / (1000 * 60 * 60) * 10) / 10;

    return NextResponse.json({
      exists: true,
      generatedAt: data.fetched_at,
      ageHours: hours,
      brief: (data.data as any)?.brief?.slice(0, 200) + "...",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
