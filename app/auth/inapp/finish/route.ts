import { NextRequest } from "next/server";
import {
  finishXHandoff,
  handoffJson,
  readHandoffCookie,
} from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const handoffId = typeof body?.handoff === "string" ? body.handoff : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const sameBrowser = readHandoffCookie(request) === handoffId;

  const result = await finishXHandoff({ handoffId, code, sameBrowser });

  if (!result.ok) {
    return handoffJson({ error: result.error }, { status: result.status });
  }

  if (result.mode === "return") {
    return handoffJson({ mode: "return" });
  }

  return handoffJson(
    {
      mode: "session",
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      next: result.nextPath,
    },
    { clearCookies: true }
  );
}
