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
          padding: "28px 40px 28px 40px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Branding — 2x, top right only */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 72,
                height: 72,
                borderRadius: 14,
                backgroundColor: "#b8ff3d",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 800,
                color: "#07080a",
                marginRight: 16,
              }}
            >
              F
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                color: "#5a6270",
                marginRight: 16,
              }}
            >
              |
            </div>
            <div style={{ display: "flex", fontSize: 40, color: "#c0c6d0" }}>
              {domain}
            </div>
          </div>
        </div>

        {/* Token — larger logo + 1.5x ticker */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 56,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              width={160}
              height={160}
              style={{ borderRadius: "50%", marginRight: 28 }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 160,
                height: 160,
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
                fontSize: 96,
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
                fontSize: 36,
                color: "#b0b8c4",
                marginTop: 8,
              }}
            >
              {name}
            </div>
          </div>
        </div>

        {/* Metrics — shifted down via larger margin above */}
        <div style={{ display: "flex", marginBottom: 16 }}>
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
                fontSize: 28,
                color: "#8b93a1",
                marginBottom: 6,
              }}
            >
              Price
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 56,
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
                fontSize: 28,
                color: "#8b93a1",
                marginBottom: 6,
              }}
            >
              24h
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 600,
                color: change.color,
              }}
            >
              {change.text}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexGrow: 1 }} />

        {/* Bottom — fixed tagline only, no thesis */}
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
              marginBottom: 14,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#c0c6d0",
            }}
          >
            Community-curated memecoins screener
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}