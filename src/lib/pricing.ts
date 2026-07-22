import { storeConfig } from "./config";
import type { StoreSettings } from "./store-settings";

export type PriceBreakdown = {
  subtotal: number;
  taxRatePct: number;
  tax: number;
  shipping: number;
  discount: number;
  discountCode: string | null;
  total: number;
};

export type AppliedDiscount = {
  code: string;
  type: "percent" | "flat";
  value: number;
};

/**
 * Single source of truth for order totals — used by the checkout UI, the UPI
 * QR amount, the WhatsApp summary, and the server order API, so every surface
 * agrees on the exact rupee amount the customer is charged.
 *
 * `settings` (tax rate, shipping fee, free-shipping threshold) comes from the
 * RCC CRM's store_settings table when available -- see fetchStoreSettings().
 * Falls back to the env-var config when omitted (e.g. settings fetch failed).
 */
export function priceOrder(
  items: { price: number; qty: number; kind?: string }[],
  opts?: { settings?: StoreSettings; discount?: AppliedDiscount | null },
): PriceBreakdown {
  const subtotal = items.reduce((n, l) => n + l.price * l.qty, 0);

  const settings = opts?.settings ?? {
    taxRatePct: storeConfig.taxRatePct,
    shippingFee: storeConfig.shippingFee,
    freeShippingThreshold: null,
  };

  const taxRatePct = settings.taxRatePct;
  const tax = Math.round((subtotal * taxRatePct) / 100);

  // Shipping applies only when the cart contains a physical item — a
  // memberships-only order isn't shipped.
  const hasPhysical = items.some((l) => l.kind !== "membership");
  const freeShipping =
    settings.freeShippingThreshold != null &&
    subtotal >= settings.freeShippingThreshold;
  const shipping = subtotal > 0 && hasPhysical && !freeShipping ? settings.shippingFee : 0;

  let discount = 0;
  const discountCode = opts?.discount?.code ?? null;
  if (opts?.discount) {
    discount =
      opts.discount.type === "percent"
        ? Math.round((subtotal * opts.discount.value) / 100)
        : opts.discount.value;
    discount = Math.max(0, Math.min(discount, subtotal));
  }

  const total = Math.max(0, subtotal + tax + shipping - discount);
  return { subtotal, taxRatePct, tax, shipping, discount, discountCode, total };
}
