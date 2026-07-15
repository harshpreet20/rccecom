# RCC Merch Store 🎾

The official merchandise store for **Racquets Club Community (RCC)** — a clean,
mobile-first catalogue where members browse RCC gear and pay by **UPI QR code**.
No card gateway, no login: scan, pay, confirm.

Built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**.
Orders are persisted to **Supabase** (optional) and always handed off to RCC on
**WhatsApp** with a pre-filled order summary.

---

## How it works

1. **Browse** the catalogue and add merch to the cart (with size + jersey
   name/number personalisation).
2. **Checkout** collects delivery details, then shows a **UPI QR code** for the
   exact order total, payable with any UPI app (GPay, PhonePe, Paytm, BHIM…).
3. The customer pays, enters their **UPI reference (UTR)**, and places the order.
4. The order is **saved to Supabase** and the customer is handed a **WhatsApp
   link** (pre-filled with items, personalisation, total, UTR and address) to
   send to RCC for confirmation & dispatch.
5. Customers can check status any time on **/track** (order ID + mobile number).

Payment goes straight into RCC's UPI account — the store never touches money or
holds card details.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # fill in the values (defaults already work)
npm run dev                  # http://localhost:3000
```

The store runs out of the box with the flagship products and the UPI ID baked
in as defaults — Supabase is optional for local testing.

---

## Configuration

All merchant/payment settings are environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_UPI_ID` | UPI VPA the QR pays into (e.g. `9650086006@ybl`) |
| `NEXT_PUBLIC_UPI_PAYEE_NAME` | Name shown in the payer's UPI app |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Number orders are sent to (country code + digits) |
| `NEXT_PUBLIC_STORE_*` | Store name, tagline, support email |
| `NEXT_PUBLIC_SHIPPING_FEE` | Flat shipping fee in ₹ added per order (`0` = free) |
| `NEXT_PUBLIC_GST_PERCENT` | GST % applied to the item subtotal |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Order persistence (server-side only) |

Shipping and GST are added on top of item prices at checkout, itemised in the
order summary, and folded into the exact amount the UPI QR charges — computed
server-side so the persisted total always matches what the customer paid.

> `NEXT_PUBLIC_*` values are exposed to the browser (needed to render the QR).
> The Supabase **service-role key** is server-only — never prefix it with
> `NEXT_PUBLIC_`.

### Editing products

Products live in **`src/lib/products.ts`** — a plain array. Edit names, prices,
sizes, personalisation fields, and badges there. **Prices are placeholders
(`// TODO: confirm real price`) — update them to the real RCC prices.**

### Adding real product photos

Each product renders a branded placeholder until you add a photo. Drop image
files into **`public/products/`** and set the `image` field on the product,
e.g. `image: "/products/jersey.png"`.

---

## Order persistence (Supabase)

Orders are saved to a `public.orders` table when Supabase is configured.

1. Pick a Supabase project (or create one).
2. Run **`supabase/schema.sql`** in the SQL editor to create the `orders` table.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).

If Supabase isn't configured, the store still works — every order flows to RCC
via the WhatsApp handoff, which is the source of truth for fulfilment.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (framework auto-detected as Next.js).
3. Add the environment variables from `.env.example` in Vercel → Settings →
   Environment Variables.
4. Deploy. That's it.

---

## Project structure

```
src/
  app/
    page.tsx                 Catalogue / home
    product/[slug]/page.tsx  Product detail
    checkout/page.tsx        Details → UPI QR → confirm
    track/page.tsx           Order status lookup
    api/orders/route.ts      Create order (re-prices server-side, saves to DB)
    api/orders/lookup/route.ts  Status lookup (order ref + phone)
  components/                Header, Footer, cart drawer, product cards, UPI QR
  lib/
    products.ts              Catalogue (edit merch here)
    config.ts                Merchant/UPI/env config
    upi.ts                   UPI deep-link + QR string builder
    whatsapp.ts              Pre-filled order message
    cart-context.tsx         Client cart state (localStorage)
    supabase.ts              Server Supabase client
supabase/schema.sql          orders table DDL
```
