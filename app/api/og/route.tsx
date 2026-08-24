import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function formatPrice(raw: string | null): string {
  if (!raw || raw === "null" || raw === "") return "-";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1) return "$" + n.toFixed(4);
  if (n >= 0.01) return "$" + n.toFixed(4);
  if (n >= 0.0001) return "$" + n.toFixed(6);
  return "$" + n.toPrecision(4);
}

function formatChange(raw: string | null): { text: string; color: string } {
  if (!raw || raw === "null" || raw === "") {
    return { text: "-", color: "#8b93a1" };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return { text: "-", color: "#8b93a1" };
  const sign = n > 0 ? "+" : "";
  return {
    text: sign + n.toFixed(2) + "%",
    color: n < 0 ? "#f87171" : "#4ade80",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const symbol = searchParams.get("symbol") || "???";
  const name = searchParams.get("name") || "Unknown";
  const priceRaw = searchParams.get("price");
  const changeRaw = searchParams.get("change");
  const imageUrl = searchParams.get("image");
  const thesis = searchParams.get("thesis") || "";
  const domain =
    searchParams.get("domain") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ||
    "filtard.vercel.app";

  const price = formatPrice(priceRaw);
  const change = formatChange(changeRaw);

  const bottomText = thesis
    ? thesis.length > 90
      ? thesis.slice(0, 87) + "..."
      : thesis
    : "Community-curated memecoins screener";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#07080a",
          padding: "36px 44px 32px 44px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Branding — top right only */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
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
                marginRight: 14,
              }}
            >
              F
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                color: "#5a6270",
                marginRight: 14,
              }}
            >
              |
            </div>
            <div style={{ display: "flex", fontSize: 32, color: "#c0c6d0" }}>
              {domain}
            </div>
          </div>
        </div>

        {/* Token */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              width={110}
              height={110}
              style={{ borderRadius: "50%", marginRight: 28 }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 110,
                height: 110,
                borderRadius: "50%",
                backgroundColor: "#1c1f26",
                marginRight: 28,
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                color: "#f4f6f8",
                lineHeight: 1.05,
              }}
            >
              ${symbol}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                color: "#b0b8c4",
                marginTop: 6,
              }}
            >
              {name}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "flex", marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginRight: 64,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 32,
                color: "#8b93a1",
                marginBottom: 6,
              }}
            >
              Price
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 600,
                color: "#f4f6f8",
              }}
            >
              {price}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                color: "#8b93a1",
                marginBottom: 6,
              }}
            >
              24h
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 600,
                color: change.color,
              }}
            >
              {change.text}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexGrow: 1 }} />

        {/* Bottom — thesis or tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 1,
              backgroundColor: "#1c1f26",
              marginBottom: 16,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#c0c6d0",
              textAlign: "center",
              maxWidth: "100%",
            }}
          >
            {bottomText}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}