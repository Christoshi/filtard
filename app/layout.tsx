import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HeaderAuth from "./components/HeaderAuth";

export const metadata: Metadata = {
  title: "Filtard",
  description: "Community curated memecoin screener",
};

export const revalidate = 60;

async function getTopTokens() {
  const { data: tokens } = await supabase
    .from("tokens")
    .select("id, chain, address, symbol")
    .eq("status", "approved")
    .limit(40);

  if (!tokens || tokens.length === 0) return [];

  const withStats = await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
          { next: { revalidate: 60 } }
        );
        const data = await res.json();
        const pair = data?.pairs?.[0];
        return {
          ...token,
          volume24h: pair?.volume?.h24 ?? 0,
          change24h: pair?.priceChange?.h24 ?? 0,
        };
      } catch {
        return { ...token, volume24h: 0, change24h: 0 };
      }
    })
  );

  return withStats
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 12);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const topTokens = await getTopTokens();
  const tickerItems = [...topTokens, ...topTokens];

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07080a] text-[#f4f6f8] pb-20 md:pb-0">
        <header className="sticky top-0 z-50 border-b border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
          <div className="flex items-center px-3 py-2.5 md:px-6 md:py-3 gap-3">
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-semibold tracking-tight flex-shrink-0"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#b8ff3d] text-sm font-bold text-black">
                F
              </span>
              Filtard
            </Link>

            <div className="flex-1 overflow-hidden min-w-0">
              {topTokens.length > 0 ? (
                <div className="marquee-track">
                  {tickerItems.map((token, index) => (
                    <Link
                      key={`${token.id}-${index}`}
                      href={`/token/${token.chain}/${token.address}`}
                      className="mx-5 inline-flex items-center gap-1.5 text-sm whitespace-nowrap hover:text-white transition"
                    >
                      <span className="font-medium text-[#f4f6f8]">
                        {token.symbol || "???"}
                      </span>
                      <span
                        className={
                          token.change24h >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {token.change24h >= 0 ? "+" : ""}
                        {token.change24h.toFixed(1)}%
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-[#8b93a1]">No tokens yet</span>
              )}
            </div>

            <div className="hidden md:block">
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
          <div className="flex items-center justify-around h-16">
            <Link
              href="/"
              className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#b8ff3d] text-sm font-bold text-black">
                F
              </span>
            </Link>

            <button
              onClick={() => window.dispatchEvent(new Event("filtard-toggle-search"))}
              className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="text-[10px]">Search</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new Event("filtard-toggle-watchlist"))}
              className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-[10px]">Watchlist</span>
            </button>

            <Link
              href="/login"
              className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[10px]">Submit</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}