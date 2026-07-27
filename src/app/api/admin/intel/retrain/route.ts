import { NextResponse } from "next/server";
import { retrain, getLearnings } from "@/lib/admin/micro-intel";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { agentName } = body;

  if (!agentName) {
    return NextResponse.json(
      { error: "agentName is required" },
      { status: 400 }
    );
  }

  try {
    await retrain(agentName);
    const learnings = await getLearnings(agentName);
    return NextResponse.json({ success: true, agentName, learnings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
