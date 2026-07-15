"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Logo } from "./Logo";

export function Header() {
  const { count, openCart } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-rcc-green/10 bg-rcc-sand/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="RCC merch store home">
          <Logo />
        </Link>

        <nav className="flex items-center gap-1 text-sm font-semibold">
          <Link
            href="/#catalogue"
            className="hidden rounded-full px-3 py-2 text-rcc-green hover:bg-rcc-green/5 sm:block"
          >
            Shop
          </Link>
          <Link
            href="/track"
            className="hidden rounded-full px-3 py-2 text-rcc-green hover:bg-rcc-green/5 sm:block"
          >
            Track order
          </Link>
          <button
            onClick={openCart}
            className="relative ml-1 inline-flex items-center gap-2 rounded-full bg-rcc-green px-4 py-2 font-semibold text-rcc-sand transition hover:bg-rcc-leaf"
          >
            <span aria-hidden>🛒</span>
            <span>Cart</span>
            {count > 0 && (
              <span className="animate-pop grid h-5 min-w-5 place-items-center rounded-full bg-rcc-lime px-1 text-xs font-black text-rcc-green">
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
