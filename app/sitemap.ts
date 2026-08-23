import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://filtard.vercel.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  // Approved tokens
  const { data: tokens } = await supabase
    .from("tokens")
    .select("chain, address, updated_at, thesis_updated_at")
    .eq("status", "approved");

  const tokenPages: MetadataRoute.Sitemap =
    tokens?.map((token) => ({
      url: `${baseUrl}/${token.chain}/${token.address}`,
      lastModified: new Date(
        token.thesis_updated_at || token.updated_at || Date.now()
      ),
      changeFrequency: "daily",
      priority: 0.8,
    })) || [];

  // Curator profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("display_name, updated_at")
    .not("display_name", "is", null);

  const profilePages: MetadataRoute.Sitemap =
    profiles?.map((profile) => ({
      url: `${baseUrl}/${profile.display_name}`,
      lastModified: new Date(profile.updated_at || Date.now()),
      changeFrequency: "weekly",
      priority: 0.7,
    })) || [];

  return [...staticPages, ...tokenPages, ...profilePages];
}