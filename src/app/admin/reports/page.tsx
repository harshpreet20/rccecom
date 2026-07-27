"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/admin/Sidebar";

function sanitizeReport(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "");
  const firstTag = text.indexOf("<");
  const lastTag = text.lastIndexOf(">");
  if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
    text = text.substring(firstTag, lastTag + 1);
  }
  if (!text.startsWith("<")) {
    text = `<div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
  }
  return text;
}

const AGENT_META: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  ideator:      { icon: "\u{1F4A1}", color: "#F59E0B", bgColor: "#FFFBEB", label: "Ideator" },
  hooks:        { icon: "\u{1F3AC}", color: "#EC4899", bgColor: "#FDF2F8", label: "Hook & Script" },
  planner:      { icon: "\u{1F4C5}", color: "#8B5CF6", bgColor: "#F5F3FF", label: "Planner" },
  analyst:      { icon: "\u{1F4CA}", color: "#10B981", bgColor: "#ECFDF5", label: "Analyst" },
  "dm-manager":  { icon: "\u{1F4AC}", color: "#3B82F6", bgColor: "#EFF6FF", label: "DM Manager" },
  "reel-prompt": { icon: "\u{1F3A8}", color: "#F97316", bgColor: "#FFF7ED", label: "AI Reel Prompt" },
  "sponsor-ideator":      { icon: "\u{1F4A1}", color: "#F59E0B", bgColor: "#FFFBEB", label: "Sponsor Ideator" },
  "sponsor-hooks":        { icon: "\u{1F3AC}", color: "#EC4899", bgColor: "#FDF2F8", label: "Sponsor Hook & Script" },
  "sponsor-reel-prompt":  { icon: "\u{1F3A8}", color: "#F97316", bgColor: "#FFF7ED", label: "Sponsor AI Reel" },
  "sponsor-planner":      { icon: "\u{1F4C5}", color: "#8B5CF6", bgColor: "#F5F3FF", label: "Sponsor Planner" },
  "sponsor-analyst":      { icon: "\u{1F4CA}", color: "#10B981", bgColor: "#ECFDF5", label: "Sponsor Analyst" },
  "sponsor-dm-manager":   { icon: "\u{1F4AC}", color: "#3B82F6", bgColor: "#EFF6FF", label: "Sponsor DM Manager" },
};

interface Report {
  id: string;
  agent_name: string;
  result: string;
  created_at: string;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function downloadHtml(filename: string, html: string) {
    const wrapper = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${filename}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:24px;background:#fafafa;color:#1f2937}
.section{background:#fff;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e5e7eb}
.section-header{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #f3f4f6}
.section-header .badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;color:#fff}
.section-header .date{font-size:11px;color:#9ca3af;margin-left:auto}
@media print{body{padding:0;background:#fff}.section{box-shadow:none;break-inside:avoid}}</style>
</head><body>${html}</body></html>`;
    const blob = new Blob([wrapper], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadSingle(report: Report) {
    const meta = AGENT_META[report.agent_name] || { label: report.agent_name, color: "#6B7280" };
    const date = new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const html = `<div class="section">
      <div class="section-header"><span class="badge" style="background:${meta.color}">${meta.label}</span><span class="date">${date}</span></div>
      ${sanitizeReport(report.result)}
    </div>`;
    downloadHtml(`${meta.label}-Report-${date.replace(/\s/g, "-")}`, html);
  }

  function downloadCombined() {
    const seen = new Set<string>();
    const latest: Report[] = [];
    for (const r of reports) {
      if (!seen.has(r.agent_name)) {
        seen.add(r.agent_name);
        latest.push(r);
      }
    }
    if (latest.length === 0) return;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const sections = latest.map((r) => {
      const meta = AGENT_META[r.agent_name] || { label: r.agent_name, color: "#6B7280" };
      const rDate = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `<div class="section">
        <div class="section-header"><span class="badge" style="background:${meta.color}">${meta.label}</span><span class="date">${rDate}</span></div>
        ${sanitizeReport(r.result)}
      </div>`;
    }).join("\n");
    const header = `<div style="text-align:center;margin-bottom:32px">
      <h1 style="font-size:24px;font-weight:800;margin:0">ContentAgent — Combined Report</h1>
      <p style="color:#9ca3af;font-size:13px;margin-top:4px">${date} &middot; ${latest.length} agents</p>
    </div>`;
    downloadHtml(`Combined-Report-${date.replace(/\s/g, "-")}`, header + sections);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  const { status } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && status && status !== "approved") router.push("/admin/login");
  }, [user, authLoading, status, router]);

  useEffect(() => {
    const params = filter === "all" ? "" : `?agent=${filter}`;
    fetch(`/api/reports${params}`)
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/reports" />

      <main className="max-w-4xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Reports</h2>
            <p className="text-sm text-gray-400 mt-0.5">History of all agent outputs</p>
          </div>
          {reports.length > 0 && (
            <button
              onClick={downloadCombined}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] neu-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Combined
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => { setFilter("all"); setLoading(true); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-gray-900 text-white neu-pressed"
                : "bg-[#f5f6f8] text-gray-500 neu-btn"
            }`}
          >
            All
          </button>
          {Object.entries(AGENT_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setLoading(true); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filter === key
                  ? "text-white neu-pressed"
                  : "bg-[#f5f6f8] text-gray-500 neu-btn"
              }`}
              style={filter === key ? { backgroundColor: meta.color } : {}}
            >
              <span className="text-sm">{meta.icon}</span>
              {meta.label}
            </button>
          ))}
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl neu-pressed">
              {"\u{1F4ED}"}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No reports yet</h3>
            <p className="text-sm text-gray-400">
              Run an agent from the{" "}
              <Link href="/admin" className="text-violet-600 hover:underline font-medium">dashboard</Link>{" "}
              to generate your first report.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const meta = AGENT_META[report.agent_name] || { icon: "\u{1F916}", color: "#6B7280", bgColor: "#F3F4F6", label: report.agent_name };
              const isExpanded = expandedId === report.id;

              return (
                <div
                  key={report.id}
                  className="bg-[#f5f6f8] rounded-2xl neu-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:opacity-90 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                        style={{ backgroundColor: meta.bgColor }}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{meta.label}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(report.created_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <div
                        className="mt-4 text-sm text-gray-700 leading-relaxed bg-[#f5f6f8] rounded-xl p-4 max-h-[600px] overflow-y-auto report-html neu-pressed"
                        dangerouslySetInnerHTML={{ __html: sanitizeReport(report.result) }}
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingle(report);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 rounded-lg transition-all neu-btn"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id);
                          }}
                          disabled={deletingId === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 rounded-lg transition-all disabled:opacity-50 neu-btn"
                        >
                          {deletingId === report.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
