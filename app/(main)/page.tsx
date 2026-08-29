import { supabase } from "@/lib/supabase";
import TokenTable from "../components/TokenTable";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const ogImage = `${siteUrl}/og/home.png`;

export const metadata: Metadata = {
  title: {
    absolute: "Filtard",
  },
  description:
    "Community-curated memecoins with theses, ratings, and live data.",
  openGraph: {
    title: "Filtard",
    description:
      "Community-curated memecoins with theses, ratings, and live data.",
    url: siteUrl,
    siteName: "Filtard",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Filtard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Filtard",
    description:
      "Community-curated memecoins with theses, ratings, and live data.",
    images: [ogImage],
  },
};

export const revalidate = 30;

function isRecentlyListed(createdAt: string | null) {
  if (!createdAt) return false;
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return (Date.now() - ts) / (1000 * 60 * 60) <= 72;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string; new?: string }>;
}) {
  const { chain = "all", new: showNew = "" } = await searchParams;
  const onlyNew = showNew === "true";

  let query = supabase
    .from("tokens")
    .select(
      `
      id,
      chain,
      address,
      name,
      symbol,
      image_url,
      is_pinned,
      created_at,
      token_stats (
        price_usd,
        change_24h,
        volume_24h,
        liquidity,
        market_cap,
        txns_24h,
        pair_created_at
      ),
      ratings (
        stars
      )
    `
    )
    .eq("status", "approved")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (chain && chain !== "all") {
    query = query.eq("chain", chain);
  }

  const { data: tokens } = await query;

  const list = (tokens || []) as any[];

  const tokensWithStats = list.map((token) => {
    const s = Array.isArray(token.token_stats)
      ? token.token_stats[0]
      : token.token_stats;

    const ratings = Array.isArray(token.ratings) ? token.ratings : [];
    const ratingAvg =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce(
                (sum: number, r: { stars: number }) => sum + Number(r.stars),
                0
              ) / ratings.length
            ).toFixed(1)
          )
        : 0;

    return {
      id: token.id,
      chain: token.chain,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      image_url: token.image_url,
      is_pinned: token.is_pinned,
      created_at: token.created_at ?? null,
      ratingAvg,
      stats: s
        ? {
            priceUsd: s.price_usd != null ? Number(s.price_usd) : null,
            change24h: s.change_24h != null ? Number(s.change_24h) : null,
            volume24h: s.volume_24h != null ? Number(s.volume_24h) : null,
            liquidity: s.liquidity != null ? Number(s.liquidity) : null,
            marketCap: s.market_cap != null ? Number(s.market_cap) : null,
            txns24h: s.txns_24h != null ? Number(s.txns_24h) : null,
            pairCreatedAt:
              s.pair_created_at != null ? Number(s.pair_created_at) : null,
          }
        : null,
    };
  });

  const finalTokens = onlyNew
    ? tokensWithStats.filter((t) => isRecentlyListed(t.created_at ?? null))
    : tokensWithStats;

  return (
    <div className="w-full">
      <div className="mb-5">
        <p className="text-sm text-[#8b93a1]">
          Community-curated memecoin screener with theses, ratings, and live
          data.
        </p>
      </div>

      <TokenTable tokens={finalTokens} currentChain={chain} onlyNew={onlyNew} />
    </div>
  );
}