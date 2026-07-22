import { NextResponse } from "next/server";
import { checkDiscountCode } from "@/lib/discounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/discounts/validate — checks a coupon code against the CRM's discounts table. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, orderAmount } = (body as { code?: string; orderAmount?: number }) || {};
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const result = await checkDiscountCode(code, Number(orderAmount) || 0);
  return NextResponse.json(result);
}
