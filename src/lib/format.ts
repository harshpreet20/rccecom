import { storeConfig } from "./config";

/** Format a paise-free rupee amount as ₹1,299. */
export function formatMoney(amount: number): string {
  return `${storeConfig.currencySymbol}${amount.toLocaleString("en-IN")}`;
}

/** Render personalization as "HARSHITA · #88" for display / messages. */
export function describeCustom(custom?: Record<string, string>): string {
  if (!custom) return "";
  const parts: string[] = [];
  if (custom.name) parts.push(custom.name);
  if (custom.number) parts.push(`#${custom.number}`);
  // Include any other fields generically.
  for (const [k, v] of Object.entries(custom)) {
    if (k !== "name" && k !== "number" && v) parts.push(`${k}: ${v}`);
  }
  return parts.join(" · ");
}
