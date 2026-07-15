/** Shared types for the cart and orders. */

export type CartLine = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  /** Personalization values, e.g. { name: "HARSHITA", number: "88" }. */
  custom?: Record<string, string>;
  /** "physical" or "membership" — memberships aren't shipped. */
  kind?: "physical" | "membership";
  emoji: string;
  accent: string;
};

export type CustomerDetails = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
};

export type OrderPayload = {
  orderRef: string;
  items: CartLine[];
  subtotal: number;
  tax: number;
  taxRatePct: number;
  shipping: number;
  /** Grand total (subtotal + tax + shipping) — the amount the QR charges. */
  amount: number;
  customer: CustomerDetails;
  /** UPI transaction / reference number the customer entered after paying. */
  upiTxnRef?: string;
};
