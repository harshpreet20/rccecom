"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";

interface Review {
  id: string;
  source: string;
  reviewer_name: string;
  rating: number;
  title: string;
  review_text: string;
  review_date: string;
  data: Record<string, any>;
  scraped_at: string;
}

function Stars({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  return (
    <span className={size}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#F59E0B" : "#E5E7EB" }}>
          {"★"}
        </span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { user, status, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
    if (!authLoading && user && status && status !== "approved") router.push("/admin/login");
  }, [user, authLoading, status, router]);

  async function loadReviews() {
    setLoading(true);
    try {
      const src = sourceFilter !== "all" ? `?source=${sourceFilter}` : "";
      const res = await fetch(`/api/admin/reviews${src}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setReviews(json.reviews || []);
      setSummary(json.summary || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user || status !== "approved") return;
    loadReviews();
  }, [user, status, sourceFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const positive = reviews.filter((r) => r.rating >= 4).length;
  const neutral = reviews.filter((r) => r.rating === 3).length;
  const negative = reviews.filter((r) => r.rating <= 2).length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] pt-16 md:pt-0 md:pl-64">
      <Sidebar active="/admin/reviews" />

      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-400 mt-0.5">Trustpilot &amp; Google reviews for Racquets Club Community</p>
        </div>

        {/* Source filter tabs */}
        <div className="flex items-center gap-1 mb-6">
          {[
            { key: "all", label: "All Sources" },
            { key: "trustpilot", label: "Trustpilot" },
            { key: "google", label: "Google" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                sourceFilter === tab.key
                  ? "bg-gray-900 text-white neu-pressed"
                  : "bg-[#f5f6f8] text-gray-500 neu-btn"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
            {/* Summary cards */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-amber-50">⭐</div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Average Rating</div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">{summary.avgRating}</span>
                    <Stars rating={Math.round(summary.avgRating)} size="text-lg" />
                  </div>
                </div>
                <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-blue-50">💬</div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Total Reviews</div>
                  <div className="text-3xl font-extrabold text-gray-900">{summary.total}</div>
                </div>
                <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-emerald-50">👍</div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Positive</div>
                  <div className="text-3xl font-extrabold text-green-600">{positive}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">4-5 stars</div>
                </div>
                <div className="bg-[#f5f6f8] rounded-2xl p-5 neu-card">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 bg-red-50">⚠️</div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Needs Attention</div>
                  <div className="text-3xl font-extrabold text-red-500">{negative}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">1-2 stars</div>
                </div>
              </div>
            )}

            {/* Rating distribution */}
            {summary?.distribution && (
              <div className="bg-[#f5f6f8] rounded-2xl p-6 neu-raised">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Rating Distribution</h3>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star] || 0;
                    const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
                    const barColor = star >= 4 ? "#10B981" : star === 3 ? "#F59E0B" : "#EF4444";
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-500 w-6 text-right">{star}</span>
                        <span className="text-amber-400">{"★"}</span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden neu-pressed">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review cards */}
            {reviews.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl neu-pressed">{"⭐"}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No reviews yet</h3>
                <p className="text-sm text-gray-400">Reviews are fetched automatically during the weekly scrape.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">All Reviews</h3>
                {reviews.map((review) => (
                  <div key={review.id} className="bg-[#f5f6f8] rounded-2xl neu-card p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{review.reviewer_name}</span>
                          {review.data?.verified && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 text-green-600 rounded-full neu-flat">Verified</span>
                          )}
                        </div>
                        <Stars rating={review.rating} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">
                          {review.review_date ? new Date(review.review_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase neu-flat ${
                          review.source === "google"
                            ? "text-blue-700"
                            : "text-emerald-700"
                        }`}>
                          {review.source === "google" ? "Google" : "Trustpilot"}
                        </span>
                      </div>
                    </div>
                    {review.title && (
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{review.title}</h4>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed">{review.review_text}</p>
                    {(() => {
                      const raw = review.data?.reply || review.data?.response;
                      const text = typeof raw === "string" ? raw : raw?.text;
                      return text?.trim() ? (
                        <div className="mt-3 pl-4 rounded-lg p-3 neu-pressed">
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Business Reply</span>
                          <p className="text-xs text-gray-600 mt-1">{text}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
