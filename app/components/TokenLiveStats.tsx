"use client";

import { useEffect, useState } from "react";

type LiveMetrics = {
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
};

function formatUsd(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;

  const s = n.toFixed(12);
  const match = s.match(/^0\.(0+)(\d+)/);
  if (match) {
    const zeros = match[1].length;
    const digits = match[2].replace(/0+$/, "").slice(0, 4) || "0";
    const sub = "₀₁₂₃₄₅₆₇₈₉";
    const zeroStr = String(zeros)
      .split("")
      .map((d) => sub[Number(d)])
      .join("");
    return `$0.0${zeroStr}${digits}`;
  }
  return `$${n.toPrecision(4)}`;
}

function formatPct(n: number | null) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function TokenLiveStats({
  address,
  initial,
}: {
  address: string;
  initial: LiveMetrics;
}) {
  const [metrics, setMetrics] = useState<LiveMetrics>(initial);

  useEffect(() => {
    setMetrics(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${address}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const pair = data?.pairs?.[0];
        if (!pair || cancelled) return;

        setMetrics({
          priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
          change24h: pair.priceChange?.h24 ?? null,
          volume24h: pair.volume?.h24 ?? null,
          liquidity: pair.liquidity?.usd ?? null,
          marketCap: pair.marketCap ?? pair.fdv ?? null,
        });
      } catch {
        // keep previous metrics (same idea as DB fallback)
      }
    }

    poll();
    const interval = setInterval(poll, 15_000);

    function onVisibility() {
      if (document.visibilityState === "visible") poll();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [address]);

  const card =
    "rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 flex-1 min-w-[85px] lg:flex-none lg:min-w-[90px]";

  return (
    <>
      <div className={card}>
        <div className="text-[10px] text-[#8b93a1]">Price</div>
        <div className="font-medium">{formatUsd(metrics.priceUsd)}</div>
      </div>

      <div className={card}>
        <div className="text-[10px] text-[#8b93a1]">24h</div>
        <div
          className={`font-medium ${
            (metrics.change24h ?? 0) < 0 ? "text-red-400" : "text-green-400"
          }`}
        >
          {formatPct(metrics.change24h)}
        </div>
      </div>

      <div className={card}>
        <div className="text-[10px] text-[#8b93a1]">Volume</div>
        <div className="font-medium">{formatUsd(metrics.volume24h)}</div>
      </div>

      <div className={card}>
        <div className="text-[10px] text-[#8b93a1]">Liquidity</div>
        <div className="font-medium">{formatUsd(metrics.liquidity)}</div>
      </div>

      <div className={card}>
        <div className="text-[10px] text-[#8b93a1]">Mcap</div>
        <div className="font-medium">{formatUsd(metrics.marketCap)}</div>
      </div>
    </>
  );
}