import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#07080a",
          color: "#b8ff3d",
          fontSize: 48,
          fontFamily: "sans-serif",
        }}
      >
        Filtard OG works
      </div>
    ),
    { width: 1200, height: 630 }
  );
}