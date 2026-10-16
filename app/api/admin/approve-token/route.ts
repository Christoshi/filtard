import { NextRequest, NextResponse } from "next/server";
import { getDexTokenMeta } from "@/lib/dexscreener";
import { isAuthFailure, requireStaff } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const body = await request.json().catch(() => null);
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

    const { data: tokens, error: fetchError } = await auth.admin
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
      const meta = await getDexTokenMeta(token.address);
      const { error } = await auth.admin
        .from("tokens")
        .update({
          status: "approved",
          approved_by: auth.user.id,
          approved_at: approvedAt,
          initial_mcap: meta.marketCap,
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