"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatMoney, describeCustom } from "@/lib/format";
import { storeConfig } from "@/lib/config";
import { generateOrderRef } from "@/lib/upi";
import { priceOrder, type AppliedDiscount, type PriceBreakdown } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/store-settings";
import { buildWhatsappOrderUrl } from "@/lib/whatsapp";
import { UpiQr } from "@/components/UpiQr";
import type { CustomerDetails, OrderPayload } from "@/lib/types";

type Step = "details" | "pay" | "done";

export default function CheckoutPage() {
  const { lines, clear } = useCart();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [discountStatus, setDiscountStatus] = useState<"idle" | "checking" | "applied" | "invalid">("idle");

  useEffect(() => {
    fetch("/api/store-settings")
      .then((r) => r.json())
      .then((json) => setSettings(json.settings || null))
      .catch(() => setSettings(null));
  }, []);

  const pricing = priceOrder(lines, { settings: settings ?? undefined, discount });

  async function applyDiscount() {
    if (!discountInput.trim()) return;
    setDiscountStatus("checking");
    try {
      const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountInput.trim(), orderAmount: subtotal }),
      });
      const json = await res.json();
      if (json.valid && json.type && json.value != null) {
        setDiscount({ code: json.code || discountInput.trim().toUpperCase(), type: json.type, value: json.value });
        setDiscountStatus("applied");
      } else {
        setDiscount(null);
        setDiscountStatus("invalid");
      }
    } catch {
      setDiscount(null);
      setDiscountStatus("invalid");
    }
  }

  function removeDiscount() {
    setDiscount(null);
    setDiscountInput("");
    setDiscountStatus("idle");
  }

  const [step, setStep] = useState<Step>("details");
  const [orderRef] = useState(generateOrderRef);
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [upiTxnRef, setUpiTxnRef] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderPayload | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "local" | "">("");

  const note = useMemo(
    () => `${storeConfig.shortName} merch ${orderRef}`,
    [orderRef],
  );

  // Cart emptied out (e.g. after success) and not yet on the done screen.
  if (lines.length === 0 && step !== "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="text-5xl" aria-hidden>
          🛒
        </span>
        <h1 className="mt-4 text-2xl font-black text-rcc-sand">
          Your cart is empty
        </h1>
        <p className="mt-2 text-rcc-mist">
          Add some RCC merch before checking out.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-rcc-green px-6 py-3 font-bold text-rcc-sand hover:bg-rcc-leaf"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  function validateDetails() {
    const e: Record<string, string> = {};
    if (!customer.name.trim()) e.name = "Please enter your name.";
    if (!/^[6-9]\d{9}$/.test(customer.phone.replace(/\D/g, "").slice(-10)))
      e.phone = "Enter a valid 10-digit mobile number.";
    if (customer.address.trim().length < 10)
      e.address = "Enter your full delivery address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goToPay() {
    if (validateDetails()) {
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function placeOrder() {
    if (!upiTxnRef.trim()) {
      setErrors({ upi: "Enter the UPI reference / UTR from your payment app." });
      return;
    }
    setErrors({});
    setSubmitting(true);

    const payload: OrderPayload = {
      orderRef,
      items: lines,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      taxRatePct: pricing.taxRatePct,
      shipping: pricing.shipping,
      discount: pricing.discount,
      discountCode: pricing.discountCode,
      amount: pricing.total,
      customer,
      upiTxnRef: upiTxnRef.trim(),
    };

    let finalOrder = payload;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      setSaveState(data?.persisted ? "saved" : "local");
      // The server re-validates the discount and may adjust totals (e.g. the
      // code got used up between applying it and paying) -- reflect that in
      // what we show/send to WhatsApp.
      if (data?.ok) {
        finalOrder = {
          ...payload,
          subtotal: data.subtotal ?? payload.subtotal,
          tax: data.tax ?? payload.tax,
          shipping: data.shipping ?? payload.shipping,
          discount: data.discount ?? payload.discount,
          discountCode: data.discountCode ?? payload.discountCode,
          amount: data.amount ?? payload.amount,
        };
      }
    } catch {
      // Order still captured via the WhatsApp handoff below.
      setSaveState("local");
    }

    setPlacedOrder(finalOrder);
    setStep("done");
    clear();
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Stepper step={step} />

      {step === "done" && placedOrder ? (
        <OrderConfirmation
          order={placedOrder}
          saveState={saveState}
        />
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {step === "details" && (
              <DetailsForm
                customer={customer}
                setCustomer={setCustomer}
                errors={errors}
                onContinue={goToPay}
              />
            )}

            {step === "pay" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <UpiQr amount={pricing.total} note={note} orderRef={orderRef} />
                <div className="rounded-2xl border border-rcc-line bg-rcc-panel p-5">
                  <h3 className="font-bold text-rcc-sand">
                    After you&apos;ve paid
                  </h3>
                  <p className="mt-1 text-sm text-rcc-mist">
                    Enter the UPI reference number (UTR) shown in your payment
                    app so we can match your payment and confirm your order.
                  </p>
                  <label className="mt-4 block text-sm font-semibold text-rcc-sand">
                    UPI reference / UTR
                    <input
                      value={upiTxnRef}
                      onChange={(e) => setUpiTxnRef(e.target.value)}
                      placeholder="e.g. 412345678901"
                      className="mt-1 w-full rounded-lg border border-rcc-line bg-rcc-panel2 px-3 py-2.5 font-mono text-rcc-sand outline-none focus:border-rcc-leaf focus:ring-2 focus:ring-rcc-leaf/30"
                    />
                  </label>
                  {errors.upi && (
                    <p className="mt-1 text-xs font-semibold text-rcc-clay">
                      {errors.upi}
                    </p>
                  )}
                  <button
                    onClick={placeOrder}
                    disabled={submitting}
                    className="mt-4 w-full rounded-full bg-rcc-green py-3 font-bold text-rcc-sand transition hover:bg-rcc-leaf disabled:opacity-60"
                  >
                    {submitting ? "Placing order…" : "I've paid — place order"}
                  </button>
                  <button
                    onClick={() => setStep("details")}
                    className="mt-2 w-full rounded-full py-2 text-sm font-semibold text-rcc-mist hover:text-rcc-sand"
                  >
                    ← Back to details
                  </button>
                </div>
              </div>
            )}
          </div>

          <OrderSummary
            lines={lines}
            pricing={pricing}
            discount={discount}
            discountInput={discountInput}
            discountStatus={discountStatus}
            onDiscountInputChange={setDiscountInput}
            onApplyDiscount={applyDiscount}
            onRemoveDiscount={removeDiscount}
          />
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Your details" },
    { key: "pay", label: "Pay by UPI" },
    { key: "done", label: "Confirmed" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-sm font-semibold">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
              i <= activeIndex
                ? "bg-rcc-green text-rcc-sand"
                : "bg-rcc-panel text-rcc-mist/60"
            }`}
          >
            {i < activeIndex ? "✓" : i + 1}
          </span>
          <span
            className={
              i <= activeIndex ? "text-rcc-sand" : "text-rcc-mist/60"
            }
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <span className="mx-1 h-px w-6 bg-rcc-green/20" />
          )}
        </li>
      ))}
    </ol>
  );
}

function DetailsForm({
  customer,
  setCustomer,
  errors,
  onContinue,
}: {
  customer: CustomerDetails;
  setCustomer: (c: CustomerDetails) => void;
  errors: Record<string, string>;
  onContinue: () => void;
}) {
  const field =
    "mt-1 w-full rounded-lg border border-rcc-line bg-rcc-panel px-3 py-2.5 text-rcc-sand outline-none focus:border-rcc-leaf focus:ring-2 focus:ring-rcc-leaf/30";
  return (
    <div className="rounded-2xl border border-rcc-line bg-rcc-panel p-5 sm:p-6">
      <h2 className="text-lg font-black text-rcc-sand">Delivery details</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-rcc-sand">
          Full name
          <input
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            className={field}
            placeholder="Priya Sharma"
          />
          {errors.name && (
            <span className="mt-1 block text-xs font-semibold text-rcc-clay">
              {errors.name}
            </span>
          )}
        </label>
        <label className="text-sm font-semibold text-rcc-sand">
          Mobile (WhatsApp)
          <input
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
            className={field}
            placeholder="9876543210"
            inputMode="numeric"
          />
          {errors.phone && (
            <span className="mt-1 block text-xs font-semibold text-rcc-clay">
              {errors.phone}
            </span>
          )}
        </label>
        <label className="text-sm font-semibold text-rcc-sand sm:col-span-2">
          Email (optional)
          <input
            value={customer.email}
            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            className={field}
            placeholder="you@email.com"
            type="email"
          />
        </label>
        <label className="text-sm font-semibold text-rcc-sand sm:col-span-2">
          Delivery address
          <textarea
            value={customer.address}
            onChange={(e) =>
              setCustomer({ ...customer, address: e.target.value })
            }
            className={field}
            rows={3}
            placeholder="Flat / house, street, area, city, state, PIN"
          />
          {errors.address && (
            <span className="mt-1 block text-xs font-semibold text-rcc-clay">
              {errors.address}
            </span>
          )}
        </label>
        <label className="text-sm font-semibold text-rcc-sand sm:col-span-2">
          Order notes (optional)
          <input
            value={customer.notes}
            onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
            className={field}
            placeholder="Preferred delivery time, landmark, etc."
          />
        </label>
      </div>
      <button
        onClick={onContinue}
        className="mt-6 w-full rounded-full bg-rcc-green py-3 font-bold text-rcc-sand transition hover:bg-rcc-leaf sm:w-auto sm:px-8"
      >
        Continue to payment →
      </button>
    </div>
  );
}

function OrderSummary({
  lines,
  pricing,
  discount,
  discountInput,
  discountStatus,
  onDiscountInputChange,
  onApplyDiscount,
  onRemoveDiscount,
}: {
  lines: OrderPayload["items"];
  pricing: PriceBreakdown;
  discount?: AppliedDiscount | null;
  discountInput?: string;
  discountStatus?: "idle" | "checking" | "applied" | "invalid";
  onDiscountInputChange?: (v: string) => void;
  onApplyDiscount?: () => void;
  onRemoveDiscount?: () => void;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-rcc-line bg-rcc-panel p-5 lg:sticky lg:top-20">
      <h3 className="font-black text-rcc-sand">Order summary</h3>
      <ul className="mt-3 divide-y divide-rcc-line">
        {lines.map((l) => (
          <li key={`${l.slug}-${l.size ?? ""}`} className="flex gap-3 py-3">
            <div
              className="grid h-12 w-12 flex-none place-items-center rounded-lg text-xl"
              style={{ background: `${l.accent}22` }}
            >
              <span aria-hidden>{l.emoji}</span>
            </div>
            <div className="flex flex-1 items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-rcc-sand">
                  {l.name}
                  {l.size && (
                    <span className="font-medium text-rcc-mist/70">
                      {" "}
                      · {l.size}
                    </span>
                  )}
                </p>
                {l.custom && (
                  <p className="text-xs font-semibold text-rcc-leaf">
                    {describeCustom(l.custom)}
                  </p>
                )}
                <p className="text-xs text-rcc-mist/70">Qty {l.qty}</p>
              </div>
              <span className="text-sm font-bold text-rcc-sand">
                {formatMoney(l.qty * l.price)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-rcc-line pt-3">
        {discount ? (
          <div className="flex items-center justify-between rounded-lg bg-rcc-leaf/10 px-3 py-2 text-sm">
            <span className="font-bold text-rcc-leaf">
              {discount.code} applied
            </span>
            {onRemoveDiscount && (
              <button onClick={onRemoveDiscount} className="text-xs font-semibold text-rcc-mist hover:text-rcc-clay">
                Remove
              </button>
            )}
          </div>
        ) : onApplyDiscount ? (
          <div>
            <div className="flex gap-2">
              <input
                value={discountInput}
                onChange={(e) => onDiscountInputChange?.(e.target.value)}
                placeholder="Discount code"
                className="min-w-0 flex-1 rounded-lg border border-rcc-line bg-rcc-panel2 px-3 py-2 text-sm uppercase text-rcc-sand outline-none focus:border-rcc-leaf"
              />
              <button
                onClick={onApplyDiscount}
                disabled={discountStatus === "checking"}
                className="shrink-0 rounded-lg border border-rcc-line px-3 py-2 text-sm font-bold text-rcc-sand hover:border-rcc-leaf disabled:opacity-60"
              >
                {discountStatus === "checking" ? "…" : "Apply"}
              </button>
            </div>
            {discountStatus === "invalid" && (
              <p className="mt-1 text-xs font-semibold text-rcc-clay">Invalid or expired code.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-1 border-t border-rcc-line pt-3 text-sm">
        <div className="flex justify-between text-rcc-mist">
          <span>Subtotal</span>
          <span>{formatMoney(pricing.subtotal)}</span>
        </div>
        {pricing.tax > 0 && (
          <div className="flex justify-between text-rcc-mist">
            <span>GST ({pricing.taxRatePct}%)</span>
            <span>{formatMoney(pricing.tax)}</span>
          </div>
        )}
        <div className="flex justify-between text-rcc-mist">
          <span>Shipping</span>
          <span>
            {pricing.shipping > 0 ? formatMoney(pricing.shipping) : "Free"}
          </span>
        </div>
        {pricing.discount > 0 && (
          <div className="flex justify-between text-rcc-leaf">
            <span>Discount</span>
            <span>-{formatMoney(pricing.discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 text-lg font-black text-rcc-sand">
          <span>Total</span>
          <span>{formatMoney(pricing.total)}</span>
        </div>
      </div>
    </aside>
  );
}

function OrderConfirmation({
  order,
  saveState,
}: {
  order: OrderPayload;
  saveState: "saved" | "local" | "";
}) {
  const waUrl = buildWhatsappOrderUrl(order);
  return (
    <div className="mx-auto mt-8 max-w-lg text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rcc-lime text-3xl">
        ✅
      </div>
      <h1 className="mt-4 text-2xl font-black text-rcc-sand">
        Thanks! Your order is placed.
      </h1>
      <p className="mt-1 text-rcc-mist">
        Order <span className="font-mono font-bold">{order.orderRef}</span> for{" "}
        {formatMoney(order.amount)}.
      </p>

      <div className="mt-6 rounded-2xl border border-rcc-line bg-rcc-panel p-5 text-left">
        <p className="text-sm font-bold text-rcc-sand">One last step</p>
        <p className="mt-1 text-sm text-rcc-mist">
          Send us your order &amp; UPI reference on WhatsApp so we can confirm
          your payment and dispatch. Tap the button below — the message is
          pre-filled.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 font-bold text-white transition hover:brightness-95"
        >
          <span aria-hidden>💬</span> Send order on WhatsApp
        </a>
        <p className="mt-3 text-center text-xs text-rcc-mist/60">
          {saveState === "saved"
            ? "Your order was also saved to RCC's system."
            : "Please send the WhatsApp message so we don't miss your order."}
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 inline-block rounded-full border border-rcc-line px-6 py-3 font-bold text-rcc-sand hover:bg-rcc-panel"
      >
        Continue shopping
      </Link>
    </div>
  );
}
