"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import { ProductImage } from "./ProductImage";

/**
 * Product detail media viewer: a main image/video with a thumbnail strip
 * when there's more than one photo or any video. Falls back to the plain
 * ProductImage placeholder (accent + emoji) when the CRM hasn't uploaded
 * any real media yet.
 */
export function ProductGallery({ product, className = "" }: { product: Product; className?: string }) {
  const images = product.images?.length ? product.images : product.image ? [product.image] : [];
  const videos = product.videos ?? [];
  type Item = { kind: "image" | "video"; url: string };
  const items: Item[] = [
    ...images.map((url): Item => ({ kind: "image", url })),
    ...videos.map((url): Item => ({ kind: "video", url })),
  ];

  const [active, setActive] = useState(0);

  if (items.length === 0) {
    return <ProductImage product={product} className={className} />;
  }

  const current = items[active];

  return (
    <div className="flex flex-col gap-3">
      <div className={`overflow-hidden ${className}`}>
        {current.kind === "video" ? (
          <video
            key={current.url}
            src={current.url}
            className="h-full w-full object-contain"
            controls
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.url}
            src={current.url}
            alt={product.name}
            className="h-full w-full object-contain p-6"
          />
        )}
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {items.map((item, i) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition ${
                i === active ? "border-rcc-gold" : "border-rcc-line opacity-70 hover:opacity-100"
              }`}
              aria-label={item.kind === "video" ? "Show video" : `Show photo ${i + 1}`}
            >
              {item.kind === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              {item.kind === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-white">▶</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
