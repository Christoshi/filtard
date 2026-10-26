import { NextRequest } from "next/server";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import { handoffJson, prepareXHandoff } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isPhoneUserAgent(request.headers.get("user-agent"))) {
    return handoffJson({ error: "Phone only" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const nextPath = typeof body?.next === "string" ? body.next : "/";
  const prepared = await prepareXHandoff(request, nextPath);

  if (!prepared.ok) {
    return handoffJson({ error: prepared.error }, { status: prepared.status });
  }

  if (prepared.kind === "waiting") {
    return handoffJson(
      { waiting: true },
      { handoffId: prepared.handoffId }
    );
  }

  return handoffJson(
    { url: prepared.authorizeUrl },
    { handoffId: prepared.handoffId }
  );
}
