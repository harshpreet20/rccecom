import { storeConfig } from "./config";
import { formatMoney, describeCustom } from "./format";
import type { OrderPayload } from "./types";

/**
 * Build a wa.me link with a pre-filled order summary so the customer can send
 * their order + UPI reference straight to RCC on WhatsApp. This is the
 * always-available record of the order (works even without Supabase).
 */
export function buildWhatsappOrderUrl(order: OrderPayload): string {
  const lines: string[] = [];
  lines.push(`*New RCC order · ${order.orderRef}*`);
  lines.push("");
  for (const l of order.items) {
    const size = l.size ? ` (${l.size})` : "";
    lines.push(`• ${l.qty} × ${l.name}${size} — ${formatMoney(l.qty * l.price)}`);
    const custom = describeCustom(l.custom);
    if (custom) lines.push(`   ↳ ${custom}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${formatMoney(order.subtotal)}`);
  if (order.tax > 0)
    lines.push(`GST (${order.taxRatePct}%): ${formatMoney(order.tax)}`);
  lines.push(
    `Shipping: ${order.shipping > 0 ? formatMoney(order.shipping) : "Free"}`,
  );
  if (order.discount && order.discount > 0)
    lines.push(`Discount (${order.discountCode}): -${formatMoney(order.discount)}`);
  lines.push(`*Total: ${formatMoney(order.amount)}*`);
  if (order.upiTxnRef) lines.push(`UPI Ref / UTR: ${order.upiTxnRef}`);
  lines.push("");
  lines.push(`*Deliver to*`);
  lines.push(order.customer.name);
  lines.push(order.customer.phone);
  if (order.customer.email) lines.push(order.customer.email);
  lines.push(order.customer.address);
  if (order.customer.notes) lines.push(`Notes: ${order.customer.notes}`);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${storeConfig.whatsappNumber}?text=${text}`;
}

/**
 * Build a wa.me link pre-filled with a handoff summary, for the AI assistant
 * escalating a chat to a human (src/lib/assistant/escalation.ts). Same
 * number + wa.me shape as buildWhatsappOrderUrl above, just without an order
 * payload -- used when there's a conversation to hand off rather than a
 * completed order to confirm.
 */
export function buildWhatsappSupportUrl(summary: string, sessionRef?: string): string {
  const lines: string[] = [];
  lines.push(`*RCC store assistant handoff*`);
  if (sessionRef) lines.push(`Session: ${sessionRef}`);
  lines.push("");
  lines.push(summary);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${storeConfig.whatsappNumber}?text=${text}`;
}
