"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatMoney, describeCustom } from "@/lib/format";
import { storeConfig } from "@/lib/config";

export function CartDrawer() {
  const { lines, subtotal, setQty, remove, isOpen, closeCart } = useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-rcc-sand shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-rcc-green/10 px-5 py-4">
          <h2 className="text-lg font-extrabold text-rcc-green">Your cart</h2>
          <button
            onClick={closeCart}
            className="rounded-full p-2 text-rcc-green hover:bg-rcc-green/10"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-5xl" aria-hidden>
              🛒
            </span>
            <p className="font-semibold text-rcc-green">Your cart is empty</p>
            <p className="text-sm text-rcc-green/60">
              Add some RCC gear to get started.
            </p>
            <button
              onClick={closeCart}
              className="mt-2 rounded-full bg-rcc-green px-5 py-2.5 text-sm font-bold text-rcc-sand hover:bg-rcc-leaf"
            >
              Browse merch
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-rcc-green/10 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={`${l.slug}-${l.size ?? ""}`} className="flex gap-3 py-4">
                  <div
                    className="grid h-16 w-16 flex-none place-items-center rounded-xl text-2xl"
                    style={{ background: `${l.accent}22` }}
                  >
                    <span aria-hidden>{l.emoji}</span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold leading-tight text-rcc-ink">
                          {l.name}
                          {l.size && (
                            <span className="ml-1 font-medium text-rcc-green/60">
                              · {l.size}
                            </span>
                          )}
                        </p>
                        {l.custom && (
                          <p className="text-xs font-semibold text-rcc-leaf">
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
                      <div className="inline-flex items-center rounded-full border border-rcc-green/20 bg-white">
                        <button
                          onClick={() => setQty(l.slug, l.size, l.custom, l.qty - 1)}
                          className="grid h-8 w-8 place-items-center text-rcc-green hover:bg-rcc-green/10"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => setQty(l.slug, l.size, l.custom, l.qty + 1)}
                          className="grid h-8 w-8 place-items-center text-rcc-green hover:bg-rcc-green/10"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-extrabold text-rcc-green">
                        {formatMoney(l.qty * l.price)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-rcc-green/10 bg-white px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-rcc-green/70">Subtotal</span>
                <span className="text-xl font-black text-rcc-green">
                  {formatMoney(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-rcc-green/50">
                {storeConfig.taxRatePct}% GST &amp; shipping added at checkout.
                Pay via UPI QR on the next step.
              </p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-3 block w-full rounded-full bg-rcc-green py-3 text-center font-bold text-rcc-sand transition hover:bg-rcc-leaf"
              >
                Checkout · {formatMoney(subtotal)}
              </Link>
              <p className="mt-2 text-center text-[11px] text-rcc-green/40">
                Pays to {storeConfig.upiId}
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
