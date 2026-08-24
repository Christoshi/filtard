export type TokenStats = {
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
  txns24h: number | null;
  pairCreatedAt: number | null;
};

type TokenInput = {
  chain: string;
  address: string;
};

function makeKey(chain: string, address: string) {
  return `${chain.toLowerCase()}:${address.toLowerCase()}`;
}

function extractStats(pair: any): TokenStats {
  return {
    priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
    change24h: pair.priceChange?.h24 ?? null,
    volume24h: pair.volume?.h24 ?? null,
    liquidity: pair.liquidity?.usd ?? null,
    marketCap: pair.marketCap ?? pair.fdv ?? null,
    txns24h:
      (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0) || null,
    pairCreatedAt: pair.pairCreatedAt ?? null,
  };
}

/**
 * Batch-fetch stats from DexScreener.
 * Groups by chain and uses the official v1 endpoint (up to 30 addresses per call).
 * Returns a Map keyed by "chain:address" (lowercase).
 */
export async function getTokenStatsBatch(
  tokens: TokenInput[],
  revalidate = 30
): Promise<Map<string, TokenStats | null>> {
  const result = new Map<string, TokenStats | null>();

  if (!tokens.length) return result;

  // Group by chain
  const byChain = new Map<string, string[]>();
  for (const t of tokens) {
    const chain = t.chain.toLowerCase();
    const addr = t.address;
    if (!byChain.has(chain)) byChain.set(chain, []);
    byChain.get(chain)!.push(addr);
    // Pre-fill null so every requested token has an entry
    result.set(makeKey(chain, addr), null);
  }

  const CHUNK = 30;

  await Promise.all(
    Array.from(byChain.entries()).map(async ([chain, addresses]) => {
      // Deduplicate addresses within the chain
      const unique = [...new Set(addresses.map((a) => a))];

      for (let i = 0; i < unique.length; i += CHUNK) {
        const chunk = unique.slice(i, i + CHUNK);
        const url = `https://api.dexscreener.com/tokens/v1/${chain}/${chunk.join(",")}`;

        try {
          const res = await fetch(url, {
            next: { revalidate },
          });

          if (!res.ok) continue;

          const pairs: any[] = await res.json();
          if (!Array.isArray(pairs)) continue;

          // Group pairs by token address and keep the highest-liquidity one
          const bestByAddress = new Map<string, any>();

          for (const pair of pairs) {
            const baseAddr = (
              pair.baseToken?.address || ""
            ).toLowerCase();
            if (!baseAddr) continue;

            const existing = bestByAddress.get(baseAddr);
            const liq = pair.liquidity?.usd ?? 0;
            if (!existing || liq > (existing.liquidity?.usd ?? 0)) {
              bestByAddress.set(baseAddr, pair);
            }
          }

          for (const [addr, pair] of bestByAddress) {
            result.set(makeKey(chain, addr), extractStats(pair));
          }
        } catch {
          // Leave as null on failure
        }
      }
    })
  );

  return result;
}