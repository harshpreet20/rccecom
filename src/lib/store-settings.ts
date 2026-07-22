import { getSupabase } from "./supabase";
import { storeConfig } from "./config";

export type StoreSettings = {
  taxRatePct: number;
  shippingFee: number;
  freeShippingThreshold: number | null;
};

const fallback: StoreSettings = {
  taxRatePct: storeConfig.taxRatePct,
  shippingFee: storeConfig.shippingFee,
  freeShippingThreshold: null,
};

/**
 * Shipping/tax config managed from the RCC CRM (store_settings table).
 * Falls back to the env-var defaults in config.ts if Supabase isn't
 * configured or the row can't be read.
 */
export async function fetchStoreSettings(): Promise<StoreSettings> {
  const sb = getSupabase();
  if (!sb) return fallback;
  const { data, error } = await sb
    .from("store_settings")
    .select("tax_rate_pct, shipping_flat_rate, free_shipping_threshold")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return fallback;
  return {
    taxRatePct: data.tax_rate_pct ?? fallback.taxRatePct,
    shippingFee: data.shipping_flat_rate ?? fallback.shippingFee,
    freeShippingThreshold: data.free_shipping_threshold ?? null,
  };
}
