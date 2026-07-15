"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { storeConfig } from "@/lib/config";

type OrderStatus = {
  order_ref: string;
  status: string;
  amount: number;
  created_at: string;
  items: { name: string; qty: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_confirmation: "Awaiting payment confirmation",
  confirmed: "Payment confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function TrackPage() {
  const [orderRef, setOrderRef] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderStatus | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not find that order.");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-black text-rcc-sand">Track your order</h1>
      <p className="mt-1 text-sm text-rcc-mist">
        Enter your order ID and the mobile number you used at checkout.
      </p>

      <form
        onSubmit={lookup}
        className="mt-6 space-y-4 rounded-2xl border border-rcc-line bg-rcc-panel p-5"
      >
        <label className="block text-sm font-semibold text-rcc-sand">
          Order ID
          <input
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="RCC-7F3K9A"
            className="mt-1 w-full rounded-lg border border-rcc-line bg-rcc-panel2 px-3 py-2.5 font-mono uppercase text-rcc-sand outline-none focus:border-rcc-leaf focus:ring-2 focus:ring-rcc-leaf/30"
          />
        </label>
        <label className="block text-sm font-semibold text-rcc-sand">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-rcc-line bg-rcc-panel2 px-3 py-2.5 text-rcc-sand outline-none focus:border-rcc-leaf focus:ring-2 focus:ring-rcc-leaf/30"
          />
        </label>
        {error && (
          <p className="text-sm font-semibold text-rcc-clay">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-rcc-green py-3 font-bold text-rcc-sand transition hover:bg-rcc-leaf disabled:opacity-60"
        >
          {loading ? "Looking up…" : "Track order"}
        </button>
      </form>

      {order && (
        <div className="mt-6 rounded-2xl border border-rcc-line bg-rcc-panel p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-rcc-sand">
              {order.order_ref}
            </span>
            <span className="rounded-full bg-rcc-lime px-3 py-1 text-xs font-black text-rcc-night">
              {STATUS_LABEL[order.status] || order.status}
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-rcc-mist">
            {order.items?.map((it, i) => (
              <li key={i}>
                {it.qty} × {it.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-rcc-line pt-3 text-sm font-bold text-rcc-sand">
            Total: {formatMoney(order.amount)}
          </p>
          <p className="mt-1 text-xs text-rcc-mist/70">
            Placed {new Date(order.created_at).toLocaleDateString("en-IN")}
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-rcc-mist/70">
        Need help? WhatsApp us at {storeConfig.upiId} or{" "}
        <Link href="/" className="font-semibold text-rcc-leaf hover:underline">
          keep shopping
        </Link>
        .
      </p>
    </div>
  );
}
