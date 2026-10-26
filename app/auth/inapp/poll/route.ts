import { NextRequest, NextResponse } from "next/server";
import { pollXHandoff } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return await pollXHandoff(request);
  } catch (error) {
    console.error(
      "X handoff poll failed:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json({ status: "pending" });
  }
}
