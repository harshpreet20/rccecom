import { storeConfig } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-rcc-green/10 bg-rcc-green text-rcc-sand">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold uppercase tracking-widest">
            {storeConfig.shortName}
          </p>
          <p className="mt-2 max-w-xs text-sm text-rcc-sand/70">
            {storeConfig.tagline}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-rcc-lime">Payments</p>
          <p className="mt-2 text-rcc-sand/70">
            Pay securely with any UPI app — GPay, PhonePe, Paytm or BHIM — by
            scanning the QR at checkout. No card or login needed.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-rcc-lime">Get in touch</p>
          <p className="mt-2 text-rcc-sand/70">
            WhatsApp / UPI: {storeConfig.upiId}
            <br />
            {storeConfig.supportEmail}
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-rcc-sand/60">
        © {new Date().getFullYear()} {storeConfig.name}. Built for the community.
      </div>
    </footer>
  );
}
