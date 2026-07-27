"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface Customer {
  phone: string;
  name: string | null;
  email: string | null;
  address: string | null;
  order_count: number;
  lifetime_spend: number | null;
  last_order_at: string;
  first_order_at: string;
}

const money = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function CustomersPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && !isStaff) router.push("/admin");
  }, [user, authLoading, isStaff, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/store/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCustomers(json.customers || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  if (authLoading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  const totalSpend = customers.reduce((s, c) => s + (c.lifetime_spend || 0), 0);

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/customers" />
      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-400 mt-0.5">Derived from order history &mdash; no separate signup, just who's bought from the store.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-5 neu-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-blue-50">👤</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Customers</div>
            <div className="text-2xl font-extrabold text-gray-900">{customers.length}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 neu-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-emerald-50">💰</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Lifetime Revenue</div>
            <div className="text-2xl font-extrabold text-gray-900">{money(totalSpend)}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 neu-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-pink-50">🔁</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Repeat Customers</div>
            <div className="text-2xl font-extrabold text-gray-900">{customers.filter((c) => c.order_count > 1).length}</div>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email"
          className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-white neu-input outline-none text-sm text-gray-800"
        />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center neu-pressed">
            <p className="text-gray-400 text-sm">No customers yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl neu-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Contact</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Orders</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Lifetime spend</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Last order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.phone} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{c.phone}</div>
                      {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{money(c.lifetime_spend || 0)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {new Date(c.last_order_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
