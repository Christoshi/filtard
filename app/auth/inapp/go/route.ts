import { NextRequest, NextResponse } from "next/server";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import { safeNextPath } from "@/lib/safe-next";
import { setHandoffCookie, startXHandoff } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(request: NextRequest) {
  const dest = new URL("/login", request.url);
  const next = safeNextPath(request.nextUrl.searchParams.get("redirect"));
  if (next !== "/") dest.searchParams.set("redirect", next);
  dest.searchParams.set("error", "x");
  const response = NextResponse.redirect(dest);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (!isPhoneUserAgent(request.headers.get("user-agent"))) {
    const dest = new URL("/login", request.url);
    const next = safeNextPath(request.nextUrl.searchParams.get("redirect"));
    if (next !== "/") dest.searchParams.set("redirect", next);
    return NextResponse.redirect(dest);
  }

  try {
    const started = await startXHandoff(
      request,
      request.nextUrl.searchParams.get("redirect")
    );
    const response = NextResponse.redirect(started.url);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    setHandoffCookie(response, request, started.id);
    return response;
  } catch (error) {
    console.error(
      "X handoff redirect failed:",
      error instanceof Error ? error.message : "unknown"
    );
    return loginRedirect(request);
  }
}
