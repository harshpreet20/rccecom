import { getSupabase } from "./supabase";

export type DiscountCheck = {
  valid: boolean;
  code?: string;
  type?: "percent" | "flat";
  value?: number;
  reason?: string;
};

/**
 * Validates a discount code against the shared RCC platform database via the
 * validate_discount_code() RPC -- never reads the discounts table directly,
 * so the anon key can't enumerate codes or usage counts.
 */
export async function checkDiscountCode(
  code: string,
  orderAmount: number,
): Promise<DiscountCheck> {
  const sb = getSupabase();
  const trimmed = code.trim();
  if (!sb || !trimmed) return { valid: false, reason: "not_found" };

  const { data, error } = await sb.rpc("validate_discount_code", {
    p_code: trimmed,
    p_order_amount: orderAmount,
  });
  if (error || !data || data.length === 0) {
    return { valid: false, reason: "not_found" };
  }
  const row = data[0];
  return {
    valid: !!row.valid,
    code: row.code,
    type: row.type,
    value: row.value,
    reason: row.reason ?? undefined,
  };
}

/** Marks a code as used after a successful order. Best-effort -- never blocks the order. */
export async function consumeDiscountCode(code: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.rpc("consume_discount_code", { p_code: code.trim() });
  } catch {
    // non-critical
  }
}
