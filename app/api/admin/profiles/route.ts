import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireStaff } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (isAuthFailure(auth)) return auth.response;

    const { data: profiles, error } = await auth.admin
      .from("profiles")
      .select("id, display_name, role, twitter_url, telegram_url, avatar_url")
      .order("display_name", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: tokenRows, error: tokenError } = await auth.admin
      .from("tokens")
      .select("submitted_by")
      .eq("status", "approved");

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const countMap: Record<string, number> = {};
    for (const row of tokenRows || []) {
      if (!row.submitted_by) continue;
      countMap[row.submitted_by] = (countMap[row.submitted_by] || 0) + 1;
    }

    const list = (profiles || []).map((profile) => ({
      ...profile,
      role: profile.role || "user",
      token_count: countMap[profile.id] || 0,
    }));

    return NextResponse.json({ profiles: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("admin profiles error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
