import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const handoff = request.nextUrl.searchParams.get("handoff");
  if (!handoff) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/auth/inapp/callback";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/auth/callback",
};
