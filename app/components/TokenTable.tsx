"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

type TokenWithStats = {
  id: string;
  chain: string;
  address: string;
  name: string | null;
  symbol: string | null;
  image_url: string | null;
  stats: {
    priceUsd: number | null;
    change24h: number | null;
    volume24h: number | null;
    liquidity: number | null;
    marketCap: number | null;
    txns24h: number | null;
    pairCreatedAt: number | null;
  } | null;
};

type SortKey =
  | "symbol"
  | "marketCap"
  | "priceUsd"
  | "change24h"
  | "volume24h"
  | "txns24h"
  | "liquidity"
  | "age";

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

function formatUsd(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(4)}`;
}

function formatPct(n: number | null) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatAge(timestamp: number | null) {
  if (!timestamp) return "—";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
      </svg>
    );
  }
  return direction === "asc" ? (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  ) : (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function TokenTable({ tokens }: { tokens: TokenWithStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("volume24h");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("filtard-watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch {}
    }
  }, []);

  function toggleWatchlist(e: React.MouseEvent, tokenId: string) {
    e.preventDefault();
    e.stopPropagation();

    setWatchlist((prev) => {
      const next = prev.includes(tokenId)
        ? prev.filter((id) => id !== tokenId)
        : [...prev, tokenId];
      localStorage.setItem("filtard-watchlist", JSON.stringify(next));
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" || key === "age" ? "asc" : "desc");
    }
    setPage(1);
  }

  const filteredAndSorted = useMemo(() => {
    let list = [...tokens];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol?.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case "symbol":
          aVal = (a.symbol || "").toLowerCase();
          bVal = (b.symbol || "").toLowerCase();
          break;
        case "marketCap":
          aVal = a.stats?.marketCap ?? -1;
          bVal = b.stats?.marketCap ?? -1;
          break;
        case "priceUsd":
          aVal = a.stats?.priceUsd ?? -1;
          bVal = b.stats?.priceUsd ?? -1;
          break;
        case "change24h":
          aVal = a.stats?.change24h ?? -999;
          bVal = b.stats?.change24h ?? -999;
          break;
        case "volume24h":
          aVal = a.stats?.volume24h ?? -1;
          bVal = b.stats?.volume24h ?? -1;
          break;
        case "txns24h":
          aVal = a.stats?.txns24h ?? -1;
          bVal = b.stats?.txns24h ?? -1;
          break;
        case "liquidity":
          aVal = a.stats?.liquidity ?? -1;
          bVal = b.stats?.liquidity ?? -1;
          break;
        case "age":
          aVal = a.stats?.pairCreatedAt ?? 0;
          bVal = b.stats?.pairCreatedAt ?? 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [tokens, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageTokens = filteredAndSorted.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, ticker or CA..."
          className="w-full max-w-sm rounded-lg border border-[#1c1f26] bg-[#101215] px-3.5 py-2.5 text-sm placeholder:text-[#5c6573] focus:outline-none focus:border-[#3a3f4b]"
        />
      </div>

      {/* ===== DESKTOP TABLE ===== */}
      <div className="hidden md:block border border-[#1c1f26] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[40px_40px_2.2fr_1fr_1fr_1fr_1fr_0.9fr_0.8fr] gap-0 text-xs text-[#8b93a1] uppercase tracking-wider border-b border-[#1c1f26] bg-[#0c0d10]">
          <div className="px-2 py-3"></div>
          <div className="px-1 py-3 text-center">#</div>
          <div
            className="px-3 py-3 border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center gap-1"
            onClick={() => handleSort("symbol")}
          >
            Token <SortIcon active={sortKey === "symbol"} direction={sortDir} />
          </div>
          <div className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1" onClick={() => handleSort("marketCap")}>
            Mcap <SortIcon active={sortKey === "marketCap"} direction={sortDir} />
          </div>
          <div className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1" onClick={() => handleSort("priceUsd")}>
            Price <SortIcon active={sortKey === "priceUsd"} direction={sortDir} />
          </div>
          <div className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1" onClick={() => handleSort("change24h")}>
            24h <SortIcon active={sortKey === "change24h"} direction={sortDir} />
          </div>
          <div className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1" onClick={() => handleSort("volume24h")}>
            Volume <SortIcon active={sortKey === "volume24h"} direction={sortDir} />
          </div>
          <div className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1" onClick={() => handleSort("liquidity")}>
            Liq <SortIcon active={sortKey === "liquidity"} direction={sortDir} />
          </div>
          <div className="px-3 py-3 text-right cursor-pointer select-none hover:text-white flex items-center justify-end gap-1" onClick={() => handleSort("age")}>
            Age <SortIcon active={sortKey === "age"} direction={sortDir} />
          </div>
        </div>

        {pageTokens.length === 0 ? (
          <div className="p-12 text-center text-[#8b93a1]">No tokens found.</div>
        ) : (
          pageTokens.map((token, index) => {
            const isWatched = watchlist.includes(token.id);
            return (
              <Link
                key={token.id}
                href={`/token/${token.chain}/${token.address}`}
                className={`grid grid-cols-[40px_40px_2.2fr_1fr_1fr_1fr_1fr_0.9fr_0.8fr] gap-0 items-center hover:bg-[#14171d] transition ${
                  index !== pageTokens.length - 1 ? "border-b border-[#1c1f26]" : ""
                }`}
              >
                {/* Star */}
                <div className="px-2 py-3 flex justify-center">
                  <button
                    onClick={(e) => toggleWatchlist(e, token.id)}
                    className={`text-lg leading-none ${
                      isWatched ? "text-[#b8ff3d]" : "text-[#3a3f4b] hover:text-[#8b93a1]"
                    }`}
                  >
                    {isWatched ? "★" : "☆"}
                  </button>
                </div>

                {/* Rank number */}
                <div className="px-1 py-3 text-center text-sm text-[#8b93a1]">
                  {startIndex + index + 1}
                </div>

                {/* Token */}
                <div className="px-3 py-3 border-r border-[#1c1f26] flex items-center gap-3 min-w-0">
                  {token.image_url ? (
                    <img src={token.image_url} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-[#1c1f26] flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[15px] truncate">{token.symbol || "???"}</span>
                      <span className="text-[11px] text-[#8b93a1] border border-[#1c1f26] px-1.5 rounded">
                        {token.chain}
                      </span>
                    </div>
                    <div className="text-[13px] text-[#8b93a1] truncate">
                      {token.name || token.address.slice(0, 8) + "…"}
                    </div>
                  </div>
                </div>

                <div className="px-3 py-3 text-right border-r border-[#1c1f26] text-[15px]">
                  {formatUsd(token.stats?.marketCap ?? null)}
                </div>
                <div className="px-3 py-3 text-right border-r border-[#1c1f26] text-[15px] font-medium">
                  {formatUsd(token.stats?.priceUsd ?? null)}
                </div>
                <div className={`px-3 py-3 text-right border-r border-[#1c1f26] text-[15px] ${
                  (token.stats?.change24h ?? 0) < 0 ? "text-red-400" : "text-green-400"
                }`}>
                  {formatPct(token.stats?.change24h ?? null)}
                </div>
                <div className="px-3 py-3 text-right border-r border-[#1c1f26] text-[15px]">
                  {formatUsd(token.stats?.volume24h ?? null)}
                </div>
                <div className="px-3 py-3 text-right border-r border-[#1c1f26] text-[15px] text-[#8b93a1]">
                  {formatUsd(token.stats?.liquidity ?? null)}
                </div>
                <div className="px-3 py-3 text-right text-[15px] text-[#8b93a1]">
                  {formatAge(token.stats?.pairCreatedAt ?? null)}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* ===== MOBILE CARDS ===== */}
      <div className="md:hidden space-y-3">
        {pageTokens.length === 0 ? (
          <div className="p-10 text-center text-[#8b93a1] border border-[#1c1f26] rounded-xl">
            No tokens found.
          </div>
        ) : (
          pageTokens.map((token) => {
            const isWatched = watchlist.includes(token.id);
            return (
              <Link
                key={token.id}
                href={`/token/${token.chain}/${token.address}`}
                className="block border border-[#1c1f26] rounded-xl p-4 bg-[#101215] hover:bg-[#14171d] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {token.image_url ? (
                      <img src={token.image_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-[#1c1f26] flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{token.symbol || "???"}</span>
                        <span className="text-[11px] text-[#8b93a1] border border-[#1c1f26] px-1.5 rounded">
                          {token.chain}
                        </span>
                      </div>
                      <div className="text-sm text-[#8b93a1] truncate">
                        {token.name || token.address.slice(0, 10) + "…"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleWatchlist(e, token.id)}
                    className={`text-xl leading-none flex-shrink-0 ${
                      isWatched ? "text-[#b8ff3d]" : "text-[#3a3f4b]"
                    }`}
                  >
                    {isWatched ? "★" : "☆"}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <div className="text-[11px] text-[#8b93a1]">Price</div>
                    <div className="font-medium">{formatUsd(token.stats?.priceUsd ?? null)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8b93a1]">24h</div>
                    <div className={`font-medium ${
                      (token.stats?.change24h ?? 0) < 0 ? "text-red-400" : "text-green-400"
                    }`}>
                      {formatPct(token.stats?.change24h ?? null)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8b93a1]">Mcap</div>
                    <div className="font-medium">{formatUsd(token.stats?.marketCap ?? null)}</div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-[#1c1f26] text-[#8b93a1] hover:text-white disabled:opacity-40 transition"
          >
            ← Prev
          </button>
          <span className="text-[#8b93a1]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-[#1c1f26] text-[#8b93a1] hover:text-white disabled:opacity-40 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}