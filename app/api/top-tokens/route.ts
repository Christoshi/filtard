import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 180;

export async function GET() {
  try {
    const { data: tokens } = await supabase
      .from("tokens")
      .select(
        `
        id,
        chain,
        address,
        symbol,
        token_stats (
          volume_24h,
          change_24h
        )
      `
      )
      .eq("status", "approved")
      .limit(20);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json([]);
    }

    const withStats = tokens.map((token) => {
      const s = Array.isArray(token.token_stats)
        ? token.token_stats[0]
        : token.token_stats;

      return {
        id: token.id,
        chain: token.chain,
        address: token.address,
        symbol: token.symbol,
        volume24h: s?.volume_24h != null ? Number(s.volume_24h) : 0,
        change24h: s?.change_24h != null ? Number(s.change_24h) : 0,
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