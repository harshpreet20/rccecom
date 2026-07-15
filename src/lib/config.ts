/**
 * Store-wide configuration. Everything payment/merchant related is driven by
 * environment variables so RCC can change the UPI ID, contact number, etc.
 * without touching code. Sensible defaults are baked in for local dev.
 *
 * NEXT_PUBLIC_* vars are exposed to the browser (needed to render the QR).
 */

export const storeConfig = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Racquets Club Community",
  shortName: process.env.NEXT_PUBLIC_STORE_SHORT_NAME || "RCC",
  tagline:
    process.env.NEXT_PUBLIC_STORE_TAGLINE ||
    "Official merch for the RCC family. Wear the community.",

  /** Currency — UPI is India-only, so this is INR. */
  currency: "INR",
  currencySymbol: "₹",

  /**
   * Flat shipping fee (₹) added per order. Kept dynamic via env so RCC can
   * change it any time (set NEXT_PUBLIC_SHIPPING_FEE, or 0 for free shipping).
   */
  shippingFee: Number(process.env.NEXT_PUBLIC_SHIPPING_FEE ?? "80") || 0,

  /** GST rate (%) applied to the item subtotal. Set NEXT_PUBLIC_GST_PERCENT. */
  taxRatePct: Number(process.env.NEXT_PUBLIC_GST_PERCENT ?? "5") || 0,

  /** UPI Virtual Payment Address the QR pays into (e.g. 9650086006@ybl). */
  upiId: process.env.NEXT_PUBLIC_UPI_ID || "9650086006@ybl",
  /** Name shown to the payer inside their UPI app. */
  upiPayeeName:
    process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "Racquets Club Community",

  /** WhatsApp number (with country code, digits only) orders are sent to. */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919650086006",

  /** Support email shown in the footer. */
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "racquetsclubcommunity@gmail.com",

  /** Canonical public URL of the store (for SEO metadata, sitemap, JSON-LD). */
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL || "https://store.racquetsclubcommunity.com"
  ).replace(/\/$/, ""),

  /** Instagram handle for brand social links. */
  instagram: "racquetsclubcommunity",
} as const;

/** True when a customer can pay — a UPI ID is configured. */
export const isPaymentConfigured = Boolean(storeConfig.upiId);
