import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import HeaderAuth from "./components/HeaderAuth";
import MobileBottomNav from "./components/MobileBottomNav";
import TopTicker from "./components/TopTicker";

export const metadata: Metadata = {
  title: {
    default: "Filtard – Community Curated Memecoin Screener",
    template: "%s | Filtard",
  },
  description:
    "Community-curated memecoin screener. Discover high-signal tokens with theses, ratings, and live data across Solana, Base, Ethereum and more.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Filtard – Community Curated Memecoin Screener",
    description:
      "Community-curated memecoin screener. Discover high-signal tokens with theses, ratings, and live data.",
    url: "https://filtard.vercel.app",
    siteName: "Filtard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Filtard – Community Curated Memecoin Screener",
    description:
      "Community-curated memecoin screener. Discover high-signal tokens with theses, ratings, and live data.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07080a] text-[#f4f6f8] pb-20 md:pb-0">
        <header className="sticky top-0 z-50 border-b border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
          <div className="flex items-center px-3 py-2.5 md:px-6 md:py-3 gap-3">
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-semibold tracking-tight flex-shrink-0"
            >
              <img
                src="/logo.png"
                alt="Filtard"
                className="h-9 w-9 rounded-md object-contain"
              />
              Filtard
            </Link>

            <TopTicker />

            <div className="hidden md:block">
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">{children}</main>

        <MobileBottomNav />
      </body>
    </html>
  );
}