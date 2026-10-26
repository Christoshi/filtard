import { NextRequest, NextResponse } from "next/server";
import { claimSessionCookies } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return await claimSessionCookies(request);
  } catch (error) {
    console.error(
      "X handoff session failed:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
}
