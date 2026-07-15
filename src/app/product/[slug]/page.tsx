import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/products";
import { formatMoney } from "@/lib/format";
import { storeConfig } from "@/lib/config";
import { ProductImage } from "@/components/ProductImage";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-rcc-green/60">
        <Link href="/" className="hover:underline">
          Shop
        </Link>{" "}
        / <span className="text-rcc-green">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-rcc-green/10 bg-white">
          <div className="aspect-square">
            <ProductImage product={product} />
          </div>
        </div>

        <div className="flex flex-col">
          {product.badge && (
            <span className="mb-2 w-fit rounded-full bg-rcc-lime px-3 py-1 text-xs font-black uppercase tracking-wider text-rcc-green">
              {product.badge}
            </span>
          )}
          <h1 className="text-3xl font-black text-rcc-ink">{product.name}</h1>
          <p className="mt-2 text-rcc-green/70">{product.blurb}</p>

          <p className="mt-5 text-3xl font-black text-rcc-green">
            {formatMoney(product.price)}
          </p>
          <p className="text-xs text-rcc-green/50">
            + {storeConfig.taxRatePct}% GST &amp; shipping · pay via UPI at
            checkout
          </p>

          <div className="mt-6 max-w-sm">
            <AddToCart product={product} />
          </div>

          <div className="mt-8 space-y-4 border-t border-rcc-green/10 pt-6 text-sm leading-relaxed text-rcc-green/80">
            <p>{product.description}</p>
            {product.highlights && (
              <ul className="space-y-1.5">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-rcc-green/70">
                    <span className="mt-0.5 text-rcc-leaf" aria-hidden>
                      ✓
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <ul className="grid grid-cols-2 gap-2 border-t border-rcc-green/10 pt-4 text-xs text-rcc-green/50">
              <li>📦 Ships pan-India</li>
              <li>📱 UPI QR checkout</li>
              <li>💬 Support on WhatsApp</li>
              <li>🎾 Community-first pricing</li>
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-black text-rcc-green">More RCC gear</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
