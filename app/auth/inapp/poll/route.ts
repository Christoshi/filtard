import { NextRequest } from "next/server";
import { handoffJson, pollXHandoff } from "@/lib/x-oauth-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const result = await pollXHandoff(request);

  if (result.status === "complete") {
    return handoffJson(
      {
        status: "complete",
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        next: result.nextPath,
      },
      { clearCookies: true }
    );
  }

  if (result.status === "pending") {
    return handoffJson({ status: "pending" });
  }

  return handoffJson({ status: "idle" }, { clearCookies: result.clearCookies });
}
