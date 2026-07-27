"use client";

interface StatsBarProps {
  stats: {
    handle: string;
    postCount: number;
    avgLikes: number;
    avgComments: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    engagementRate?: number;
  } | null;
}

const STATS_CONFIG = [
  { key: "postCount", label: "Posts", icon: "grid", format: (v: number) => v.toString() },
  { key: "avgLikes", label: "Avg Likes", icon: "heart", format: (v: number) => v.toLocaleString() },
  { key: "avgComments", label: "Avg Comments", icon: "chat", format: (v: number) => v.toLocaleString() },
  { key: "totalLikes", label: "Total Likes", icon: "fire", format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString() },
  { key: "totalViews", label: "Total Views", icon: "eye", format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString() },
  { key: "engagementRate", label: "Engagement", icon: "chart", format: (v: number) => `${(typeof v === "number" && Number.isFinite(v) ? v : 0).toFixed(1)}%` },
] as const;

const COLORS = ["#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#3B82F6", "#6366F1"];

function StatIcon({ type, color }: { type: string; color: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    heart: (
      <svg width="18" height="18" fill={color} viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    chat: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    fire: (
      <svg width="18" height="18" fill={color} viewBox="0 0 24 24">
        <path d="M12 23c-3.87 0-7-3.13-7-7 0-2.38 1.19-4.47 3-5.74C10.39 8.52 12 5.7 12 2c4.97 5 7 8 7 14 0 3.87-3.13 7-7 7z" />
      </svg>
    ),
    eye: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    chart: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  };
  return icons[type] || null;
}

export default function StatsBar({ stats }: StatsBarProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STATS_CONFIG.map((cfg, i) => {
        const value = stats[cfg.key as keyof typeof stats] as number;
        const color = COLORS[i];
        return (
          <div
            key={cfg.key}
            className="bg-[#f5f6f8] rounded-2xl p-5 neu-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "14" }}>
                <StatIcon type={cfg.icon} color={color} />
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{cfg.label}</span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{cfg.format(value)}</div>
          </div>
        );
      })}
    </div>
  );
}
