import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenStatsBatch } from "@/lib/dexscreener";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow up to 60s for the batch

export async function GET(request: NextRequest) {
  // Protect the route
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role so we can write (RLS blocks anon writes)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Load approved tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("tokens")
      .select("id, chain, address")
      .eq("status", "approved");

    if (tokensError) {
      console.error("tokens fetch error:", tokensError);
      return NextResponse.json({ error: tokensError.message }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ updated: 0, message: "No approved tokens" });
    }

    // 2. Batch fetch from DexScreener
    const statsMap = await getTokenStatsBatch(
      tokens.map((t) => ({ chain: t.chain, address: t.address })),
      0 // no Next.js cache for the cron itself
    );

    // 3. Build rows for upsert
    const rows = tokens.map((t) => {
      const key = `${t.chain.toLowerCase()}:${t.address.toLowerCase()}`;
      const stats = statsMap.get(key);

      return {
        token_id: t.id,
        price_usd: stats?.priceUsd ?? null,
        change_24h: stats?.change24h ?? null,
        volume_24h: stats?.volume24h ?? null,
        liquidity: stats?.liquidity ?? null,
        market_cap: stats?.marketCap ?? null,
        txns_24h: stats?.txns24h ?? null,
        pair_created_at: stats?.pairCreatedAt ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    // 4. Upsert into token_stats
    const { error: upsertError } = await supabase
      .from("token_stats")
      .upsert(rows, { onConflict: "token_id" });

    if (upsertError) {
      console.error("upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      updated: rows.length,
      message: "token_stats refreshed",
    });
  } catch (err: any) {
    console.error("cron refresh error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}