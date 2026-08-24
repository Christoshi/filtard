import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function formatPrice(raw: string | null): string {
  if (!raw || raw === "null" || raw === "") return "-";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1) return "$" + n.toFixed(4);
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
  const domain =
    searchParams.get("domain") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ||
    "filtard.vercel.app";

  const price = formatPrice(priceRaw);
  const change = formatChange(changeRaw);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#07080a",
          padding: "40px 48px 36px 48px",
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
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: "#b8ff3d",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#07080a",
                marginRight: 8,
              }}
            >
              F
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#4a5060",
                marginRight: 8,
              }}
            >
              |
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "#8b93a1" }}>
              {domain}
            </div>
          </div>
        </div>

        {/* Token block */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              width={80}
              height={80}
              style={{ borderRadius: "50%", marginRight: 22 }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "#1c1f26",
                marginRight: 22,
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 42,
                fontWeight: 700,
                color: "#f4f6f8",
                lineHeight: 1.1,
              }}
            >
              ${symbol}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#8b93a1",
                marginTop: 6,
              }}
            >
              {name}
            </div>
          </div>
        </div>

        {/* Metrics — tighter, stronger */}
        <div style={{ display: "flex", marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginRight: 56,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              Price
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 44,
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
                fontSize: 16,
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              24h
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 600,
                color: change.color,
              }}
            >
              {change.text}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flexGrow: 1 }} />

        {/* Divider + tagline */}
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
              fontSize: 18,
              color: "#9ca3af",
            }}
          >
            Community-curated memecoins screener
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}