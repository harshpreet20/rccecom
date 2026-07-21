import { getSupabase } from "./supabase";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

/** Active categories managed from the RCC CRM, for storefront browse/filter. */
export async function fetchCategories(): Promise<Category[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as Category[];
}
