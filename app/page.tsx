import { supabase } from "@/lib/supabase";
import TokenTable from "./components/TokenTable";
import { getTokenStatsBatch } from "@/lib/dexscreener";

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

  const list = (tokens || []) as Token[];

  // Single batched call instead of N individual fetches
  const statsMap = await getTokenStatsBatch(
    list.map((t) => ({ chain: t.chain, address: t.address })),
    30
  );

  const tokensWithStats = list.map((token) => {
    const key = `${token.chain.toLowerCase()}:${token.address.toLowerCase()}`;
    return {
      ...token,
      stats: statsMap.get(key) ?? null,
    };
  });

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