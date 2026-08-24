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
          width: "100%",
          height: "100%",
          backgroundColor: "#07080a",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left accent strip */}
        <div
          style={{
            display: "flex",
            width: 6,
            height: "100%",
            backgroundColor: "#b8ff3d",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: "100%",
            padding: "32px 44px 28px 40px",
          }}
        >
          {/* Top branding — quiet, right */}
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
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: "#b8ff3d",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#07080a",
                  marginRight: 12,
                }}
              >
                F
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#4a5060",
                  marginRight: 12,
                }}
              >
                |
              </div>
              <div style={{ display: "flex", fontSize: 22, color: "#8b93a1" }}>
                {domain}
              </div>
            </div>
          </div>

          {/* Middle: two columns */}
          <div
            style={{
              display: "flex",
              flex: 1,
              width: "100%",
              alignItems: "center",
            }}
          >
            {/* Left — identity */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                paddingRight: 40,
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  width={140}
                  height={140}
                  style={{ borderRadius: "50%", marginRight: 28 }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 140,
                    height: 140,
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
                    fontSize: 64,
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
                    fontSize: 28,
                    color: "#9ca3af",
                    marginTop: 8,
                  }}
                >
                  {name}
                </div>
              </div>
            </div>

            {/* Right — metrics panel */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 340,
                backgroundColor: "#0e1014",
                borderRadius: 16,
                border: "1px solid #1c1f26",
                padding: "28px 32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    color: "#6b7280",
                    marginBottom: 6,
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
                    fontSize: 20,
                    color: "#6b7280",
                    marginBottom: 6,
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
          </div>

          {/* Bottom tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              marginTop: 24,
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
                fontSize: 22,
                color: "#8b93a1",
              }}
            >
              Community-curated memecoins screener
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}