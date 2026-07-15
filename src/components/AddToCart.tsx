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
        className="w-full cursor-not-allowed rounded-lg bg-rcc-panel2 px-4 py-2.5 text-sm font-bold text-rcc-mist/50"
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
      kind: product.kind,
      emoji: product.emoji,
      accent: product.accent,
    });
  }

  return (
    <div className="space-y-3">
      {product.sizes && (
        <div>
          {!compact && (
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-rcc-mist">
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
                    ? "border-rcc-leaf bg-rcc-leaf text-rcc-night"
                    : "border-rcc-line bg-rcc-panel2 text-rcc-mist hover:border-rcc-gold/50"
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
        <div className="rounded-xl border border-rcc-line bg-rcc-night/50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rcc-gold">
            Personalise (optional)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {product.personalization!.map((f) => (
              <label key={f.key} className="text-xs font-semibold text-rcc-mist">
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
                  className="mt-1 w-full rounded-md border border-rcc-line bg-rcc-panel2 px-2 py-1.5 text-sm uppercase text-rcc-sand outline-none placeholder:text-rcc-mist/40 focus:border-rcc-gold focus:ring-2 focus:ring-rcc-gold/20"
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
        className={`w-full rounded-lg bg-rcc-gold px-4 font-bold uppercase tracking-wide text-rcc-night transition hover:bg-rcc-goldsoft active:scale-[0.98] ${
          compact ? "py-2.5 text-xs" : "py-3 text-sm"
        }`}
      >
        Add to cart
      </button>
    </div>
  );
}
