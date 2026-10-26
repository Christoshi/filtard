import { NextRequest, NextResponse } from "next/server";
import { handleXHandoffCallback } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return await handleXHandoffCallback(request);
  } catch (error) {
    console.error(
      "X handoff callback failed:",
      error instanceof Error ? error.message : "unknown"
    );
    const dest = new URL("/auth/inapp/return", request.url);
    dest.searchParams.set("error", "1");
    const response = NextResponse.redirect(dest);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
