import { NextResponse } from "next/server";
import { authedClient, getBearer } from "@/lib/admin/supabase-authed";

export const dynamic = "force-dynamic";

/** GET /api/store/customers — customer list derived from order history (staff only). */
export async function GET(request: Request) {
  const token = getBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = authedClient(token);
  const { data, error } = await supabase
    .from("customers_view")
    .select("*")
    .order("last_order_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ customers: data || [] });
}
