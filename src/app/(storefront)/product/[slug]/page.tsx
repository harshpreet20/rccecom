import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProduct, fetchProducts } from "@/lib/catalogue";
import { formatMoney } from "@/lib/format";
import { storeConfig } from "@/lib/config";
import { productMetadata, productJsonLd } from "@/lib/seo";
import { ProductImage } from "@/components/ProductImage";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";
import { SizeChart } from "@/components/SizeChart";

// Reflect CRM catalogue edits without a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) return { title: `Not found · ${storeConfig.shortName}` };
  return productMetadata(product);
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await fetchProduct(params.slug);
  if (!product) notFound();

  const isJerseyKit = /jersey/i.test(product.category) || /jersey/i.test(product.name);

  const all = await fetchProducts();
  const related = all.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Product structured data for SEO rich results + GEO answer engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <nav className="mb-6 text-sm text-rcc-mist">
        <Link href="/" className="hover:text-rcc-gold">
          Shop
        </Link>{" "}
        / <span className="text-rcc-sand">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="aspect-square overflow-hidden rounded-3xl border border-rcc-line bg-rcc-panel md:sticky md:top-24">
          <ProductImage product={product} className="!object-contain p-6" />
        </div>

        <div className="flex flex-col">
          {product.badge && (
            <span className="mb-2 w-fit rounded-md bg-rcc-leaf px-3 py-1 text-xs font-black uppercase tracking-wider text-rcc-night">
              {product.badge}
            </span>
          )}
          <h1 className="text-3xl font-black uppercase tracking-tight text-rcc-sand">
            {product.name}
          </h1>
          <p className="mt-2 text-rcc-mist">{product.blurb}</p>

          <p className="mt-5 text-3xl font-black text-rcc-gold">
            {formatMoney(product.price)}
          </p>
          <p className="text-xs text-rcc-mist/70">
            {product.kind === "membership"
              ? `+ ${storeConfig.taxRatePct}% GST · pay via UPI at checkout`
              : `+ ${storeConfig.taxRatePct}% GST & shipping · pay via UPI at checkout`}
          </p>

          <div className="mt-6 max-w-sm">
            <AddToCart product={product} />
          </div>

          {product.sizes && (
            <div className="mt-3">
              <SizeChart withShorts={isJerseyKit} />
            </div>
          )}

          {/* Also available on marketplaces (CRM-managed links) */}
          {(product.amazonUrl || product.flipkartUrl) && (
            <div className="mt-4 max-w-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rcc-mist">
                Also available on
              </p>
              <div className="flex flex-wrap gap-2">
                {product.amazonUrl && (
                  <a
                    href={product.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-2 rounded-lg border border-rcc-line bg-rcc-panel px-4 py-2.5 text-sm font-bold text-rcc-sand transition hover:border-[#ff9900]/60"
                  >
                    <span className="text-[#ff9900]">a</span> Buy on Amazon
                  </a>
                )}
                {product.flipkartUrl && (
                  <a
                    href={product.flipkartUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-2 rounded-lg border border-rcc-line bg-rcc-panel px-4 py-2.5 text-sm font-bold text-rcc-sand transition hover:border-[#2874f0]/60"
                  >
                    <span className="text-[#2874f0]">🛍️</span> Buy on Flipkart
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4 border-t border-rcc-line pt-6 text-sm leading-relaxed text-rcc-mist">
            <p>{product.description}</p>
            {product.highlights && (
              <ul className="space-y-1.5">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-rcc-mist">
                    <span className="mt-0.5 text-rcc-gold" aria-hidden>
                      ✓
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <ul className="grid grid-cols-2 gap-2 border-t border-rcc-line pt-4 text-xs text-rcc-mist/70">
              <li>📦 Ships pan-India</li>
              <li>📱 UPI QR checkout</li>
              <li>💬 Support on WhatsApp</li>
              <li>🏸 Community-first pricing</li>
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-black uppercase text-rcc-sand">More RCC gear</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
