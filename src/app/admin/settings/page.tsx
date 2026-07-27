"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "@/components/admin/Sidebar";

interface StoreSettings {
  tax_rate_pct: number;
  shipping_flat_rate: number;
  free_shipping_threshold: number | null;
}

export default function SettingsPage() {
  const { user, loading: authLoading, isStaff, session } = useAuth();
  const router = useRouter();
  const token = session?.access_token;

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && !isStaff) router.push("/admin");
  }, [user, authLoading, isStaff, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/store/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setSettings(json.settings || null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) load();
  }, [isStaff, token, load]);

  async function save() {
    if (!settings) return;
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Save failed");
        return;
      }
      setSettings(json.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
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
      <Sidebar active="/admin/settings" />
      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Store Settings</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Shipping & tax defaults. Applying these at checkout requires wiring the storefront (rccecom) to read this table instead of any hardcoded values.
          </p>
        </div>

        {loading || !settings ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl neu-card p-6">
            {error && <div className="mb-4 p-3 rounded-xl text-red-500 text-xs neu-pressed">{error}</div>}
            {saved && <div className="mb-4 p-3 rounded-xl text-green-600 text-xs neu-pressed">Saved.</div>}

            <div className="grid gap-4">
              <div>
                <label className={labelCls}>Tax rate (%)</label>
                <input
                  type="number"
                  className={field}
                  value={settings.tax_rate_pct}
                  onChange={(e) => setSettings({ ...settings, tax_rate_pct: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Flat shipping rate (₹)</label>
                <input
                  type="number"
                  className={field}
                  value={settings.shipping_flat_rate}
                  onChange={(e) => setSettings({ ...settings, shipping_flat_rate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Free shipping threshold (₹, blank = disabled)</label>
                <input
                  type="number"
                  className={field}
                  value={settings.free_shipping_threshold ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      free_shipping_threshold: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-6 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold neu-btn disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
