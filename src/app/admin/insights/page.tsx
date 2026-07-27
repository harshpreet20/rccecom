"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface OrderItem { name: string; qty: number; price: number }
interface Order {
  id: string;
  order_ref: string;
  amount: number;
  status: string;
  items: OrderItem[];
  customer_name: string;
  customer_phone: string;
  created_at: string;
}

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const PAID = ["confirmed", "packed", "shipped", "delivered"];
const DAY = 86400000;

function dayKey(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** Full YYYY-MM-DD bucket key so same-day-different-year orders don't get
 * merged in the 14-day chart (dayKey alone has no year, e.g. "05 Jul"). */
function dateBucketKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Pure aggregation so the numbers are easy to reason about. */
function computeInsights(orders: Order[]) {
  const paid = orders.filter((o) => PAID.includes(o.status));
  const pending = orders.filter((o) => o.status === "awaiting_confirmation");
  const cancelled = orders.filter((o) => o.status === "cancelled");

  const now = Date.now();
  const staleUnpaid = pending.filter(
    (o) => now - new Date(o.created_at).getTime() > DAY,
  );
  const lost = [...cancelled, ...staleUnpaid];

  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const units = paid.reduce(
    (s, o) => s + (o.items || []).reduce((n, i) => n + i.qty, 0),
    0,
  );

  // Revenue over the last 14 days (paid orders).
  const days: { key: string; date: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    days.push({ key: dateBucketKey(d), date: dayKey(d), revenue: 0, orders: 0 });
  }
  const idxByDate = new Map(days.map((d, i) => [d.key, i]));
  for (const o of paid) {
    const k = dateBucketKey(new Date(o.created_at));
    const i = idxByDate.get(k);
    if (i !== undefined) {
      days[i].revenue += o.amount;
      days[i].orders += 1;
    }
  }

  const statusOrder = [
    "awaiting_confirmation",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const statusColors: Record<string, string> = {
    awaiting_confirmation: "#f59e0b",
    confirmed: "#10b981",
    packed: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#059669",
    cancelled: "#ef4444",
  };
  const statusData = statusOrder.map((s) => ({
    name: s.replace("awaiting_confirmation", "awaiting").replace("_", " "),
    value: orders.filter((o) => o.status === s).length,
    color: statusColors[s],
  }));

  // Top products by revenue (paid orders).
  const prodMap = new Map<string, { name: string; units: number; revenue: number }>();
  for (const o of paid) {
    for (const it of o.items || []) {
      const cur = prodMap.get(it.name) || { name: it.name, units: 0, revenue: 0 };
      cur.units += it.qty;
      cur.revenue += it.qty * it.price;
      prodMap.set(it.name, cur);
    }
  }
  const topProducts = Array.from(prodMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return {
    revenue,
    units,
    orders: paid.length,
    aov: paid.length ? revenue / paid.length : 0,
    pendingCount: pending.length,
    pendingValue: pending.reduce((s, o) => s + o.amount, 0),
    lost,
    lostValue: lost.reduce((s, o) => s + o.amount, 0),
    days,
    statusData,
    topProducts,
  };
}

export default function InsightsPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  const s = useMemo(() => computeInsights(orders), [orders]);

  if (authLoading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const card = "bg-[#f5f6f8] rounded-2xl p-5 neu-card";

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/insights" />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Store Insights</h2>
          <p className="text-sm text-gray-400 mt-0.5">Revenue, fulfilment and lost sales at a glance.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={card}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-emerald-50">💰</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Revenue</div>
                <div className="text-3xl font-extrabold text-green-600">{money(s.revenue)}</div>
              </div>
              <div className={card}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-blue-50">📦</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Paid orders</div>
                <div className="text-3xl font-extrabold text-gray-900">{s.orders}</div>
              </div>
              <div className={card}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-violet-50">🧾</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Avg order</div>
                <div className="text-3xl font-extrabold text-gray-900">{money(s.aov)}</div>
              </div>
              <div className={card}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-pink-50">🏷️</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Units sold</div>
                <div className="text-3xl font-extrabold text-gray-900">{s.units}</div>
              </div>
            </div>

            {/* Alerts row */}
            <div className="grid grid-cols-2 gap-3">
              <div className={card}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-amber-50">⏳</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Awaiting payment</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-500">{s.pendingCount}</span>
                  <span className="text-sm text-gray-400">{money(s.pendingValue)} pending</span>
                </div>
              </div>
              <div className={card}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-red-50">⚠️</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Lost sales</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-red-500">{s.lost.length}</span>
                  <span className="text-sm text-gray-400">{money(s.lostValue)} lost</span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className={`${card} lg:col-span-2`}>
                <div className="text-sm font-bold text-gray-700 mb-3">Revenue · last 14 days</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={s.days} margin={{ left: -20, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={1} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip formatter={(v) => money(Number(v))} />
                    <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className={card}>
                <div className="text-sm font-bold text-gray-700 mb-3">Orders by status</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={s.statusData} margin={{ left: -20, right: 8, top: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {s.statusData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top products */}
            <div className={card}>
              <div className="text-sm font-bold text-gray-700 mb-3">Top products by revenue</div>
              {s.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">No paid orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {s.topProducts.map((p) => {
                    const max = s.topProducts[0].revenue || 1;
                    return (
                      <div key={p.name} className="flex items-center gap-3">
                        <div className="w-40 text-sm text-gray-600 truncate">{p.name}</div>
                        <div className="flex-1 h-3 rounded-full neu-pressed overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(p.revenue / max) * 100}%` }} />
                        </div>
                        <div className="w-24 text-right text-sm font-bold text-gray-700">{money(p.revenue)}</div>
                        <div className="w-16 text-right text-xs text-gray-400">{p.units} pcs</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lost sales — recoverable */}
            <div className={card}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-gray-700">Lost & at-risk sales</div>
                <span className="text-xs text-gray-400">Unpaid &gt; 24h or cancelled</span>
              </div>
              {s.lost.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing lost — nice. 🎉</p>
              ) : (
                <div className="space-y-2">
                  {s.lost.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl p-3 neu-pressed">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-gray-700">{o.order_ref}</span>
                        <span className="text-sm text-gray-500"> · {o.customer_name}</span>
                        <span className={`ml-2 text-xs font-bold ${o.status === "cancelled" ? "text-red-500" : "text-amber-500"}`}>
                          {o.status === "cancelled" ? "cancelled" : "unpaid"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-none">
                        <span className="text-sm font-bold text-gray-600">{money(o.amount)}</span>
                        <a
                          href={`https://wa.me/${o.customer_phone.replace(/\D/g, "").slice(-10).padStart(12, "91")}?text=${encodeURIComponent(`Hi ${o.customer_name}, your RCC order ${o.order_ref} is still open — reply here to complete it! 🎾`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg text-green-700 neu-btn"
                        >
                          💬 Recover
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
