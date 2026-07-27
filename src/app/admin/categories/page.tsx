"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

type Draft = Partial<Category>;

const emptyDraft: Draft = { name: "", slug: "", description: "", sort_order: 0, active: true };

export default function CategoriesPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;

  const [categories, setCategories] = useState<Category[]>([]);
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
      const res = await fetch("/api/admin/store/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCategories(json.categories || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  function slugify(s: string) {
    return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function save() {
    if (!draft) return;
    setError("");
    const payload = {
      name: (draft.name || "").trim(),
      slug: (draft.slug || "").trim() || slugify(draft.name || ""),
      description: draft.description || null,
      sort_order: Number(draft.sort_order) || 0,
      active: !!draft.active,
    };
    if (!payload.name || !payload.slug) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    try {
      const isNew = !draft.id;
      const res = await fetch("/api/admin/store/categories", {
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

  async function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const res = await fetch(`/api/admin/store/categories?id=${c.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
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
      <Sidebar active="/admin/categories" />
      <main className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Categories</h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage the collections products can be grouped into.</p>
          </div>
          <button
            onClick={() => { setError(""); setDraft({ ...emptyDraft }); }}
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-gray-900 text-white neu-btn"
          >
            + New category
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3">
            {categories.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-4 neu-card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 truncate">{c.name}</p>
                    {!c.active && <span className="text-[10px] font-bold text-gray-400 uppercase">Hidden</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.slug}{c.description ? ` · ${c.description}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setError(""); setDraft(c); }} className="px-3 py-2 text-xs font-bold rounded-xl text-gray-700 neu-btn">Edit</button>
                  <button onClick={() => remove(c)} className="px-3 py-2 text-xs font-bold rounded-xl text-red-500 neu-flat">Delete</button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center neu-pressed">
                <p className="text-gray-400 text-sm">No categories yet. Add your first one.</p>
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
              <h3 className="text-lg font-extrabold text-gray-900">{draft.id ? "Edit category" : "New category"}</h3>
              <button onClick={() => setDraft(null)} className="w-9 h-9 rounded-xl neu-btn text-gray-500">✕</button>
            </div>

            {error && <div className="mb-4 p-3 rounded-xl text-red-500 text-xs neu-pressed">{error}</div>}

            <div className="grid gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input className={field} value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Slug (auto from name if blank)</label>
                <input className={field} value={draft.slug || ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder={slugify(draft.name || "") || "category-slug"} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={2} className={field} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Sort order</label>
                <input type="number" className={field} value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                Active (visible in store)
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold neu-btn disabled:opacity-50">
                {saving ? "Saving…" : draft.id ? "Save changes" : "Create category"}
              </button>
              <button onClick={() => setDraft(null)} className="px-5 py-3 rounded-xl text-gray-500 text-sm font-bold neu-flat">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
