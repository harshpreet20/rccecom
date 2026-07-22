import { getSupabase } from "./supabase";

export type SizeChartRow = {
  label: string;
  values: (number | string)[];
};

export type SizeChartData = {
  slug: string;
  name: string;
  sizes: string[];
  nominal: number[];
  rows: SizeChartRow[];
};

/** Active size charts, managed from the RCC CRM. */
export async function fetchSizeCharts(): Promise<SizeChartData[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("size_charts")
    .select("slug, name, sizes, nominal, rows")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as SizeChartData[];
}
