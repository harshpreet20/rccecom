import { storeConfig } from "./config";

/**
 * Build a UPI deep-link URI per the NPCI UPI Linking spec. Any UPI app
 * (GPay, PhonePe, Paytm, BHIM...) can open this or scan it as a QR code.
 *
 * Spec: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 */
export function buildUpiUri(params: {
  amount: number;
  note?: string;
  /** Merchant transaction reference — helps RCC reconcile the payment. */
  txnRef?: string;
}): string {
  const { amount, note, txnRef } = params;

  const query = new URLSearchParams();
  query.set("pa", storeConfig.upiId);
  query.set("pn", storeConfig.upiPayeeName);
  // UPI expects amount with 2 decimals, no currency symbol.
  query.set("am", amount.toFixed(2));
  query.set("cu", storeConfig.currency);
  if (note) query.set("tn", note.slice(0, 80));
  if (txnRef) query.set("tr", txnRef);

  // URLSearchParams encodes spaces as "+"; UPI apps expect %20.
  return `upi://pay?${query.toString().replace(/\+/g, "%20")}`;
}

/** Short human-friendly order reference, e.g. RCC-7F3K9A. */
export function generateOrderRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${storeConfig.shortName.toUpperCase()}-${ref}`;
}
