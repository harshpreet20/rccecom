"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  size?: string;
  custom?: Record<string, string>;
}
interface Order {
  id: string;
  order_ref: string;
  amount: number;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  status: string;
  items: OrderItem[];
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  notes: string | null;
  upi_txn_ref: string | null;
  created_at: string;
}

const FLOW = ["awaiting_confirmation", "confirmed", "packed", "shipped", "delivered"];
const STATUS_META: Record<string, { label: string; cls: string }> = {
  awaiting_confirmation: { label: "Awaiting payment", cls: "text-amber-600" },
  confirmed: { label: "Payment confirmed", cls: "text-green-600" },
  packed: { label: "Packed", cls: "text-blue-600" },
  shipped: { label: "Shipped", cls: "text-violet-600" },
  delivered: { label: "Delivered", cls: "text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "text-red-500" },
};

const money = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const describeCustom = (c?: Record<string, string>) => {
  if (!c) return "";
  const p: string[] = [];
  if (c.name) p.push(c.name);
  if (c.number) p.push(`#${c.number}`);
  return p.join(" · ");
};

export default function OrdersPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && !isStaff) router.push("/admin");
  }, [user, authLoading, isStaff, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/store/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setOrders(json.orders || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/store/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || `Failed to update order status (${res.status})`);
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (e: any) {
      alert(e?.message || "Failed to update order status");
    } finally {
      setBusy(null);
    }
  }

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "awaiting_confirmation");
    const confirmedRevenue = orders
      .filter((o) => !["awaiting_confirmation", "cancelled"].includes(o.status))
      .reduce((s, o) => s + o.amount, 0);
    return { total: orders.length, pending: pending.length, revenue: confirmedRevenue };
  }, [orders]);

  const visible = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  if (authLoading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/orders" />
      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Confirm UPI payments and move orders through fulfilment.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-blue-50">📦</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Orders</div>
            <div className="text-3xl font-extrabold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-amber-50">⏳</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Awaiting payment</div>
            <div className="text-3xl font-extrabold text-amber-500">{stats.pending}</div>
          </div>
          <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-emerald-50">💰</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Confirmed revenue</div>
            <div className="text-3xl font-extrabold text-green-600">{money(stats.revenue)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {["all", ...FLOW, "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                filter === s ? "text-gray-800 neu-pressed" : "text-gray-400 neu-flat hover:text-gray-600"
              }`}
            >
              {s === "all" ? "All" : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-[#f5f6f8] rounded-2xl p-12 text-center neu-pressed">
            <p className="text-gray-400 text-sm">No orders here yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((o) => {
              const meta = STATUS_META[o.status] || { label: o.status, cls: "text-gray-500" };
              const idx = FLOW.indexOf(o.status);
              const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
              return (
                <div key={o.id} className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-800">{o.order_ref}</span>
                        <span className={`text-xs font-bold ${meta.cls}`}>● {meta.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(o.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-gray-900">{money(o.amount)}</div>
                      <div className="text-[11px] text-gray-400">
                        {money(o.subtotal)} + {money(o.tax_amount)} GST + {money(o.shipping_amount)} ship
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-3 grid gap-1.5 rounded-xl p-3 neu-pressed">
                    {o.items?.map((it, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {it.qty} × {it.name}
                          {it.size ? ` · ${it.size}` : ""}
                          {describeCustom(it.custom) ? (
                            <span className="text-violet-600 font-medium"> · {describeCustom(it.custom)}</span>
                          ) : null}
                        </span>
                        <span className="text-gray-500 font-medium">{money(it.qty * it.price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer + payment */}
                  <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">{o.customer_name}</p>
                      <p className="text-gray-500">{o.customer_phone}</p>
                      {o.customer_email && <p className="text-gray-400 text-xs">{o.customer_email}</p>}
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">{o.customer_address}</p>
                      {o.notes && <p className="text-gray-400 text-xs mt-1 italic">“{o.notes}”</p>}
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">UPI reference</p>
                      <p className="font-mono text-sm text-gray-700">{o.upi_txn_ref || "—"}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {o.status === "awaiting_confirmation" && (
                      <button
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, "confirmed")}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-green-600 text-white neu-btn disabled:opacity-50"
                      >
                        ✓ Confirm payment
                      </button>
                    )}
                    {next && o.status !== "awaiting_confirmation" && (
                      <button
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, next)}
                        className="px-4 py-2 text-xs font-bold rounded-xl text-gray-700 neu-btn disabled:opacity-50"
                      >
                        Mark {STATUS_META[next].label} →
                      </button>
                    )}
                    {o.status !== "cancelled" && o.status !== "delivered" && (
                      <button
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, "cancelled")}
                        className="px-4 py-2 text-xs font-bold rounded-xl text-red-500 neu-flat disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    <a
                      href={`https://wa.me/${o.customer_phone.replace(/\D/g, "").slice(-10).padStart(12, "91")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 text-xs font-bold rounded-xl text-green-700 neu-flat"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
