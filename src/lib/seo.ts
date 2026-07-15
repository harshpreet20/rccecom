import type { Metadata } from "next";
import { storeConfig } from "./config";
import type { Product } from "./products";

/**
 * SEO + GEO helpers. Generative Engine Optimization (GEO) leans on the same
 * structured data (JSON-LD) and clean, factual, humanized copy that helps AI
 * answer engines cite the store — so we emit Product / Organization / FAQ
 * schema alongside classic meta + Open Graph tags.
 */

const BASE = storeConfig.siteUrl;

export function absolute(path = "/"): string {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Per-product <head> metadata. */
export function productMetadata(product: Product): Metadata {
  const title = product.seoTitle || `${product.name} · ${storeConfig.shortName} Store`;
  const description =
    product.seoDescription || product.blurb || product.description.slice(0, 155);
  const url = absolute(`/product/${product.slug}`);
  return {
    title,
    description,
    keywords: product.seoKeywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: storeConfig.name,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** schema.org Product JSON-LD (rich results + GEO grounding). */
export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription || product.description,
    category: product.category,
    brand: { "@type": "Brand", name: storeConfig.name },
    url: absolute(`/product/${product.slug}`),
    ...(product.image ? { image: absolute(product.image) } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: storeConfig.currency,
      price: product.price,
      availability: product.soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: absolute(`/product/${product.slug}`),
      seller: { "@type": "Organization", name: storeConfig.name },
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeConfig.name,
    url: BASE,
    email: storeConfig.supportEmail,
    sameAs: [`https://instagram.com/${storeConfig.instagram}`],
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Shared store FAQ — surfaced on the home page and as FAQ structured data. */
export const STORE_FAQS: { q: string; a: string }[] = [
  {
    q: "How do I pay for RCC merch?",
    a: "Checkout is by UPI QR code. Scan the QR shown at checkout with any UPI app — GPay, PhonePe, Paytm or BHIM — pay the exact total, and enter your UPI reference. No card or login needed.",
  },
  {
    q: "Can I personalise the RCC Pro Jersey?",
    a: "Yes. The RCC Pro Jersey Kit can be printed with your name and number on the back — add them on the product page before checkout.",
  },
  {
    q: "What sizes are available?",
    a: "The jersey kit comes in XS to XXL, with a full jersey and shorts size chart (in inches) on the product page. There may be a tolerance of about ±0.5 inch.",
  },
  {
    q: "How is my order delivered?",
    a: "After you pay, your order and UPI reference are confirmed over WhatsApp, and RCC arranges pan-India delivery. You can also track your order with your order ID and mobile number.",
  },
];
