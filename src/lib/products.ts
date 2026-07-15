/**
 * RCC merchandise catalogue.
 *
 * Single source of truth for what's on sale. To add/edit merch, change this
 * array — no database needed for the catalogue itself.
 *
 * Product photos: drop image files into `public/products/` and set the
 * `image` field (e.g. "/products/jersey.png"). Until then, each product
 * renders a branded placeholder built from `accent` + `emoji`, so the store
 * works with zero external assets.
 */

export type PersonalizationField = {
  key: string;
  label: string;
  kind: "text" | "number";
  maxLength: number;
  required?: boolean;
  placeholder?: string;
};

export type Product = {
  slug: string;
  name: string;
  /** Short one-liner shown on the card. */
  blurb: string;
  /** Longer description shown on the product page. */
  description: string;
  /** Bullet highlights on the product page. */
  highlights?: string[];
  price: number; // in whole rupees
  category: string; // free-text category (managed in the RCC CRM)
  /** Optional sizes; if present the customer must pick one. */
  sizes?: string[];
  /** Optional custom fields (e.g. jersey name + number). */
  personalization?: PersonalizationField[];
  /** Accent color for the placeholder image + card. */
  accent: string;
  /** Emoji used in the placeholder image. */
  emoji: string;
  /** Optional external/local image URL (overrides the placeholder). */
  image?: string;
  soldOut?: boolean;
  badge?: string;
  /** "physical" goods vs "membership" (no shipping, no size). */
  kind?: "physical" | "membership";
  /** Optional external marketplace links (managed in the CRM). */
  amazonUrl?: string;
  flipkartUrl?: string;
  /** SEO / GEO fields (managed in the CRM). */
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
};

export const products: Product[] = [
  {
    slug: "rcc-pro-jersey-kit",
    name: "RCC Pro Jersey Kit",
    blurb: "V-neck collared half-sleeve jersey + shorts, fully sublimated.",
    description:
      "The official RCC match kit. A V-neck collared half-sleeve jersey in seafoam and deep teal with the sublimated RCC design, paired with matching teal shorts. Personalise the back with your name and number — wear the club colours on court.",
    highlights: [
      "V-neck collar, half sleeve",
      "Sublimated RCC graphics + crest",
      "Jersey + matching shorts included",
      "Add your name & number on the back",
      "Breathable performance fabric",
    ],
    price: 1100,
    category: "Jersey Kit",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    personalization: [
      {
        key: "name",
        label: "Name on back",
        kind: "text",
        maxLength: 14,
        placeholder: "HARSHITA",
      },
      {
        key: "number",
        label: "Number (0–99)",
        kind: "number",
        maxLength: 2,
        placeholder: "88",
      },
    ],
    accent: "#1f8f88",
    emoji: "🎽",
    badge: "Flagship",
  },
  {
    slug: "rcc-court-cap",
    name: "RCC Court Cap",
    blurb: "Embroidered RCC monogram, adjustable strap.",
    description:
      "Structured 6-panel cap in seafoam with a deep-teal brim and the embroidered RCC monogram up front. 'Racquets Club Community' arced across the back, brass adjuster strap. One size fits most.",
    highlights: [
      "Embroidered RCC monogram",
      "Deep-teal contrast brim",
      "Adjustable brass strap",
      "One size fits most",
    ],
    price: 450,
    category: "Headwear",
    accent: "#31a89f",
    emoji: "🧢",
    badge: "New",
  },
  {
    slug: "rcc-wristbands",
    name: "RCC Wristbands (Pair)",
    blurb: "Terry-cotton sweatbands with embroidered RCC crest.",
    description:
      "A pair of premium terry-cotton wristbands in black with teal RCC embroidery and the 'Racquets Club Community' wordmark. Keeps sweat off your grip through long rallies.",
    highlights: [
      "Set of 2 wristbands",
      "Soft absorbent terry cotton",
      "Embroidered RCC crest + wordmark",
      "One size, stretch fit",
    ],
    price: 250,
    category: "Accessories",
    accent: "#0e5a62",
    emoji: "🎾",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const categories = Array.from(
  new Set(products.map((p) => p.category)),
) as Product["category"][];
