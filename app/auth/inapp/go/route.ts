import { NextRequest, NextResponse } from "next/server";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import { safeNextPath } from "@/lib/safe-next";
import {
  applyHandoffCookies,
  prepareXHandoff,
} from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", nextPath);

  if (!isPhoneUserAgent(request.headers.get("user-agent"))) {
    return NextResponse.redirect(loginUrl);
  }

  const prepared = await prepareXHandoff(request, nextPath);
  if (!prepared.ok) {
    return NextResponse.json(
      { error: prepared.error },
      { status: prepared.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (prepared.kind === "waiting") {
    const response = NextResponse.redirect(loginUrl);
    applyHandoffCookies(response, prepared.handoffId);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = NextResponse.redirect(prepared.authorizeUrl);
  applyHandoffCookies(response, prepared.handoffId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
