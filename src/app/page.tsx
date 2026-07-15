import Link from "next/link";
import { products, categories } from "@/lib/products";
import { storeConfig } from "@/lib/config";
import { ProductCard } from "@/components/ProductCard";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-rcc-green text-rcc-sand">
        <div className="court-lines absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-20 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-rcc-lime/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rcc-lime">
              🎾 Official Merch
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              Wear the <span className="text-rcc-lime">Community.</span>
            </h1>
            <p className="mt-4 max-w-md text-rcc-sand/80">
              {storeConfig.tagline} Grab your kit, rep {storeConfig.shortName} on
              and off the court, and check out in seconds with any UPI app.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#catalogue"
                className="rounded-full bg-rcc-lime px-6 py-3 font-bold text-rcc-green transition hover:brightness-95"
              >
                Shop the drop
              </Link>
              <Link
                href="/track"
                className="rounded-full border border-rcc-sand/30 px-6 py-3 font-bold text-rcc-sand transition hover:bg-white/10"
              >
                Track an order
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-rcc-sand/70">
              <span>✓ Pay by UPI QR — GPay / PhonePe / Paytm</span>
              <span>✓ No login needed</span>
              <span>✓ Community-first pricing</span>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {products.slice(0, 4).map((p, i) => (
                <div
                  key={p.slug}
                  className="flex aspect-square items-center justify-center rounded-2xl text-5xl shadow-lg"
                  style={{
                    background: `radial-gradient(120% 120% at 30% 20%, ${p.accent}, #07312f)`,
                    transform: `translateY(${i % 2 ? "1.25rem" : "0"})`,
                  }}
                >
                  <span aria-hidden>{p.emoji}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How UPI checkout works */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: "🛍️",
              title: "1 · Add to cart",
              text: "Pick your merch and sizes, then head to checkout.",
            },
            {
              icon: "📱",
              title: "2 · Scan & pay",
              text: "Scan the UPI QR with any app and pay the exact total.",
            },
            {
              icon: "✅",
              title: "3 · Confirm",
              text: "Enter your UPI reference — we confirm & ship over WhatsApp.",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-rcc-green/10 bg-white p-5"
            >
              <div className="text-2xl" aria-hidden>
                {s.icon}
              </div>
              <p className="mt-2 font-bold text-rcc-green">{s.title}</p>
              <p className="mt-1 text-sm text-rcc-green/60">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catalogue */}
      <section id="catalogue" className="mx-auto max-w-6xl px-4 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-rcc-green">The Collection</h2>
            <p className="text-sm text-rcc-green/60">
              {products.length} items · {categories.join(" · ")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
