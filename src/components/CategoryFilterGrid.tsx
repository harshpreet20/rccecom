"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import type { Category } from "@/lib/categories";
import { ProductCard } from "./ProductCard";

export function CategoryFilterGrid({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [active, setActive] = useState<string>("all");

  const usedCategories = useMemo(() => {
    const names = new Set(products.map((p) => (p.category || "").toLowerCase()));
    return categories.filter((c) => names.has(c.name.toLowerCase()));
  }, [products, categories]);

  const filtered = useMemo(() => {
    if (active === "all") return products;
    return products.filter((p) => (p.category || "").toLowerCase() === active.toLowerCase());
  }, [products, active]);

  if (usedCategories.length < 2) {
    // Not enough real category variety to make filtering worthwhile.
    return (
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setActive("all")}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
            active === "all"
              ? "border-rcc-gold bg-rcc-gold text-rcc-night"
              : "border-rcc-line text-rcc-mist hover:border-rcc-gold/50"
          }`}
        >
          All
        </button>
        {usedCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.name)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              active.toLowerCase() === c.name.toLowerCase()
                ? "border-rcc-gold bg-rcc-gold text-rcc-night"
                : "border-rcc-line text-rcc-mist hover:border-rcc-gold/50"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
