"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";

interface Check {
  status: "ok" | "pending" | "error";
  latency?: number;
  error?: string;
}

interface HealthData {
  healthy: boolean;
  checks: Record<string, Check>;
}

const SERVICE_META: Record<string, { label: string; icon: string }> = {
  database: { label: "Database", icon: "\u{1F5C4}" },
  anthropic: { label: "AI Agents", icon: "\u{1F916}" },
  scraper: { label: "Scraper", icon: "\u{1F578}" },
  data_freshness: { label: "Data", icon: "\u{1F4C8}" },
  brain: { label: "Brain", icon: "\u{1F9E0}" },
};

const WARN_ERRORS = ["Not generated yet", "No scraped data", "Regenerating", "New data available"];

export default function StatusBar() {
  const { session } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [brainGenerating, setBrainGenerating] = useState(false);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  async function fetchHealth() {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/admin/health", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      setHealth(json);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  async function generateBrain() {
    if (!session?.access_token) return;
    setBrainGenerating(true);
    try {
      const res = await fetch("/api/admin/brain", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) {
        await fetchHealth();
      }
    } catch {
      // silent
    } finally {
      setBrainGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f5f6f8] rounded-2xl neu-raised-sm">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400 font-medium">Checking systems...</span>
      </div>
    );
  }

  const checks = health?.checks || {};
  const keys = Object.keys(SERVICE_META);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {keys.map((key) => {
        const check = checks[key];
        const meta = SERVICE_META[key];
        const isOk = check?.status === "ok";
        const isUnknown = !check;
        const isWarn = !isOk && check?.error && WARN_ERRORS.includes(check.error);
        const needsBrainAction = key === "brain" && !isOk && (check?.error === "Not generated yet" || check?.error === "New data available");

        let dotClass = "bg-gray-300";
        if (!isUnknown) {
          if (isOk) dotClass = "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]";
          else if (isWarn) dotClass = "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]";
          else dotClass = "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.4)]";
        }

        return (
          <div
            key={key}
            className="flex items-center gap-2 px-3 py-2 bg-[#f5f6f8] rounded-xl neu-flat"
            title={
              isUnknown
                ? "Unknown"
                : isOk
                ? `OK${check.latency != null ? ` (${check.latency}ms)` : ""}`
                : check.error || "Error"
            }
          >
            <span className="text-sm">{meta.icon}</span>
            <span className="text-xs font-semibold text-gray-600">{meta.label}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${dotClass}${check?.error === "Regenerating" ? " animate-pulse" : ""}`} />
            {needsBrainAction && (
              <button
                onClick={generateBrain}
                disabled={brainGenerating}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-800 transition-all disabled:opacity-50 px-2 py-0.5 rounded-lg neu-btn"
              >
                {brainGenerating ? "Generating..." : check?.error === "New data available" ? "Refresh" : "Generate"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
