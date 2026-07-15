import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { AddToCart } from "./AddToCart";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-rcc-green/10 bg-white shadow-sm transition hover:shadow-md">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden"
      >
        <div className="h-full w-full transition duration-300 group-hover:scale-[1.03]">
          <ProductImage product={product} />
        </div>
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-rcc-lime px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rcc-green shadow">
            {product.badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-bold leading-tight text-rcc-ink hover:text-rcc-leaf">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-rcc-green/60">{product.blurb}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold text-rcc-green">
            {formatMoney(product.price)}
          </span>
        </div>
        <AddToCart product={product} compact />
      </div>
    </div>
  );
}
