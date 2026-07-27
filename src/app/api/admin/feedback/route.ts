import { NextResponse } from "next/server";
import { saveFeedback } from "@/lib/admin/micro-intel";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { reportId, agentName, rating } = body;

  if (!reportId || !agentName || typeof rating !== "number" || ![1, -1].includes(rating)) {
    return NextResponse.json(
      { error: "reportId, agentName, and rating (1 or -1) are required" },
      { status: 400 }
    );
  }

  try {
    await saveFeedback(reportId, agentName, rating);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
