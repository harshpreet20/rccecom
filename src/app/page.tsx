import Link from "next/link";
import { fetchProducts } from "@/lib/catalogue";
import { fetchCategories } from "@/lib/categories";
import { fetchStoreSettings } from "@/lib/store-settings";
import { formatMoney } from "@/lib/format";
import { storeConfig } from "@/lib/config";
import { STORE_FAQS, faqJsonLd } from "@/lib/seo";
import { CategoryFilterGrid } from "@/components/CategoryFilterGrid";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🛡️", title: "Premium Quality", text: "Performance fabrics, 190 GSM Airmesh" },
  { icon: "👥", title: "Community Driven", text: "Made for players, by players" },
  { icon: "⭐", title: "Exclusive Designs", text: "Limited drops & collections" },
  { icon: "✎", title: "Custom Options", text: "Add your name, number & style" },
];

export default async function HomePage() {
  const [products, categories, settings] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
    fetchStoreSettings(),
  ]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-rcc-line bg-rcc-night">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.png"
          alt="RCC performance kit — jersey, shorts, cap and wristbands"
          className="absolute inset-0 h-full w-full object-cover object-right opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-rcc-night via-rcc-night/90 to-rcc-night/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-rcc-night via-transparent to-rcc-night/40" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-xl">
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
              <a
                href="https://racquetsclubcommunity.com"
                className="rounded-lg border border-rcc-line px-6 py-3 text-sm font-black uppercase tracking-wide text-rcc-sand transition hover:border-rcc-gold/50"
              >
                Explore RCC
              </a>
            </div>
          </div>

          <ul className="mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border border-rcc-line/70 bg-rcc-night/50 p-3 backdrop-blur"
              >
                <span className="text-lg text-rcc-gold" aria-hidden>
                  {f.icon}
                </span>
                <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-rcc-sand">
                  {f.title}
                </span>
                <span className="block text-[11px] text-rcc-mist">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Policy bar */}
        <div className="relative border-t border-rcc-line bg-rcc-panel2">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3 text-rcc-mist">
              <span className="text-rcc-gold" aria-hidden>🚚</span>
              <span>
                {settings.freeShippingThreshold != null ? (
                  <>
                    <b className="text-rcc-sand">
                      Free shipping over {formatMoney(settings.freeShippingThreshold)}.
                    </b>{" "}
                    Flat {formatMoney(settings.shippingFee)} shipping below that.
                  </>
                ) : (
                  <>
                    <b className="text-rcc-sand">
                      Flat {formatMoney(settings.shippingFee)} shipping.
                    </b>{" "}
                    Added at checkout.
                  </>
                )}
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

        <CategoryFilterGrid products={products} categories={categories} />
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
