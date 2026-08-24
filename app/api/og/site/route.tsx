import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const domain =
    request.nextUrl.searchParams.get("domain") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ||
    "filtard.vercel.app";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#07080a",
          fontFamily: "sans-serif",
        }}
      >
        {/* Lime accent strip */}
        <div
          style={{
            display: "flex",
            width: 6,
            height: "100%",
            backgroundColor: "#b8ff3d",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 56,
                height: 56,
                borderRadius: 12,
                backgroundColor: "#b8ff3d",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 800,
                color: "#07080a",
                marginRight: 20,
              }}
            >
              F
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                color: "#f4f6f8",
                letterSpacing: "0.04em",
              }}
            >
              FILTARD
            </div>
          </div>

          {/* What it is */}
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#9ca3af",
              marginBottom: 16,
            }}
          >
            Community-curated memecoin screener
          </div>

          {/* Benefit line */}
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#e5e7eb",
              textAlign: "center",
              maxWidth: 900,
              marginBottom: 40,
            }}
          >
            Discover memecoins the trenches find most interesting.
          </div>

          {/* Domain */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#6b7280",
            }}
          >
            {domain}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}