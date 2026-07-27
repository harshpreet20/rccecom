import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

export interface Post {
  id: string;
  shortCode: string;
  caption: string;
  likes: number;
  comments: number;
  views: number;
  timestamp: string;
  type: string;
  url: string;
  hashtags: string[];
  ownerUsername: string;
}

export interface ScrapedData {
  scrapedAt: string;
  myHandle: string;
  competitors: string[];
  profiles: Record<string, Post[]>;
  totalPosts: number;
}

export function loadData(): ScrapedData | null {
  const dataPath = resolve(process.cwd(), "dashboard/data/data.json");
  if (!existsSync(dataPath)) return null;
  try {
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadDataWithFallback(): Promise<ScrapedData | null> {
  const local = loadData();
  if (local) return local;

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) return null;

  const supabase = createClient(sbUrl, sbKey);
  const { data, error } = await supabase
    .from("scrapes")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const scraped = data.data;
  return {
    scrapedAt: data.scraped_at,
    myHandle: data.my_handle,
    competitors: data.competitors,
    profiles: scraped.profiles || scraped,
    totalPosts: scraped.totalPosts || 0,
  };
}

export function getMyStats(data: ScrapedData) {
  const myPosts = data.profiles[data.myHandle] || [];
  const totalLikes = myPosts.reduce((s, p) => s + p.likes, 0);
  const totalComments = myPosts.reduce((s, p) => s + p.comments, 0);
  const totalViews = myPosts.reduce((s, p) => s + p.views, 0);
  const avgLikes = myPosts.length ? Math.round(totalLikes / myPosts.length) : 0;
  const avgComments = myPosts.length ? Math.round(totalComments / myPosts.length) : 0;

  const topPost = myPosts.sort((a, b) => b.likes - a.likes)[0] || null;

  const totalEngagements = totalLikes + totalComments;
  const engagementRate = myPosts.length > 0
    ? (totalEngagements / myPosts.length / Math.max(avgLikes * 10, 1)) * 100
    : 0;

  return {
    handle: data.myHandle,
    postCount: myPosts.length,
    totalLikes,
    totalComments,
    totalViews,
    avgLikes,
    avgComments,
    engagementRate: Math.round(engagementRate * 10) / 10,
    topPost,
    posts: myPosts,
  };
}

export function getCompetitorStats(data: ScrapedData) {
  return data.competitors.map((handle) => {
    const posts = data.profiles[handle] || [];
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const avgLikes = posts.length ? Math.round(totalLikes / posts.length) : 0;
    const topPost = [...posts].sort((a, b) => b.likes - a.likes)[0] || null;
    return {
      handle,
      postCount: posts.length,
      avgLikes,
      totalLikes,
      topPost,
      posts,
    };
  });
}
