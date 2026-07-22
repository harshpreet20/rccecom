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
  images: string[] | null;
  videos: string[] | null;
  stock: number | null;
  sold_out: boolean | null;
  badge: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  kind: string | null;
  amazon_url: string | null;
  flipkart_url: string | null;
  size_chart_slugs: string[] | null;
};

function mapRow(r: Row): Product {
  const images = r.images?.length ? r.images : undefined;
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
    // images[0] is the CRM's cover photo; fall back to the legacy single
    // `image` column for rows saved before the gallery existed.
    image: images?.[0] ?? r.image ?? undefined,
    images,
    videos: r.videos?.length ? r.videos : undefined,
    stock: r.stock,
    // A tracked, exhausted stock count means "unavailable" even if staff
    // never flipped the separate sold_out toggle.
    soldOut: (r.sold_out ?? false) || (r.stock != null && r.stock <= 0),
    badge: r.badge ?? undefined,
    kind: r.kind === "membership" ? "membership" : "physical",
    amazonUrl: r.amazon_url ?? undefined,
    flipkartUrl: r.flipkart_url ?? undefined,
    seoTitle: r.seo_title ?? undefined,
    seoDescription: r.seo_description ?? undefined,
    seoKeywords: r.seo_keywords?.length ? r.seo_keywords : undefined,
    sizeChartSlugs: r.size_chart_slugs?.length ? r.size_chart_slugs : undefined,
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
