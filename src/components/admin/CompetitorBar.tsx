"use client";

interface Competitor {
  handle: string;
  postCount: number;
  avgLikes: number;
  totalLikes: number;
}

const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-teal-500 to-cyan-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-green-600",
  "from-blue-500 to-sky-600",
  "from-fuchsia-500 to-purple-600",
  "from-red-500 to-rose-600",
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function CompetitorBar({ competitors }: { competitors: Competitor[] }) {
  if (!competitors?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {competitors.map((c, i) => (
        <div
          key={c.handle}
          className="bg-[#f5f6f8] rounded-2xl p-4 neu-card flex items-center gap-4"
        >
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0 neu-raised-sm`}>
            {c.handle[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 text-sm truncate">@{c.handle}</div>
            <div className="text-gray-400 text-xs mt-0.5">{c.postCount} posts</div>
          </div>
          <div className="text-right shrink-0">
            {c.postCount > 0 ? (
              <>
                <div className="text-sm font-bold text-gray-900">{formatNumber(c.avgLikes)}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">avg likes</div>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-amber-500 px-2 py-1 rounded-full neu-pressed">Pending scrape</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
