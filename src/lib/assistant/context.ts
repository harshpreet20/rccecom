import { fetchProducts } from "@/lib/catalogue";
import { fetchStoreSettings } from "@/lib/store-settings";
import { checkDiscountCode } from "@/lib/discounts";
import { formatMoney } from "@/lib/format";
import { storeConfig } from "@/lib/config";
import {
  JERSEY_SIZES,
  JERSEY_NOMINAL,
  JERSEY_ROWS,
  SHORTS_SIZES,
  SHORTS_NOMINAL,
  SHORTS_ROWS,
} from "@/components/SizeChart";
import type { Product } from "@/lib/products";

/**
 * Read-only fact gathering for the product/policy specialist. Every string
 * built here comes from an actual catalogue/config/Supabase read -- nothing
 * here is model-generated -- so the specialist prompt can be told to only
 * state facts that appear in this block, never invent a price or a size.
 */

function describeProduct(p: Product): string {
  const bits = [
    `- ${p.name} (${p.slug}), ${formatMoney(p.price)}, category: ${p.category}`,
    p.soldOut ? "  SOLD OUT" : "  in stock",
  ];
  if (p.sizes?.length) bits.push(`  sizes: ${p.sizes.join(", ")}`);
  if (p.personalization?.length) {
    bits.push(`  personalization: ${p.personalization.map((f) => f.label).join(", ")}`);
  }
  if (p.blurb) bits.push(`  ${p.blurb}`);
  if (p.amazonUrl) bits.push(`  also on Amazon: ${p.amazonUrl}`);
  if (p.flipkartUrl) bits.push(`  also on Flipkart: ${p.flipkartUrl}`);
  return bits.join("\n");
}

function sizeChartText(): string {
  const jersey = JERSEY_ROWS.map(
    (row) =>
      `  ${row.label}: ` +
      JERSEY_SIZES.map((s, i) => `${s}=${row.values[i]}"`).join(", "),
  ).join("\n");
  const shorts = SHORTS_ROWS.map(
    (row) => `  ${row.label}: ` + SHORTS_SIZES.map((s, i) => `${s}=${row.values[i]}"`).join(", "),
  ).join("\n");
  return [
    `Jersey size chart (inches, nominal chest: ${JERSEY_SIZES.map((s, i) => `${s}=${JERSEY_NOMINAL[i]}`).join(", ")}):`,
    jersey,
    `Shorts size chart (inches, nominal waist: ${SHORTS_SIZES.map((s, i) => `${s}=${SHORTS_NOMINAL[i]}`).join(", ")}):`,
    shorts,
    "Tolerance is about ±0.5 inch. On the borderline between two sizes: smaller = tighter fit, larger = looser fit.",
  ].join("\n");
}

export type ShoppingContext = {
  catalogueText: string;
  shippingText: string;
  sizeChartText: string;
};

/** Assembles the full read-only shopping/policy context block for a specialist prompt. */
export async function buildShoppingContext(): Promise<ShoppingContext> {
  const [products, settings] = await Promise.all([fetchProducts(), fetchStoreSettings()]);

  const catalogueText = products.length
    ? products.map(describeProduct).join("\n")
    : "(catalogue temporarily unavailable)";

  const shippingBits = [
    `GST/tax rate: ${settings.taxRatePct}%`,
    `Flat shipping fee: ${settings.shippingFee > 0 ? formatMoney(settings.shippingFee) : "free"}`,
    settings.freeShippingThreshold != null
      ? `Free shipping on orders over ${formatMoney(settings.freeShippingThreshold)}`
      : "No free-shipping threshold currently configured",
    "Shipping only applies to physical merch -- membership items are not shipped.",
    "Payment method: UPI QR at checkout (GPay/PhonePe/Paytm/BHIM). Support/contact: " +
      storeConfig.supportEmail,
  ];

  return {
    catalogueText,
    shippingText: shippingBits.join("\n"),
    sizeChartText: sizeChartText(),
  };
}

export type DiscountFact =
  | { checked: true; valid: true; type: "percent" | "flat"; value: number; code: string }
  | { checked: true; valid: false; reason?: string }
  | { checked: false };

/** Validates a discount code mentioned by the customer, read-only, via the existing RPC-backed checker. */
export async function checkMentionedDiscount(code: string | null): Promise<DiscountFact> {
  if (!code) return { checked: false };
  const result = await checkDiscountCode(code, 0);
  if (result.valid && result.type && result.value != null) {
    return { checked: true, valid: true, type: result.type, value: result.value, code: result.code || code };
  }
  return { checked: true, valid: false, reason: result.reason };
}

/** Pulls a plausible discount-code token out of free text (letters/digits, 3-20 chars, all-caps or mixed). */
export function extractDiscountCode(text: string): string | null {
  const match = text.match(/\b(?:code|coupon)\s*[:\-]?\s*([A-Za-z0-9]{3,20})\b/i);
  return match ? match[1].toUpperCase() : null;
}
