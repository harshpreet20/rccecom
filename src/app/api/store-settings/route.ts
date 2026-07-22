import { NextResponse } from "next/server";
import { fetchStoreSettings } from "@/lib/store-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/store-settings — public read of the shipping/tax settings, for
 * displaying an accurate total before checkout. Not authoritative: the order
 * API route re-fetches this itself server-side when actually placing an order.
 */
export async function GET() {
  const settings = await fetchStoreSettings();
  return NextResponse.json({ settings });
}
