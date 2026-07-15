import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { storeConfig } from "@/lib/config";
import { organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(storeConfig.siteUrl),
  title: {
    default: `${storeConfig.name} — Official Merch Store`,
    template: `%s · ${storeConfig.shortName} Store`,
  },
  description: storeConfig.tagline,
  applicationName: `${storeConfig.shortName} Store`,
  keywords: [
    "RCC merch",
    "Racquets Club Community",
    "RCC sweatbands",
    "RCC jersey",
    "badminton merch India",
    "racquet sports apparel",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: storeConfig.name,
    title: `${storeConfig.name} — Official Merch Store`,
    description: storeConfig.tagline,
    url: storeConfig.siteUrl,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <CartProvider>
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
