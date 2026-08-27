import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

async function loadGoogleFont(font: string, weight: number) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&display=swap`;
    const css = await (await fetch(url)).text();
    const resource = css.match(
      /src: url\((.+)\) format\('(opentype|truetype)'\)/
    );
    if (!resource) return null;
    const response = await fetch(resource[1]);
    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
}

function formatPrice(raw: string | null): string {
  if (!raw || raw === "null" || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1) return "$" + n.toFixed(4);
  if (n >= 0.01) return "$" + n.toFixed(4);
  if (n >= 0.0001) return "$" + n.toFixed(6);
  return "$" + n.toPrecision(4);
}

function formatChange(raw: string | null): { text: string; color: string } {
  if (!raw || raw === "null" || raw === "") {
    return { text: "—", color: "#8b93a1" };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return { text: "—", color: "#8b93a1" };
  const sign = n > 0 ? "+" : "";
  return {
    text: sign + n.toFixed(2) + "%",
    color: n < 0 ? "#f87171" : "#4ade80",
  };
}

function formatMcap(raw: string | null): string {
  if (!raw || raw === "null" || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const symbol = searchParams.get("symbol") || "???";
  const name = searchParams.get("name") || "Unknown";
  const priceRaw = searchParams.get("price");
  const changeRaw = searchParams.get("change");
  const mcapRaw = searchParams.get("mcap");
  const imageUrl = searchParams.get("image");

  const logoUrl = "https://www.filtard.com/logo.png";

  const price = formatPrice(priceRaw);
  const change = formatChange(changeRaw);
  const mcap = formatMcap(mcapRaw);

  const [inter400, inter600, inter700] = await Promise.all([
    loadGoogleFont("Inter", 400),
    loadGoogleFont("Inter", 600),
    loadGoogleFont("Inter", 700),
  ]);

  const fonts = [
    inter400 && { name: "Inter", data: inter400, style: "normal" as const, weight: 400 as const },
    inter600 && { name: "Inter", data: inter600, style: "normal" as const, weight: 600 as const },
    inter700 && { name: "Inter", data: inter700, style: "normal" as const, weight: 700 as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; style: "normal"; weight: 400 | 600 | 700 }[];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#07080a",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: "100%",
            padding: "36px 48px 32px 48px",
          }}
        >
          {/* Top branding */}
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "flex-start",
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src={logoUrl}
                width={40}
                height={40}
                style={{ borderRadius: 8, marginRight: 12 }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#f4f6f8",
                  letterSpacing: "-0.02em",
                }}
              >
                Filtard
              </div>
            </div>
          </div>

          {/* Main content */}
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
                  width={148}
                  height={148}
                  style={{
                    borderRadius: "50%",
                    marginRight: 28,
                    border: "2px solid #1c1f26",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 148,
                    height: 148,
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
                    fontSize: 56,
                    fontWeight: 700,
                    color: "#f4f6f8",
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  ${symbol}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    color: "#9ca3af",
                    marginTop: 6,
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
                padding: "26px 30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    color: "#6b7280",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Price
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 36,
                    fontWeight: 600,
                    color: "#f4f6f8",
                  }}
                >
                  {price}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    color: "#6b7280",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  24h
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 36,
                    fontWeight: 600,
                    color: change.color,
                  }}
                >
                  {change.text}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    color: "#6b7280",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Market Cap
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 36,
                    fontWeight: 600,
                    color: "#f4f6f8",
                  }}
                >
                  {mcap}
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
              marginTop: 28,
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
                fontSize: 26,
                color: "#8b93a1",
                fontWeight: 400,
              }}
            >
              Community-curated memecoin screener
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
      fonts,
    }
  );
}