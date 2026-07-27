import type { Metadata } from "next";
import "./globals.css";
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
  icons: {
    icon: "/rcc-crest.webp",
    shortcut: "/rcc-crest.webp",
    apple: "/rcc-crest.webp",
  },
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
        {children}
      </body>
    </html>
  );
}
