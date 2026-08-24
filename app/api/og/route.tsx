import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function formatPrice(raw: string | null): string {
  if (!raw || raw === "null" || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toPrecision(4)}`;
}

function formatChange(raw: string | null): { text: string; color: string } {
  if (!raw || raw === "null" || raw === "") {
    return { text: "—", color: "#8b93a1" };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return { text: "—", color: "#8b93a1" };
  const sign = n > 0 ? "+" : "";
  return {
    text: `${sign}${n.toFixed(2)}%`,
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

  let logoSrc: string | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/png";
        const base64 = Buffer.from(buf).toString("base64");
        logoSrc = `data:${contentType};base64,${base64}`;
      }
    } catch {
      // ignore
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#07080a",
          padding: "48px 56px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top row — branding only, right-aligned */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: "#b8ff3d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 800,
              color: "#07080a",
            }}
          >
            F
          </div>
          <div style={{ fontSize: 18, color: "#3a3f4a" }}>|</div>
          <div style={{ fontSize: 18, color: "#8b93a1" }}>{domain}</div>
        </div>

        {/* Token block — left-aligned, below branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              width={72}
              height={72}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                backgroundColor: "#1c1f26",
                display: "flex",
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#f4f6f8",
                lineHeight: 1.1,
              }}
            >
              ${symbol}
            </div>
            <div style={{ fontSize: 20, color: "#8b93a1", marginTop: 4 }}>
              {name}
            </div>
          </div>
        </div>

        {/* Metrics — left-aligned */}
        <div
          style={{
            display: "flex",
            gap: "64px",
            marginTop: "auto",
            marginBottom: "auto",
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, color: "#8b93a1", marginBottom: 6 }}>
              Price
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 600,
                color: "#f4f6f8",
                letterSpacing: "-0.02em",
              }}
            >
              {price}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, color: "#8b93a1", marginBottom: 6 }}>
              24h
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 600,
                color: change.color,
                letterSpacing: "-0.02em",
              }}
            >
              {change.text}
            </div>
          </div>
        </div>

        {/* Bottom tagline — centered */}
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
              width: "100%",
              height: 1,
              backgroundColor: "#1c1f26",
              marginBottom: 20,
            }}
          />
          <div style={{ fontSize: 18, color: "#8b93a1" }}>
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