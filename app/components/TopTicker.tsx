"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TickerToken = {
  id: string;
  chain: string;
  address: string;
  symbol: string | null;
  change24h: number;
};

export default function TopTicker() {
  const [tokens, setTokens] = useState<TickerToken[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/top-tokens");
        if (!res.ok) throw new Error("Failed to load ticker");
        const data = await res.json();
        if (!cancelled) {
          setTokens(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setTokens([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();

    // Refresh every 3 minutes while the tab is open
    const interval = setInterval(load, 180_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!loaded || tokens.length === 0) {
    return (
      <div className="flex-1 overflow-hidden min-w-0">
        <span className="text-sm text-[#8b93a1]">Loading…</span>
      </div>
    );
  }

  const tickerItems = [...tokens, ...tokens];

  return (
    <div className="flex-1 overflow-hidden min-w-0">
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
    </div>
  );
}