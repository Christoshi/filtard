import { supabase } from "@/lib/supabase";
import TokenTable from "./components/TokenTable";

export const revalidate = 30;

type Token = {
  id: string;
  chain: string;
  address: string;
  name: string | null;
  symbol: string | null;
  image_url: string | null;
  is_pinned: boolean;
};

async function getTokenStats(address: string) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    if (!pair) return null;

    return {
      priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
      change24h: pair.priceChange?.h24 ?? null,
      volume24h: pair.volume?.h24 ?? null,
      liquidity: pair.liquidity?.usd ?? null,
      marketCap: pair.marketCap ?? pair.fdv ?? null,
      txns24h: (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0) || null,
      pairCreatedAt: pair.pairCreatedAt ?? null,
    };
  } catch {
    return null;
  }
}

function isNewToken(timestamp: number | null) {
  if (!timestamp) return false;
  const hours = (Date.now() - timestamp) / (1000 * 60 * 60);
  return hours <= 72;
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
    .select("id, chain, address, name, symbol, image_url, is_pinned")
    .eq("status", "approved")
    .order("is_pinned", { ascending: false }) // pinned first
    .order("created_at", { ascending: false });

  if (chain && chain !== "all") {
    query = query.eq("chain", chain);
  }

  const { data: tokens } = await query;

  const tokensWithStats = await Promise.all(
    (tokens || []).map(async (token: Token) => {
      const stats = await getTokenStats(token.address);
      return { ...token, stats };
    })
  );

  const finalTokens = onlyNew
    ? tokensWithStats.filter((t) => isNewToken(t.stats?.pairCreatedAt ?? null))
    : tokensWithStats;

  return (
    <div className="w-full">
      <div className="mb-5">
        <p className="text-base text-[#8b93a1]">
          Community-curated memecoins screener
        </p>
      </div>

      <TokenTable tokens={finalTokens} currentChain={chain} onlyNew={onlyNew} />
    </div>
  );
}