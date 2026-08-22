import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 180; // 3 minutes

export async function GET() {
  try {
    const { data: tokens } = await supabase
      .from("tokens")
      .select("id, chain, address, symbol")
      .eq("status", "approved")
      .limit(20);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json([]);
    }

    const withStats = await Promise.all(
      tokens.map(async (token) => {
        try {
          const res = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
            { next: { revalidate: 180 } }
          );
          if (!res.ok) throw new Error("DexScreener error");
          const data = await res.json();
          const pair = data?.pairs?.[0];
          return {
            id: token.id,
            chain: token.chain,
            address: token.address,
            symbol: token.symbol,
            volume24h: pair?.volume?.h24 ?? 0,
            change24h: pair?.priceChange?.h24 ?? 0,
          };
        } catch {
          return {
            id: token.id,
            chain: token.chain,
            address: token.address,
            symbol: token.symbol,
            volume24h: 0,
            change24h: 0,
          };
        }
      })
    );

    const top5 = withStats
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 5);

    return NextResponse.json(top5, {
      headers: {
        "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("top-tokens error:", error);
    return NextResponse.json([], { status: 500 });
  }
}