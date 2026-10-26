import { NextRequest, NextResponse } from "next/server";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import { setHandoffCookie, startXHandoff } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isPhoneUserAgent(request.headers.get("user-agent"))) {
    return noStore(
      NextResponse.json({ error: "Phone browser required" }, { status: 403 })
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return noStore(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return noStore(
      NextResponse.json({ error: "Expected JSON" }, { status: 415 })
    );
  }

  let redirect: string | null = null;
  try {
    const body = (await request.json()) as { redirect?: unknown };
    redirect = typeof body.redirect === "string" ? body.redirect : null;
  } catch {
    redirect = null;
  }

  try {
    const started = await startXHandoff(request, redirect);
    const response = noStore(NextResponse.json({ url: started.url }));
    setHandoffCookie(response, request, started.id);
    return response;
  } catch (error) {
    console.error(
      "X handoff start failed:",
      error instanceof Error ? error.message : "unknown"
    );
    return noStore(
      NextResponse.json({ error: "Could not start X login" }, { status: 500 })
    );
  }
}
