import { supabase } from "@/lib/supabase";
import Link from "next/link";
import TokenTable from "./components/TokenTable";
import ChainSelector from "./components/ChainSelector";

export const revalidate = 30;

type Token = {
  id: string;
  chain: string;
  address: string;
  name: string | null;
  symbol: string | null;
  image_url: string | null;
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
    .select("id, chain, address, name, symbol, image_url")
    .eq("status", "approved")
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

  const buildUrl = (params: { chain?: string; new?: boolean }) => {
    const search = new URLSearchParams();
    if (params.chain && params.chain !== "all") search.set("chain", params.chain);
    if (params.new) search.set("new", "true");
    const str = search.toString();
    return str ? `/?${str}` : "/";
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <p className="text-base text-[#8b93a1]">
          Community-curated memecoins screener
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <ChainSelector currentChain={chain} onlyNew={onlyNew} />

        <Link
          href={buildUrl({ chain, new: !onlyNew })}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition ${
            onlyNew
              ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
              : "bg-[#101215] text-[#b8ff3d] border-[#b8ff3d]/40 hover:border-[#b8ff3d] hover:bg-[#b8ff3d]/10"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          New
        </Link>
      </div>

      <TokenTable tokens={finalTokens} />
    </div>
  );
}