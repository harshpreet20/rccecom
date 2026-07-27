"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface Product {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  description: string | null;
  price: number;
  category: string | null;
  sizes: string[];
  personalization: unknown[];
  highlights: string[];
  accent: string;
  emoji: string;
  image: string | null;
  stock: number | null;
  badge: string | null;
  sold_out: boolean;
  active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[];
  kind: string | null;
  amazon_url: string | null;
  flipkart_url: string | null;
}

const money = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

type Draft = Partial<Product> & {
  sizesText?: string;
  highlightsText?: string;
  personalizationJson?: string;
  seoKeywordsText?: string;
};

const emptyDraft: Draft = {
  slug: "",
  name: "",
  category: "",
  price: 0,
  stock: null,
  blurb: "",
  description: "",
  badge: "",
  emoji: "🎾",
  accent: "#0e5a62",
  sort_order: 0,
  active: true,
  sold_out: false,
  sizesText: "",
  highlightsText: "",
  personalizationJson: "[]",
  seo_title: "",
  seo_description: "",
  seoKeywordsText: "",
  kind: "physical",
  amazon_url: "",
  flipkart_url: "",
};

export default function ProductsPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;

  const [products, setProducts] = useState<Product[]>([]);
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
      const res = await fetch("/api/admin/store/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setProducts(json.products || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  function edit(p: Product) {
    setError("");
    setDraft({
      ...p,
      sizesText: (p.sizes || []).join(", "),
      highlightsText: (p.highlights || []).join("\n"),
      personalizationJson: JSON.stringify(p.personalization || [], null, 2),
      seoKeywordsText: (p.seo_keywords || []).join(", "),
    });
  }

  async function save() {
    if (!draft) return;
    setError("");
    let personalization: unknown[] = [];
    try {
      personalization = JSON.parse(draft.personalizationJson || "[]");
      if (!Array.isArray(personalization)) throw new Error();
    } catch {
      setError("Personalization must be valid JSON array.");
      return;
    }
    const payload: Record<string, unknown> = {
      slug: (draft.slug || "").trim(),
      name: (draft.name || "").trim(),
      category: draft.category || null,
      price: Number(draft.price) || 0,
      stock: draft.stock === null || draft.stock === undefined || (draft.stock as unknown) === "" ? null : Number(draft.stock),
      blurb: draft.blurb || null,
      description: draft.description || null,
      badge: draft.badge || null,
      emoji: draft.emoji || "🎾",
      accent: draft.accent || "#0e5a62",
      sort_order: Number(draft.sort_order) || 0,
      active: !!draft.active,
      sold_out: !!draft.sold_out,
      sizes: (draft.sizesText || "").split(",").map((s) => s.trim()).filter(Boolean),
      highlights: (draft.highlightsText || "").split("\n").map((s) => s.trim()).filter(Boolean),
      personalization,
      seo_title: draft.seo_title || null,
      seo_description: draft.seo_description || null,
      seo_keywords: (draft.seoKeywordsText || "").split(",").map((s) => s.trim()).filter(Boolean),
      kind: draft.kind === "membership" ? "membership" : "physical",
      amazon_url: (draft.amazon_url || "").trim() || null,
      flipkart_url: (draft.flipkart_url || "").trim() || null,
    };
    if (!payload.slug || !payload.name) {
      setError("Name and slug are required.");
      return;
    }

    setSaving(true);
    try {
      const isNew = !draft.id;
      const res = await fetch("/api/admin/store/products", {
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

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    await fetch(`/api/store/products?id=${p.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  if (authLoading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const field = "w-full px-3 py-2 rounded-xl bg-[#f5f6f8] neu-input outline-none text-sm text-gray-800";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/products" />
      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Products</h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage the store catalogue, pricing & stock.</p>
          </div>
          <button
            onClick={() => { setError(""); setDraft({ ...emptyDraft }); }}
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-gray-900 text-white neu-btn"
          >
            + New product
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-[#f5f6f8] rounded-2xl p-4 neu-card flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl neu-raised-sm flex-none"
                  style={{ background: `${p.accent}22` }}
                >
                  {p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 truncate">{p.name}</p>
                    {!p.active && <span className="text-[10px] font-bold text-gray-400 uppercase">Hidden</span>}
                    {p.sold_out && <span className="text-[10px] font-bold text-red-500 uppercase">Sold out</span>}
                    {p.badge && <span className="text-[10px] font-bold text-violet-500 uppercase">{p.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {p.category} · {p.slug} · stock: {p.stock ?? "∞"}
                    {p.sizes?.length ? ` · ${p.sizes.join("/")}` : ""}
                  </p>
                </div>
                <div className="text-lg font-extrabold text-gray-800">{money(p.price)}</div>
                <div className="flex gap-2">
                  <button onClick={() => edit(p)} className="px-3 py-2 text-xs font-bold rounded-xl text-gray-700 neu-btn">Edit</button>
                  <button onClick={() => remove(p)} className="px-3 py-2 text-xs font-bold rounded-xl text-red-500 neu-flat">Delete</button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="bg-[#f5f6f8] rounded-2xl p-12 text-center neu-pressed">
                <p className="text-gray-400 text-sm">No products yet. Add your first one.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Editor drawer */}
      {draft && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDraft(null)} />
          <div className="relative w-full max-w-lg h-full bg-[#f5f6f8] shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-gray-900">{draft.id ? "Edit product" : "New product"}</h3>
              <button onClick={() => setDraft(null)} className="w-9 h-9 rounded-xl neu-btn text-gray-500">✕</button>
            </div>

            {error && <div className="mb-4 p-3 rounded-xl text-red-500 text-xs neu-pressed">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Name</label>
                <input className={field} value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input className={field} value={draft.slug || ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="rcc-..." />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <input className={field} value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Type</label>
                <select className={field} value={draft.kind || "physical"} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                  <option value="physical">Physical product (shipped)</option>
                  <option value="membership">Membership (no shipping)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Price (₹)</label>
                <input type="number" className={field} value={draft.price ?? 0} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Stock (blank = ∞)</label>
                <input type="number" className={field} value={draft.stock ?? ""} onChange={(e) => setDraft({ ...draft, stock: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Short blurb</label>
                <input className={field} value={draft.blurb || ""} onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Description</label>
                <textarea rows={3} className={field} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Sizes (comma separated)</label>
                <input className={field} value={draft.sizesText || ""} onChange={(e) => setDraft({ ...draft, sizesText: e.target.value })} placeholder="S, M, L, XL" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Highlights (one per line)</label>
                <textarea rows={3} className={field} value={draft.highlightsText || ""} onChange={(e) => setDraft({ ...draft, highlightsText: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Emoji</label>
                <input className={field} value={draft.emoji || ""} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Accent colour</label>
                <input className={field} value={draft.accent || ""} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} placeholder="#0e5a62" />
              </div>
              <div>
                <label className={labelCls}>Badge</label>
                <input className={field} value={draft.badge || ""} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} placeholder="Flagship" />
              </div>
              <div>
                <label className={labelCls}>Sort order</label>
                <input type="number" className={field} value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Personalization (advanced JSON)</label>
                <textarea rows={3} className={`${field} font-mono text-xs`} value={draft.personalizationJson || "[]"} onChange={(e) => setDraft({ ...draft, personalizationJson: e.target.value })} />
              </div>

              <div className="col-span-2 mt-1 border-t border-[#b8bec7]/50 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">On-page SEO · GEO</p>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>SEO title</label>
                <input className={field} value={draft.seo_title || ""} onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })} placeholder="Shown in search results & browser tab" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>SEO meta description</label>
                <textarea rows={2} className={field} value={draft.seo_description || ""} onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })} placeholder="~155 characters, keyword-rich and human" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>SEO keywords (comma separated)</label>
                <input className={field} value={draft.seoKeywordsText || ""} onChange={(e) => setDraft({ ...draft, seoKeywordsText: e.target.value })} placeholder="premium sweatbands, luxury sweatbands, RCC sweatbands" />
              </div>

              <div className="col-span-2 mt-1 border-t border-[#b8bec7]/50 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-500">Marketplace links</p>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Amazon product URL</label>
                <input className={field} value={draft.amazon_url || ""} onChange={(e) => setDraft({ ...draft, amazon_url: e.target.value })} placeholder="https://amazon.in/..." />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Flipkart product URL</label>
                <input className={field} value={draft.flipkart_url || ""} onChange={(e) => setDraft({ ...draft, flipkart_url: e.target.value })} placeholder="https://flipkart.com/..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                Active (visible in store)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={!!draft.sold_out} onChange={(e) => setDraft({ ...draft, sold_out: e.target.checked })} />
                Sold out
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold neu-btn disabled:opacity-50">
                {saving ? "Saving…" : draft.id ? "Save changes" : "Create product"}
              </button>
              <button onClick={() => setDraft(null)} className="px-5 py-3 rounded-xl text-gray-500 text-sm font-bold neu-flat">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
