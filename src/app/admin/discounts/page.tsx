"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface Discount {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  times_used: number;
  min_order_amount: number;
}

type Draft = Partial<Discount>;

const emptyDraft: Draft = {
  code: "",
  type: "percent",
  value: 10,
  active: true,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
  min_order_amount: 0,
};

function toDateInput(v: string | null | undefined) {
  if (!v) return "";
  return v.slice(0, 10);
}

export default function DiscountsPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && !isStaff) router.push("/admin");
  }, [user, authLoading, isStaff, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/store/discounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setDiscounts(json.discounts || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  async function save() {
    if (!draft) return;
    setError("");
    const payload = {
      code: (draft.code || "").trim().toUpperCase(),
      type: draft.type === "flat" ? "flat" : "percent",
      value: Number(draft.value) || 0,
      active: !!draft.active,
      starts_at: draft.starts_at || null,
      ends_at: draft.ends_at || null,
      usage_limit: draft.usage_limit === null || draft.usage_limit === undefined || (draft.usage_limit as unknown) === "" ? null : Number(draft.usage_limit),
      min_order_amount: Number(draft.min_order_amount) || 0,
    };
    if (!payload.code || !payload.value) {
      setError("Code and value are required.");
      return;
    }

    setSaving(true);
    try {
      const isNew = !draft.id;
      const res = await fetch("/api/admin/store/discounts", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(isNew ? payload : { id: draft.id, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Save failed");
        return;
      }
      setDraft(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(d: Discount) {
    if (!confirm(`Delete code "${d.code}"?`)) return;
    const res = await fetch(`/api/admin/store/discounts?id=${d.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setDiscounts((prev) => prev.filter((x) => x.id !== d.id));
    }
  }

  if (authLoading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const field = "w-full px-3 py-2 rounded-xl bg-white neu-input outline-none text-sm text-gray-800";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/discounts" />
      <main className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Discounts</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Coupon codes staff can create here. Applying them at checkout requires wiring the storefront (rccecom) to call <code className="text-[11px]">validate_discount_code</code>.
            </p>
          </div>
          <button
            onClick={() => { setError(""); setDraft({ ...emptyDraft }); }}
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-gray-900 text-white neu-btn shrink-0"
          >
            + New code
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3">
            {discounts.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl p-4 neu-card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-gray-800">{d.code}</p>
                    {!d.active && <span className="text-[10px] font-bold text-gray-400 uppercase">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {d.type === "percent" ? `${d.value}% off` : `₹${d.value} off`}
                    {d.min_order_amount > 0 ? ` · min ₹${d.min_order_amount}` : ""}
                    {d.usage_limit ? ` · used ${d.times_used}/${d.usage_limit}` : ` · used ${d.times_used}×`}
                    {d.ends_at ? ` · expires ${toDateInput(d.ends_at)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setError(""); setDraft(d); }} className="px-3 py-2 text-xs font-bold rounded-xl text-gray-700 neu-btn">Edit</button>
                  <button onClick={() => remove(d)} className="px-3 py-2 text-xs font-bold rounded-xl text-red-500 neu-flat">Delete</button>
                </div>
              </div>
            ))}
            {discounts.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center neu-pressed">
                <p className="text-gray-400 text-sm">No discount codes yet.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {draft && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDraft(null)} />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-gray-900">{draft.id ? "Edit code" : "New code"}</h3>
              <button onClick={() => setDraft(null)} className="w-9 h-9 rounded-xl neu-btn text-gray-500">✕</button>
            </div>

            {error && <div className="mb-4 p-3 rounded-xl text-red-500 text-xs neu-pressed">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Code</label>
                <input className={`${field} font-mono uppercase`} value={draft.code || ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="RCC10" />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select className={field} value={draft.type || "percent"} onChange={(e) => setDraft({ ...draft, type: e.target.value as "percent" | "flat" })}>
                  <option value="percent">Percent off</option>
                  <option value="flat">Flat amount off (₹)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Value</label>
                <input type="number" className={field} value={draft.value ?? 0} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Starts</label>
                <input type="date" className={field} value={toDateInput(draft.starts_at)} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Ends</label>
                <input type="date" className={field} value={toDateInput(draft.ends_at)} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Usage limit (blank = unlimited)</label>
                <input type="number" className={field} value={draft.usage_limit ?? ""} onChange={(e) => setDraft({ ...draft, usage_limit: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Minimum order (₹)</label>
                <input type="number" className={field} value={draft.min_order_amount ?? 0} onChange={(e) => setDraft({ ...draft, min_order_amount: Number(e.target.value) })} />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                Active
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold neu-btn disabled:opacity-50">
                {saving ? "Saving…" : draft.id ? "Save changes" : "Create code"}
              </button>
              <button onClick={() => setDraft(null)} className="px-5 py-3 rounded-xl text-gray-500 text-sm font-bold neu-flat">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
