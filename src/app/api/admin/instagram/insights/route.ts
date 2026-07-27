import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/supabase-server";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Analytics is visible to any approved staff account in the sidebar
  // (Sidebar's "Performance" section isn't role-gated), so accept all roles.
  const auth = await requireAdmin(request, ["admin", "content", "sales", "user"]);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createAdminClient();

    // Get latest scrape
    const { data: latest, error } = await supabase
      .from("scrapes")
      .select("*")
      .order("scraped_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !latest) {
      return NextResponse.json({ error: "No scraped data found. Hit Refresh Data on the dashboard first." }, { status: 404 });
    }

    const profiles = latest.data?.profiles || latest.data || {};
    const myHandle = latest.my_handle;
    const myPosts = profiles[myHandle] || [];
    const competitors = latest.competitors || [];

    const totalLikes = myPosts.reduce((s: number, p: any) => s + (p.likes || 0), 0);
    const totalComments = myPosts.reduce((s: number, p: any) => s + (p.comments || 0), 0);
    const totalViews = myPosts.reduce((s: number, p: any) => s + (p.views || 0), 0);
    const avgLikes = myPosts.length ? Math.round(totalLikes / myPosts.length) : 0;
    const avgComments = myPosts.length ? Math.round(totalComments / myPosts.length) : 0;

    // Post type breakdown
    const typeCount: Record<string, number> = {};
    for (const p of myPosts) {
      const t = p.type || "unknown";
      typeCount[t] = (typeCount[t] || 0) + 1;
    }

    // Top posts by likes
    const topPosts = [...myPosts]
      .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 15)
      .map((p: any) => ({
        caption: p.caption || "",
        likes: p.likes || 0,
        comments: p.comments || 0,
        views: p.views || 0,
        type: p.type || "unknown",
        url: p.url || "",
        timestamp: p.timestamp || "",
      }));

    // Competitor comparison
    const compStats = competitors.map((handle: string) => {
      const posts = profiles[handle] || [];
      const tl = posts.reduce((s: number, p: any) => s + (p.likes || 0), 0);
      const tc = posts.reduce((s: number, p: any) => s + (p.comments || 0), 0);
      return {
        handle,
        postCount: posts.length,
        totalLikes: tl,
        avgLikes: posts.length ? Math.round(tl / posts.length) : 0,
        totalComments: tc,
        avgComments: posts.length ? Math.round(tc / posts.length) : 0,
      };
    });

    return NextResponse.json({
      account: {
        username: myHandle,
        posts: myPosts.length,
        totalLikes,
        totalComments,
        totalViews,
        avgLikes,
        avgComments,
      },
      insights: {
        reach: totalViews,
        impressions: totalViews + totalLikes,
        engagement: totalLikes + totalComments,
      },
      topPosts,
      typeBreakdown: Object.entries(typeCount).map(([type, count]) => ({ type, count })),
      competitors: compStats,
      scrapedAt: latest.scraped_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
