import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTokenStatsBatch } from "@/lib/dexscreener";

export const dynamic = "force-dynamic"; // ← prevents build-time execution
export const revalidate = 180;

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

    const statsMap = await getTokenStatsBatch(
      tokens.map((t) => ({ chain: t.chain, address: t.address })),
      180
    );

    const withStats = tokens.map((token) => {
      const key = `${token.chain.toLowerCase()}:${token.address.toLowerCase()}`;
      const stats = statsMap.get(key);
      return {
        id: token.id,
        chain: token.chain,
        address: token.address,
        symbol: token.symbol,
        volume24h: stats?.volume24h ?? 0,
        change24h: stats?.change24h ?? 0,
      };
    });

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