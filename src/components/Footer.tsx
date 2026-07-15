import { storeConfig } from "@/lib/config";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer
      id="contact"
      className="mt-20 border-t border-rcc-line bg-rcc-panel2"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-rcc-mist">
            {storeConfig.tagline}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wide text-rcc-gold">
            Payments &amp; policy
          </p>
          <ul className="mt-3 space-y-1.5 text-rcc-mist">
            <li>Pay by UPI QR — GPay, PhonePe, Paytm, BHIM</li>
            <li>Shipping charged per order (no free shipping)</li>
            <li>All sales final — no returns or refunds</li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wide text-rcc-gold">
            Get in touch
          </p>
          <p className="mt-3 text-rcc-mist">
            WhatsApp / UPI: {storeConfig.upiId}
            <br />
            {storeConfig.supportEmail}
            <br />
            <a
              href={`https://instagram.com/${storeConfig.instagram}`}
              className="text-rcc-leaf hover:text-rcc-gold"
            >
              @{storeConfig.instagram}
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-rcc-line py-5 text-center text-xs text-rcc-mist/60">
        © {new Date().getFullYear()} {storeConfig.name} · Delhi · Est 2024
      </div>
    </footer>
  );
}
