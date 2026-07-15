import type { Product } from "@/lib/products";

/**
 * Branded placeholder "image" for a product. Uses a gradient built from the
 * product's accent colour plus its emoji, so the catalogue looks complete
 * without shipping any external image assets. If a product has a real
 * `image` URL, that is rendered instead.
 */
export function ProductImage({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  if (product.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={product.image}
        alt={product.name}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`court-lines relative flex h-full w-full items-center justify-center ${className}`}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, ${product.accent}, ${product.accent}cc 42%, #060b0a 130%)`,
      }}
      aria-label={product.name}
      role="img"
    >
      <span className="text-6xl drop-shadow-lg sm:text-7xl" aria-hidden>
        {product.emoji}
      </span>
      <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-rcc-gold/90 backdrop-blur">
        {product.category}
      </span>
    </div>
  );
}
