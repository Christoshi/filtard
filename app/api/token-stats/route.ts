import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: tokens, error: tokensError } = await supabase
    .from("tokens")
    .select("id")
    .eq("status", "approved");

  if (tokensError) {
    return NextResponse.json({ error: tokensError.message }, { status: 500 });
  }

  const ids = (tokens || []).map((t) => t.id);
  if (ids.length === 0) {
    return NextResponse.json({ stats: {} });
  }

  const { data: rows, error: statsError } = await supabase
    .from("token_stats")
    .select(
      "token_id, price_usd, change_24h, volume_24h, liquidity, market_cap, txns_24h, pair_created_at"
    )
    .in("token_id", ids);

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  const stats: Record<
    string,
    {
      priceUsd: number | null;
      change24h: number | null;
      volume24h: number | null;
      liquidity: number | null;
      marketCap: number | null;
      txns24h: number | null;
      pairCreatedAt: number | null;
    }
  > = {};

  for (const row of rows || []) {
    stats[row.token_id] = {
      priceUsd: row.price_usd != null ? Number(row.price_usd) : null,
      change24h: row.change_24h != null ? Number(row.change_24h) : null,
      volume24h: row.volume_24h != null ? Number(row.volume_24h) : null,
      liquidity: row.liquidity != null ? Number(row.liquidity) : null,
      marketCap: row.market_cap != null ? Number(row.market_cap) : null,
      txns24h: row.txns_24h != null ? Number(row.txns_24h) : null,
      pairCreatedAt:
        row.pair_created_at != null ? Number(row.pair_created_at) : null,
    };
  }

  return NextResponse.json(
    { stats },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}