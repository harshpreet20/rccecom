"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatMoney, describeCustom } from "@/lib/format";
import { storeConfig } from "@/lib/config";

export function CartDrawer() {
  const { lines, subtotal, setQty, remove, isOpen, closeCart } = useCart();

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-rcc-panel2 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-rcc-line px-5 py-4">
          <h2 className="text-lg font-black uppercase tracking-wide text-rcc-sand">
            Your cart
          </h2>
          <button
            onClick={closeCart}
            className="rounded-full p-2 text-rcc-mist hover:text-rcc-gold"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-5xl" aria-hidden>🛒</span>
            <p className="font-semibold text-rcc-sand">Your cart is empty</p>
            <p className="text-sm text-rcc-mist">Add some RCC gear to get started.</p>
            <button
              onClick={closeCart}
              className="mt-2 rounded-lg bg-rcc-gold px-5 py-2.5 text-sm font-black uppercase tracking-wide text-rcc-night hover:bg-rcc-goldsoft"
            >
              Browse merch
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-rcc-line overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={`${l.slug}-${l.size ?? ""}`} className="flex gap-3 py-4">
                  <div
                    className="grid h-16 w-16 flex-none place-items-center rounded-xl border border-rcc-line text-2xl"
                    style={{ background: `${l.accent}22` }}
                  >
                    <span aria-hidden>{l.emoji}</span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold leading-tight text-rcc-sand">
                          {l.name}
                          {l.size && (
                            <span className="ml-1 font-medium text-rcc-mist">· {l.size}</span>
                          )}
                        </p>
                        {l.custom && (
                          <p className="text-xs font-semibold text-rcc-gold">
                            {describeCustom(l.custom)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => remove(l.slug, l.size, l.custom)}
                        className="text-xs font-semibold text-rcc-clay hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-full border border-rcc-line bg-rcc-panel">
                        <button
                          onClick={() => setQty(l.slug, l.size, l.custom, l.qty - 1)}
                          className="grid h-8 w-8 place-items-center text-rcc-mist hover:text-rcc-gold"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-rcc-sand">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => setQty(l.slug, l.size, l.custom, l.qty + 1)}
                          className="grid h-8 w-8 place-items-center text-rcc-mist hover:text-rcc-gold"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-extrabold text-rcc-gold">
                        {formatMoney(l.qty * l.price)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-rcc-line bg-rcc-panel px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-rcc-mist">Subtotal</span>
                <span className="text-xl font-black text-rcc-gold">{formatMoney(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-rcc-mist/70">
                {storeConfig.taxRatePct}% GST &amp; shipping added at checkout.
              </p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-3 block w-full rounded-lg bg-rcc-gold py-3 text-center font-black uppercase tracking-wide text-rcc-night transition hover:bg-rcc-goldsoft"
              >
                Checkout · {formatMoney(subtotal)}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
