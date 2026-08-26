import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

    // Verify the caller is logged in
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

    // Service client (bypasses RLS)
    const admin = createClient(supabaseUrl, serviceKey);

    // Confirm admin role
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
      return NextResponse.json({ error: "No token ids provided" }, { status: 400 });
    }

    // 1. Delete related rows (service role — no RLS block)
    const childTables = ["ratings", "token_views", "token_stats"] as const;

    for (const table of childTables) {
      const { error } = await admin.from(table).delete().in("token_id", ids);
      if (error) {
        return NextResponse.json(
          { error: `Failed deleting ${table}: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // 2. Delete tokens
    const { error: tokenError } = await admin
      .from("tokens")
      .delete()
      .in("id", ids);

    if (tokenError) {
      return NextResponse.json(
        { error: `Failed deleting tokens: ${tokenError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    });
  } catch (err: any) {
    console.error("delete-token error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}