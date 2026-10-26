import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  isRewardExpired,
  isRewardSlug,
  type RewardCardData,
  type RewardDetail,
} from "@/lib/rewards";

const CARD_COLUMNS =
  "id, title, subtitle, slug, cover_image_url, expires_at, created_at, updated_at";

function asCard(row: Record<string, unknown>): RewardCardData {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    slug: String(row.slug ?? ""),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

async function fetchPublishedRewards(): Promise<RewardCardData[]> {
  try {
    const { data, error } = await supabase
      .from("reward_posts")
      .select(CARD_COLUMNS)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("reward posts:", error.message);
      return [];
    }

    return (data ?? []).map((row) => asCard(row as Record<string, unknown>));
  } catch (err) {
    console.error("reward posts:", err);
    return [];
  }
}

async function fetchPublishedReward(slug: string): Promise<RewardDetail | null> {
  if (!isRewardSlug(slug)) return null;

  try {
    const { data, error } = await supabase
      .from("reward_posts")
      .select(`${CARD_COLUMNS}, body`)
      .eq("published", true)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("reward post:", error.message);
      return null;
    }
    if (!data) return null;

    const row = data as Record<string, unknown>;
    return {
      ...asCard(row),
      body: String(row.body ?? ""),
    };
  } catch (err) {
    console.error("reward post:", err);
    return null;
  }
}

const cachedPublishedRewards = unstable_cache(
  fetchPublishedRewards,
  ["published-reward-posts"],
  { revalidate: 60, tags: ["rewards"] }
);

const cachedSpotlightRewards = unstable_cache(
  async () => {
    const posts = await fetchPublishedRewards();
    return posts.filter((post) => !isRewardExpired(post.expires_at)).slice(0, 3);
  },
  ["reward-spotlight"],
  { revalidate: 60, tags: ["rewards"] }
);

const cachedRewardBySlug = unstable_cache(
  async (slug: string) => fetchPublishedReward(slug),
  ["reward-post"],
  { revalidate: 60, tags: ["rewards"] }
);

export const listPublishedRewards = cache(cachedPublishedRewards);

export const listSpotlightRewards = cache(cachedSpotlightRewards);

export const getPublishedReward = cache((slug: string) =>
  cachedRewardBySlug(slug)
);
