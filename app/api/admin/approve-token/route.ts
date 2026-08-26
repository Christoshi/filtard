import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function getCurrentMcap(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    return pair?.marketCap ?? pair?.fdv ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "admin" && profile.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids
      : body?.id
        ? [body.id]
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No token ids provided" },
        { status: 400 }
      );
    }

    const { data: tokens, error: fetchError } = await admin
      .from("tokens")
      .select("id, address")
      .in("id", ids);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: "No tokens found" }, { status: 404 });
    }

    const approvedAt = new Date().toISOString();
    let approved = 0;

    for (const token of tokens) {
      const mcap = await getCurrentMcap(token.address);
      const { error } = await admin
        .from("tokens")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: approvedAt,
          initial_mcap: mcap,
        })
        .eq("id", token.id);

      if (error) {
        return NextResponse.json(
          { error: `Failed approving ${token.id}: ${error.message}` },
          { status: 500 }
        );
      }
      approved += 1;
    }

    return NextResponse.json({ success: true, approved });
  } catch (err: any) {
    console.error("approve-token error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}