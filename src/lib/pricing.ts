import { storeConfig } from "./config";

export type PriceBreakdown = {
  subtotal: number;
  taxRatePct: number;
  tax: number;
  shipping: number;
  total: number;
};

/**
 * Single source of truth for order totals — used by the checkout UI, the UPI
 * QR amount, the WhatsApp summary, and the server order API, so every surface
 * agrees on the exact rupee amount the customer is charged.
 */
export function priceOrder(
  items: { price: number; qty: number }[],
): PriceBreakdown {
  const subtotal = items.reduce((n, l) => n + l.price * l.qty, 0);
  const taxRatePct = storeConfig.taxRatePct;
  const tax = Math.round((subtotal * taxRatePct) / 100);
  const shipping = subtotal > 0 ? storeConfig.shippingFee : 0;
  const total = subtotal + tax + shipping;
  return { subtotal, taxRatePct, tax, shipping, total };
}
