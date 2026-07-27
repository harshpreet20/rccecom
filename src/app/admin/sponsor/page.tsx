"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import AgentCard from "@/components/admin/AgentCard";
import { useAuth } from "@/components/admin/AuthProvider";

function SponsorStatsBar({ sponsor }: { sponsor: any }) {
  if (!sponsor) return null;
  const stats = [
    { label: "Posts", value: sponsor.postCount || 0 },
    { label: "Avg Likes", value: sponsor.avgLikes || 0 },
    { label: "Avg Comments", value: sponsor.avgComments || 0 },
    { label: "Total Views", value: (sponsor.totalViews || 0).toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#f5f6f8] rounded-xl p-4 text-center neu-card">
          <p className="text-2xl font-extrabold text-gray-900">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

const SPONSOR_AGENTS = [
  {
    name: "Ideator",
    description: "Sponsor activation ideas classified as AI Reel / Real / UGC",
    icon: "\u{1F4A1}",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    endpoint: "/api/admin/sponsor/agents/ideator",
  },
  {
    name: "Hook & Script",
    description: "Co-branded hooks and reel scripts for sponsor content",
    icon: "\u{1F3AC}",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    endpoint: "/api/admin/sponsor/agents/hooks",
  },
  {
    name: "AI Reel Prompt",
    description: "Detailed AI production prompts with sponsor branding",
    icon: "\u{1F3A8}",
    color: "#F97316",
    bgColor: "#FFF7ED",
    endpoint: "/api/admin/sponsor/agents/reel-prompt",
    configKey: "quality",
    configOptions: [
      { label: "24 fps", value: "social" },
      { label: "30 fps", value: "standard" },
      { label: "60 fps", value: "cinematic" },
      { label: "120 fps", value: "slowmo" },
    ],
  },
  {
    name: "Planner",
    description: "2-day weekend activation plan (Saturday & Sunday)",
    icon: "\u{1F4C5}",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    endpoint: "/api/admin/sponsor/agents/planner",
  },
  {
    name: "Analyst",
    description: "Partnership fit analysis and performance metrics",
    icon: "\u{1F4CA}",
    color: "#10B981",
    bgColor: "#ECFDF5",
    endpoint: "/api/admin/sponsor/agents/analyst",
  },
  {
    name: "DM Manager",
    description: "Sponsor outreach and engagement DM templates",
    icon: "\u{1F4AC}",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    endpoint: "/api/admin/sponsor/agents/dm-manager",
  },
];

export default function SponsorPage() {
  const { user, status, statusError, loading: authLoading, retryStatus } = useAuth();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [scraping, setScraping] = useState(false);
  const [sponsor, setSponsor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && status && status !== "approved") router.push("/admin/login");
  }, [user, authLoading, status, router]);

  async function scrapeSponsor() {
    if (!handle.trim()) return;
    setScraping(true);
    setError(null);
    setSponsor(null);
    try {
      const res = await fetch("/api/admin/sponsor/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setSponsor(json.sponsor);
        setCached(json.cached || false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScraping(false);
    }
  }

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

  const sponsorHandle = sponsor?.handle || handle.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");

  const agentsWithSponsor = SPONSOR_AGENTS.map((a) => ({
    ...a,
    endpoint: a.endpoint,
    sponsorHandle,
  }));

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/sponsor" />

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Sponsor Activation</h2>
          <p className="text-sm text-gray-400 mt-0.5">Enter a sponsor's Instagram to analyze their profile and generate activation content</p>
        </div>

        {/* Sponsor input */}
        <div className="bg-[#f5f6f8] rounded-2xl neu-raised p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !scraping && scrapeSponsor()}
                placeholder="sponsor_handle or Instagram URL"
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#f5f6f8] neu-input text-sm focus:outline-none"
                disabled={scraping}
              />
            </div>
            <button
              onClick={scrapeSponsor}
              disabled={scraping || !handle.trim()}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 active:scale-[0.98] neu-btn"
              style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
            >
              {scraping ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scraping...
                </span>
              ) : (
                "Analyze Sponsor"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50/60 rounded-xl text-red-500 text-xs neu-pressed">
              {error}
            </div>
          )}
        </div>

        {/* Sponsor stats */}
        {sponsor && (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  @{sponsor.handle} Stats
                  {cached && <span className="ml-2 text-xs font-normal text-amber-500">(cached)</span>}
                </h3>
                {sponsor.topPost && (
                  <span className="text-xs text-gray-400">
                    Top post: {sponsor.topPost.likes?.toLocaleString()} likes
                  </span>
                )}
              </div>
              <SponsorStatsBar sponsor={sponsor} />
            </section>

            {/* Sponsor agents */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Sponsor Agents</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentsWithSponsor.map((agent) => (
                  <SponsorAgentCard key={agent.name} {...agent} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SponsorAgentCard({
  name,
  description,
  icon,
  color,
  bgColor,
  endpoint,
  sponsorHandle,
  configKey,
  configOptions,
}: {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  endpoint: string;
  sponsorHandle: string;
  configKey?: string;
  configOptions?: { label: string; value: string }[];
}) {
  const wrappedEndpoint = endpoint;

  const agentProps = {
    name,
    description,
    icon,
    color,
    bgColor,
    endpoint: wrappedEndpoint,
    configKey: configKey || "sponsorHandle",
    configOptions,
    defaultBody: { sponsorHandle },
  };

  return <AgentCard {...agentProps} />;
}
