import Link from "next/link";
import { fetchProducts } from "@/lib/catalogue";
import { storeConfig } from "@/lib/config";
import { STORE_FAQS, faqJsonLd } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🛡️", title: "Premium Quality", text: "Performance fabrics, 190 GSM Airmesh" },
  { icon: "👥", title: "Community Driven", text: "Made for players, by players" },
  { icon: "⭐", title: "Exclusive Designs", text: "Limited drops & collections" },
  { icon: "✎", title: "Custom Options", text: "Add your name, number & style" },
];

export default async function HomePage() {
  const products = await fetchProducts();
  const showcase = products.slice(0, 4);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-rcc-line bg-rcc-night">
        <div className="spotlight absolute inset-0" aria-hidden />
        <div className="court-lines absolute inset-0 opacity-30" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-rcc-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-rcc-gold">
              🏸 Official Club Store
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
              WEAR THE
              <br />
              <span className="text-gold-grad">RCC SPIRIT</span>
            </h1>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-rcc-leaf">
              One Community. One Passion.
            </p>
            <p className="mt-4 max-w-md text-rcc-mist">
              Premium performance wear and accessories crafted for the game,
              inspired by the community.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#catalogue"
                className="inline-flex items-center gap-2 rounded-lg bg-rcc-gold px-6 py-3 text-sm font-black uppercase tracking-wide text-rcc-night transition hover:bg-rcc-goldsoft"
              >
                Shop Now →
              </Link>
              <Link
                href="#about"
                className="rounded-lg border border-rcc-line px-6 py-3 text-sm font-black uppercase tracking-wide text-rcc-sand transition hover:border-rcc-gold/50"
              >
                Explore RCC
              </Link>
            </div>
          </div>

          {/* Showcase + feature list */}
          <div className="flex items-center gap-6">
            <div className="relative flex-1">
              <div className="grid grid-cols-2 gap-3">
                {showcase.map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/product/${p.slug}`}
                    className="flex aspect-square items-center justify-center rounded-2xl border border-rcc-line text-5xl shadow-lg transition hover:border-rcc-gold/40"
                    style={{
                      background: `radial-gradient(120% 120% at 30% 20%, ${p.accent}, #060b0a)`,
                      transform: `translateY(${i % 2 ? "1rem" : "0"})`,
                    }}
                  >
                    <span aria-hidden>{p.emoji}</span>
                  </Link>
                ))}
              </div>
            </div>
            <ul className="hidden w-44 flex-none space-y-4 md:block">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-2.5">
                  <span className="text-lg text-rcc-gold" aria-hidden>
                    {f.icon}
                  </span>
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wide text-rcc-sand">
                      {f.title}
                    </span>
                    <span className="block text-[11px] text-rcc-mist">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Policy bar */}
        <div className="relative border-t border-rcc-line bg-rcc-panel2">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3 text-rcc-mist">
              <span className="text-rcc-gold" aria-hidden>🚚</span>
              <span>
                <b className="text-rcc-sand">Free shipping not available.</b> We
                currently do not offer free shipping.
              </span>
            </div>
            <div className="flex items-center gap-3 text-rcc-mist sm:justify-center">
              <span className="text-rcc-gold" aria-hidden>↩️</span>
              <span>
                <b className="text-rcc-sand">No returns or refunds.</b> All sales
                are final.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section id="catalogue" className="mx-auto max-w-6xl px-4 py-14">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-rcc-gold">
            ✦ Our Best Sellers ✦
          </p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <h2 className="text-3xl font-black uppercase tracking-tight text-rcc-sand sm:text-4xl">
              Featured Products
            </h2>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* CUSTOMIZE CTA */}
      <section id="customize" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="relative overflow-hidden rounded-3xl border border-rcc-gold/30 bg-gradient-to-r from-rcc-panel to-rcc-panel2 p-8 sm:p-12">
          <div className="court-lines absolute inset-0 opacity-20" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-rcc-gold">
                Make it yours
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase text-rcc-sand sm:text-3xl">
                Customize your gear
              </h3>
              <p className="mt-2 max-w-md text-rcc-mist">
                Add your name, number &amp; style to the RCC Performance kit —
                printed and shipped from the club.
              </p>
            </div>
            <Link
              href="/product/rcc-performance-tshirt"
              className="rounded-lg bg-rcc-gold px-6 py-3 text-sm font-black uppercase tracking-wide text-rcc-night transition hover:bg-rcc-goldsoft"
            >
              Customize Now
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-3xl px-4 pb-4 text-center">
        <h2 className="text-2xl font-black uppercase text-rcc-sand">About RCC</h2>
        <p className="mt-3 text-rcc-mist">
          Racquets Club Community is Delhi&apos;s home for badminton and racquet
          sports players. This is the official store — premium kit, community
          pricing, and gear designed with players at heart.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-2xl font-black uppercase text-rcc-sand">
          Frequently asked
        </h2>
        <dl className="mt-6 space-y-3">
          {STORE_FAQS.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border border-rcc-line bg-rcc-panel p-5"
            >
              <dt className="font-bold text-rcc-sand">{f.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-rcc-mist">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(STORE_FAQS)) }}
      />
    </div>
  );
}
