"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#catalogue", label: "Shop" },
  { href: "/#catalogue", label: "Collections" },
  { href: "/#customize", label: "Customize" },
  { href: "/#about", label: "About RCC" },
  { href: "/#contact", label: "Contact" },
];

export function Header() {
  const { count, openCart } = useCart();
  const { user } = useCustomerAuth();
  const initial = user?.email?.[0]?.toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-rcc-line bg-rcc-night/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="RCC store home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-[13px] font-semibold uppercase tracking-wide lg:flex">
          {LINKS.map((l, i) => (
            <Link
              key={l.label}
              href={l.href}
              className={`transition hover:text-rcc-gold ${
                i === 0 ? "text-rcc-gold" : "text-rcc-mist"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/track"
            className="grid h-9 w-9 place-items-center rounded-full text-rcc-mist transition hover:text-rcc-gold"
            aria-label="Track order"
          >
            🔍
          </Link>
          <Link
            href={user ? "/account" : "/account/login"}
            className="grid h-9 w-9 place-items-center rounded-full text-rcc-mist transition hover:text-rcc-gold"
            aria-label={user ? "Your account" : "Log in"}
          >
            {initial ? (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-rcc-gold/20 text-xs font-black text-rcc-gold">
                {initial}
              </span>
            ) : (
              "👤"
            )}
          </Link>
          <button
            onClick={openCart}
            className="relative grid h-9 w-9 place-items-center rounded-full text-rcc-mist transition hover:text-rcc-gold"
            aria-label="Open cart"
          >
            🛒
            {count > 0 && (
              <span className="animate-pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rcc-gold px-1 text-xs font-black text-rcc-night">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
