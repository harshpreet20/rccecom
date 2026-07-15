import { getSupabase } from "./supabase";
import { products as fallbackProducts, type Product } from "./products";

/**
 * Live catalogue, read from the shared RCC platform database (products managed
 * in the CRM). Falls back to the built-in list when Supabase isn't configured
 * or returns nothing, so the store always renders.
 *
 * RLS lets the public anon key read only `active = true` products.
 */

type Row = {
  slug: string;
  name: string;
  blurb: string | null;
  description: string | null;
  price: number;
  category: string | null;
  sizes: string[] | null;
  personalization: Product["personalization"] | null;
  highlights: string[] | null;
  accent: string | null;
  emoji: string | null;
  image: string | null;
  sold_out: boolean | null;
  badge: string | null;
};

function mapRow(r: Row): Product {
  return {
    slug: r.slug,
    name: r.name,
    blurb: r.blurb ?? "",
    description: r.description ?? "",
    highlights: r.highlights?.length ? r.highlights : undefined,
    price: r.price,
    category: r.category ?? "Merch",
    sizes: r.sizes?.length ? r.sizes : undefined,
    personalization: r.personalization?.length ? r.personalization : undefined,
    accent: r.accent ?? "#0e5a62",
    emoji: r.emoji ?? "🎾",
    image: r.image ?? undefined,
    soldOut: r.sold_out ?? false,
    badge: r.badge ?? undefined,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const sb = getSupabase();
  if (!sb) return fallbackProducts;
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return fallbackProducts;
  return (data as Row[]).map(mapRow);
}

export async function fetchProduct(slug: string): Promise<Product | undefined> {
  const sb = getSupabase();
  if (!sb) return fallbackProducts.find((p) => p.slug === slug);
  const { data } = await sb
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data
    ? mapRow(data as Row)
    : fallbackProducts.find((p) => p.slug === slug);
}
