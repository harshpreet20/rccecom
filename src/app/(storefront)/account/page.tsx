"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { formatMoney } from "@/lib/format";

type OrderItem = { name: string; qty: number };
type AccountOrder = {
  orderRef: string;
  status: string;
  amount: number;
  items: OrderItem[];
  createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  awaiting_confirmation: "bg-rcc-goldsoft/20 text-rcc-gold",
  confirmed: "bg-rcc-leaf/20 text-rcc-leaf",
  packed: "bg-rcc-leaf/20 text-rcc-leaf",
  shipped: "bg-rcc-lime/20 text-rcc-lime",
  delivered: "bg-rcc-lime text-rcc-night",
  cancelled: "bg-rcc-clay/20 text-rcc-clay",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_confirmation: "Awaiting confirmation",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const field =
  "mt-1 w-full rounded-lg border border-rcc-line bg-rcc-panel2 px-3 py-2.5 text-rcc-sand outline-none transition focus:border-rcc-gold focus:ring-2 focus:ring-rcc-gold/30";

export default function AccountPage() {
  const router = useRouter();
  const { user, session, loading } = useCustomerAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/account/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    supabase
      .from("customer_profiles")
      .select("name, phone, email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.name || "");
        setPhone(data?.phone || "");
        setEmail(data?.email || user.email || "");
        setProfileLoaded(true);
      });
  }, [user]);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/account/orders", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setOrdersError(data.error);
        else setOrders(data.orders || []);
      })
      .catch(() => setOrdersError("Could not load your orders."));
  }, [session?.access_token]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveMsg("");
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("customer_profiles").upsert({
      id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
    setSaveMsg(error ? "Could not save. Please try again." : "Saved.");
    setSaving(false);
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-rcc-mist">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-black text-rcc-sand">Your account</h1>
      <p className="mt-1 text-sm text-rcc-mist">
        Manage your details and view your order history.
      </p>

      <form
        onSubmit={saveProfile}
        className="mt-6 space-y-4 rounded-2xl border border-rcc-line bg-rcc-panel p-5 sm:p-6"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-rcc-gold">
          Profile
        </h2>
        <label className="block text-sm font-semibold text-rcc-sand">
          Full name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            disabled={!profileLoaded}
          />
        </label>
        <label className="block text-sm font-semibold text-rcc-sand">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            type="email"
            disabled={!profileLoaded}
          />
        </label>
        <label className="block text-sm font-semibold text-rcc-sand">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={field}
            inputMode="numeric"
            disabled={!profileLoaded}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !profileLoaded}
            className="btn-tactile rounded-full px-6 py-2.5 text-sm font-black uppercase tracking-wide text-rcc-night disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saveMsg && (
            <span className="text-sm font-semibold text-rcc-leaf">{saveMsg}</span>
          )}
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rcc-gold">
          Order history
        </h2>

        {ordersError && (
          <p className="mt-3 text-sm font-semibold text-rcc-clay">{ordersError}</p>
        )}

        {orders === null && !ordersError && (
          <p className="mt-3 text-sm text-rcc-mist">Loading your orders…</p>
        )}

        {orders !== null && orders.length === 0 && (
          <p className="mt-3 text-sm text-rcc-mist">
            No orders yet.{" "}
            <Link href="/#catalogue" className="font-semibold text-rcc-leaf hover:underline">
              Start shopping
            </Link>
            .
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {orders?.map((o) => (
            <li
              key={o.orderRef}
              className="rounded-2xl border border-rcc-line bg-rcc-panel p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-rcc-sand">
                  {o.orderRef}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    STATUS_STYLE[o.status] || "bg-rcc-line text-rcc-mist"
                  }`}
                >
                  {STATUS_LABEL[o.status] || o.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-rcc-mist/70">
                Placed {new Date(o.createdAt).toLocaleDateString("en-IN")}
              </p>
              <ul className="mt-3 space-y-1 text-sm text-rcc-mist">
                {o.items?.map((it, i) => (
                  <li key={i}>
                    {it.qty} × {it.name}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-rcc-line pt-3">
                <span className="text-xs text-rcc-mist/70">
                  {o.items?.reduce((n, it) => n + it.qty, 0) || 0} item(s)
                </span>
                <span className="text-sm font-black text-rcc-sand">
                  {formatMoney(o.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
