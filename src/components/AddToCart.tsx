"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

/**
 * Size picker + personalization fields (when needed) + add-to-cart button.
 * Used on both the card and the product page — `compact` tightens it for the
 * grid and hides personalization (that's offered on the product page).
 */
export function AddToCart({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { add } = useCart();
  const [size, setSize] = useState<string | undefined>(product.sizes?.[0]);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>("");

  const showPersonalization = !compact && product.personalization;

  if (product.soldOut) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-full bg-rcc-green/10 px-4 py-2.5 text-sm font-bold text-rcc-green/50"
      >
        Sold out
      </button>
    );
  }

  function handleAdd() {
    if (product.sizes && !size) {
      setError("Pick a size first.");
      return;
    }
    // Only keep non-empty personalization values.
    const cleanCustom: Record<string, string> = {};
    if (product.personalization) {
      for (const f of product.personalization) {
        const v = (custom[f.key] || "").trim();
        if (f.required && !v) {
          setError(`Please fill in "${f.label}".`);
          return;
        }
        if (v) cleanCustom[f.key] = v;
      }
    }
    setError("");
    add({
      slug: product.slug,
      name: product.name,
      price: product.price,
      qty: 1,
      size,
      custom: Object.keys(cleanCustom).length ? cleanCustom : undefined,
      emoji: product.emoji,
      accent: product.accent,
    });
  }

  return (
    <div className="space-y-3">
      {product.sizes && (
        <div>
          {!compact && (
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-rcc-green/60">
              Size
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSize(s);
                  setError("");
                }}
                className={`min-w-9 rounded-md border px-2 py-1 text-xs font-bold transition ${
                  size === s
                    ? "border-rcc-green bg-rcc-green text-rcc-sand"
                    : "border-rcc-green/25 bg-white text-rcc-green hover:border-rcc-green"
                }`}
                aria-pressed={size === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPersonalization && (
        <div className="rounded-xl bg-rcc-green/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rcc-green/60">
            Personalise (optional)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {product.personalization!.map((f) => (
              <label key={f.key} className="text-xs font-semibold text-rcc-green">
                {f.label}
                <input
                  value={custom[f.key] || ""}
                  inputMode={f.kind === "number" ? "numeric" : "text"}
                  maxLength={f.maxLength}
                  placeholder={f.placeholder}
                  onChange={(e) => {
                    let v = e.target.value;
                    if (f.kind === "number") v = v.replace(/\D/g, "");
                    v = v.slice(0, f.maxLength);
                    setCustom((c) => ({ ...c, [f.key]: v }));
                  }}
                  className="mt-1 w-full rounded-md border border-rcc-green/20 bg-white px-2 py-1.5 text-sm uppercase text-rcc-ink outline-none focus:border-rcc-leaf focus:ring-2 focus:ring-rcc-leaf/30"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold text-rcc-clay">{error}</p>
      )}

      <button
        onClick={handleAdd}
        className={`w-full rounded-full bg-rcc-green px-4 font-bold text-rcc-sand transition hover:bg-rcc-leaf active:scale-[0.98] ${
          compact ? "py-2.5 text-sm" : "py-3"
        }`}
      >
        Add to cart
      </button>
    </div>
  );
}
