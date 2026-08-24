import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenStatsBatch } from "@/lib/dexscreener";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // 2. Load existing stats so we never overwrite real data with null
    const { data: existingStats } = await supabase
      .from("token_stats")
      .select("*")
      .in(
        "token_id",
        tokens.map((t) => t.id)
      );

    const existingMap = new Map(
      (existingStats || []).map((row) => [row.token_id, row])
    );

    // 3. Batch fetch from DexScreener
    const statsMap = await getTokenStatsBatch(
      tokens.map((t) => ({ chain: t.chain, address: t.address })),
      0
    );

    // 4. Merge: only keep new values when they are not null
    const rows = tokens.map((t) => {
      const key = `${t.chain.toLowerCase()}:${t.address.toLowerCase()}`;
      const fresh = statsMap.get(key);
      const prev = existingMap.get(t.id);

      return {
        token_id: t.id,
        price_usd:
          fresh?.priceUsd != null ? fresh.priceUsd : prev?.price_usd ?? null,
        change_24h:
          fresh?.change24h != null ? fresh.change24h : prev?.change_24h ?? null,
        volume_24h:
          fresh?.volume24h != null ? fresh.volume24h : prev?.volume_24h ?? null,
        liquidity:
          fresh?.liquidity != null ? fresh.liquidity : prev?.liquidity ?? null,
        market_cap:
          fresh?.marketCap != null ? fresh.marketCap : prev?.market_cap ?? null,
        txns_24h:
          fresh?.txns24h != null ? fresh.txns24h : prev?.txns_24h ?? null,
        pair_created_at:
          fresh?.pairCreatedAt != null
            ? fresh.pairCreatedAt
            : prev?.pair_created_at ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    // 5. Upsert merged rows
    const { error: upsertError } = await supabase
      .from("token_stats")
      .upsert(rows, { onConflict: "token_id" });

    if (upsertError) {
      console.error("upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      updated: rows.length,
      message: "token_stats refreshed (null-safe)",
    });
  } catch (err: any) {
    console.error("cron refresh error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}