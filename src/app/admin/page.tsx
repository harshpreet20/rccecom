"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AgentCard from "@/components/admin/AgentCard";
import StatsBar from "@/components/admin/StatsBar";
import CompetitorBar from "@/components/admin/CompetitorBar";
import StatusBar from "@/components/admin/StatusBar";
import Sidebar from "@/components/admin/Sidebar";
import { useAuth } from "@/components/admin/AuthProvider";

const AGENTS = [
  {
    name: "Ideator",
    description: "Scout ideas & classify as AI Reel / Real / UGC",
    icon: "\u{1F4A1}",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    endpoint: "/api/admin/agents/ideator",
  },
  {
    name: "Hook & Script",
    description: "Write scroll-stopping hooks and reel scripts",
    icon: "\u{1F3AC}",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    endpoint: "/api/admin/agents/hooks",
  },
  {
    name: "AI Reel Prompt",
    description: "Write detailed AI video production prompts ready to paste",
    icon: "\u{1F3A8}",
    color: "#F97316",
    bgColor: "#FFF7ED",
    endpoint: "/api/admin/agents/reel-prompt",
    configKey: "quality",
    configOptions: [
      { label: "24 fps Social", value: "social" },
      { label: "60 fps Cinematic", value: "cinematic" },
    ],
  },
  {
    name: "Planner",
    description: "Plan your 7-day content calendar",
    icon: "\u{1F4C5}",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    endpoint: "/api/admin/agents/planner",
  },
  {
    name: "Analyst",
    description: "Deep-dive your stats and performance metrics",
    icon: "\u{1F4CA}",
    color: "#10B981",
    bgColor: "#ECFDF5",
    endpoint: "/api/admin/agents/analyst",
  },
  {
    name: "DM Manager",
    description: "Craft DM templates for engagement & outreach",
    icon: "\u{1F4AC}",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    endpoint: "/api/admin/agents/dm-manager",
  },
];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, status, statusError, loading: authLoading, retryStatus, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && status && status !== "approved") router.push("/admin/login");
  }, [user, authLoading, status, router]);

  function loadDashboardData() {
    return fetch("/api/admin/data", {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user || status !== "approved") return;
    loadDashboardData();
  }, [user, status]);

  if (!authLoading && user && statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-5">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Couldn't verify your account status.</p>
          <button
            onClick={retryStatus}
            className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-all px-4 py-2 rounded-lg neu-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || !user || status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin" />

      <main className="max-w-6xl mx-auto px-5 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Your content performance at a glance
                  {data?.scrapedAt && (
                    <> &middot; Updated {new Date(data.scrapedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>
                  )}
                </p>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">System Status</h3>
              </div>
              <StatusBar />
            </section>

            <section>
              <StatsBar stats={data?.me || null} />
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Competitors</h3>
              </div>
              <CompetitorBar competitors={data?.competitors || []} />
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">AI Agents</h3>
                <Link
                  href="/admin/reports"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-all px-3 py-1.5 rounded-lg neu-btn"
                >
                  View history &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AGENTS.map((agent) => (
                  <AgentCard key={agent.name} {...agent} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
