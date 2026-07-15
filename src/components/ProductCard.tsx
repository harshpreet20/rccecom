import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { AddToCart } from "./AddToCart";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-rcc-line bg-rcc-panel shadow-lg transition hover:border-rcc-gold/40 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden"
      >
        <div className="h-full w-full transition duration-300 group-hover:scale-[1.03]">
          <ProductImage product={product} />
        </div>
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-md bg-rcc-leaf px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rcc-night shadow">
            {product.badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-extrabold uppercase leading-tight tracking-wide text-rcc-sand transition hover:text-rcc-gold">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-xs text-rcc-mist">{product.blurb}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-rcc-gold">
            {formatMoney(product.price)}
          </span>
          {product.kind === "membership" && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-rcc-mist">
              / year
            </span>
          )}
        </div>
        <AddToCart product={product} compact />
      </div>
    </div>
  );
}
