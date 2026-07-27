"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/admin/Sidebar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = ["#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#3B82F6", "#6366F1", "#EF4444", "#14B8A6"];

interface TopPost {
  caption: string;
  likes: number;
  comments: number;
  views: number;
  type: string;
  url: string;
  timestamp: string;
}

interface CompStat {
  handle: string;
  postCount: number;
  totalLikes: number;
  avgLikes: number;
  totalComments: number;
  avgComments: number;
}

export default function AnalyticsPage() {
  const { user, loading: authLoading, status, session } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [insights, setInsights] = useState<any>({});
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<CompStat[]>([]);
  const [scrapedAt, setScrapedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && status && status !== "approved") router.push("/admin/login");
  }, [user, authLoading, status, router]);

  useEffect(() => {
    if (!user || status !== "approved") return;
    loadAnalytics();
  }, [user, status]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/instagram/insights", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAccount(json.account);
      setInsights(json.insights || {});
      setTopPosts(json.topPosts || []);
      setTypeBreakdown(json.typeBreakdown || []);
      setCompetitors(json.competitors || []);
      setScrapedAt(json.scrapedAt);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cron/scrape", { method: "POST" });
      const json = await res.json();
      if (json.success) await loadAnalytics();
      else setError(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const postChartData = topPosts.slice(0, 10).map((p) => ({
    name: (p.caption || "").slice(0, 18) + "...",
    likes: p.likes,
    comments: p.comments,
    views: p.views,
  }));

  const compChartData = competitors.map((c) => ({
    name: `@${c.handle}`,
    avgLikes: c.avgLikes,
    avgComments: c.avgComments,
    posts: c.postCount,
  }));

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/analytics" />

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Analytics</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Performance insights from scraped Instagram data
              {scrapedAt && <> - Updated {new Date(scrapedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-60 neu-btn"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Scraping..." : "Refresh Data"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50/60 rounded-2xl text-red-600 text-sm mb-6 neu-pressed">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Account overview */}
            {account && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Posts", value: account.posts, color: "#F59E0B" },
                  { label: "Avg Likes", value: account.avgLikes, color: "#EC4899" },
                  { label: "Avg Comments", value: account.avgComments, color: "#8B5CF6" },
                  { label: "Total Likes", value: account.totalLikes >= 1000 ? `${(account.totalLikes / 1000).toFixed(1)}K` : account.totalLikes, color: "#10B981" },
                  { label: "Total Views", value: account.totalViews >= 1000 ? `${(account.totalViews / 1000).toFixed(1)}K` : account.totalViews, color: "#3B82F6" },
                  { label: "Engagement", value: insights.engagement?.toLocaleString() || "0", color: "#6366F1" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{stat.label}</div>
                    <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Top posts chart */}
            {postChartData.length > 0 && (
              <section className="bg-[#f5f6f8] rounded-2xl neu-card p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Posts by Likes</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={postChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, background: "#e0e5ec", boxShadow: "4px 4px 8px #b8bec7, -4px -4px 8px #ffffff", border: "none", fontSize: 12 }} />
                      <Bar dataKey="likes" fill="#EC4899" radius={[6, 6, 0, 0]} name="Likes" />
                      <Bar dataKey="comments" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Comments" />
                      <Bar dataKey="views" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Views" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content type breakdown */}
              {typeBreakdown.length > 0 && (
                <section className="bg-[#f5f6f8] rounded-2xl neu-card p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Content Type Breakdown</h3>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeBreakdown}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {typeBreakdown.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, background: "#e0e5ec", boxShadow: "4px 4px 8px #b8bec7, -4px -4px 8px #ffffff", border: "none", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Competitor comparison */}
              {compChartData.length > 0 && (
                <section className="bg-[#f5f6f8] rounded-2xl neu-card p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Competitor Comparison - Avg Likes</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: `@${account?.username}`, avgLikes: account?.avgLikes || 0, avgComments: account?.avgComments || 0 }, ...compChartData]} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                        <Tooltip contentStyle={{ borderRadius: 12, background: "#e0e5ec", boxShadow: "4px 4px 8px #b8bec7, -4px -4px 8px #ffffff", border: "none", fontSize: 12 }} />
                        <Bar dataKey="avgLikes" fill="#10B981" radius={[0, 6, 6, 0]} name="Avg Likes" />
                        <Bar dataKey="avgComments" fill="#F59E0B" radius={[0, 6, 6, 0]} name="Avg Comments" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </div>

            {/* Posts detail table */}
            {topPosts.length > 0 && (
              <section className="bg-[#f5f6f8] rounded-2xl neu-card p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Post Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#d0d5dc]">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Post</th>
                        <th className="text-center py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Type</th>
                        <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Likes</th>
                        <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Comments</th>
                        <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Views</th>
                        <th className="text-right py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPosts.map((p, i) => (
                        <tr key={i} className={`border-b border-[#d0d5dc] ${i % 2 === 0 ? "bg-[#d8dde4]/30" : ""}`}>
                          <td className="py-3 px-2">
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline font-medium">
                                {(p.caption || "No caption").slice(0, 40)}...
                              </a>
                            ) : (
                              <span className="font-medium text-gray-700">{(p.caption || "No caption").slice(0, 40)}...</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.type === "Video" ? "bg-pink-50 text-pink-600" :
                              p.type === "Sidecar" ? "bg-violet-50 text-violet-600" :
                              "bg-amber-50 text-amber-600"
                            }`}>
                              {p.type === "Sidecar" ? "Carousel" : p.type}
                            </span>
                          </td>
                          <td className="text-right py-3 px-2 font-semibold text-pink-600">{p.likes.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{p.comments.toLocaleString()}</td>
                          <td className="text-right py-3 px-2 text-blue-600">{p.views.toLocaleString()}</td>
                          <td className="text-right py-3 px-2 text-gray-400 text-xs">
                            {p.timestamp ? new Date(p.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
