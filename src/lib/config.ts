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
} as const;

/** True when a customer can pay — a UPI ID is configured. */
export const isPaymentConfigured = Boolean(storeConfig.upiId);
