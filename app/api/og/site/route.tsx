import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

async function loadGoogleFont(font: string, weight: number) {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&display=swap`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  );

  if (!resource) {
    throw new Error(`Failed to load font: ${font} ${weight}`);
  }

  const response = await fetch(resource[1]);
  if (!response.ok) {
    throw new Error(`Failed to fetch font data: ${font} ${weight}`);
  }

  return response.arrayBuffer();
}

export async function GET(request: NextRequest) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://filtard.com";
  const logoUrl = `${siteUrl}/logo.png`;

  const [inter400, inter600, inter700] = await Promise.all([
    loadGoogleFont("Inter", 400),
    loadGoogleFont("Inter", 600),
    loadGoogleFont("Inter", 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#07080a",
          fontFamily: "Inter",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 64px",
          }}
        >
          {/* Logo – doubled */}
          <img
            src={logoUrl}
            width={144}
            height={144}
            style={{
              borderRadius: 20,
              marginBottom: 32,
            }}
          />

          {/* FILTARD – +50% size with special spacing */}
          <div
            style={{
              display: "flex",
              fontSize: 138,
              fontWeight: 700,
              color: "#f4f6f8",
              letterSpacing: "0.12em",
              lineHeight: 1,
              marginBottom: 28,
            }}
          >
            FILTARD
          </div>

          {/* Tagline – +25% size */}
          <div
            style={{
              display: "flex",
              fontSize: 35,
              fontWeight: 400,
              color: "#8b93a1",
              letterSpacing: "0.01em",
            }}
          >
            Community-curated memecoin screener
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: inter400, style: "normal", weight: 400 },
        { name: "Inter", data: inter600, style: "normal", weight: 600 },
        { name: "Inter", data: inter700, style: "normal", weight: 700 },
      ],
    }
  );
}