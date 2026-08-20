"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";

type TokenWithStats = {
  id: string;
  chain: string;
  address: string;
  name: string | null;
  symbol: string | null;
  image_url: string | null;
  is_pinned?: boolean;
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

const CHAINS = [
  { id: "all", label: "All Chains" },
  { id: "solana", label: "Solana" },
  { id: "base", label: "Base" },
  { id: "ethereum", label: "Ethereum" },
  { id: "bsc", label: "BSC" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "robinhood", label: "Robinhood" },
];

const AGE_OPTIONS = [
  { id: "any", label: "Any age" },
  { id: "24h", label: "< 24h" },
  { id: "7d", label: "< 7d" },
  { id: "30d", label: "< 30d" },
];

const MCAP_OPTIONS = [
  { id: "any", label: "Any mcap" },
  { id: "lt10k", label: "< $10K" },
  { id: "10k-100k", label: "$10K – $100K" },
  { id: "100k-1m", label: "$100K – $1M" },
  { id: "1m-10m", label: "$1M – $10M" },
  { id: "gt10m", label: "> $10M" },
];

const LIQ_OPTIONS = [
  { id: "any", label: "Any liq" },
  { id: "gt1k", label: "> $1K" },
  { id: "gt5k", label: "> $5K" },
  { id: "gt10k", label: "> $10K" },
  { id: "gt50k", label: "> $50K" },
  { id: "gt100k", label: "> $100K" },
];

const VOL_OPTIONS = [
  { id: "any", label: "Any volume" },
  { id: "gt1k", label: "> $1K" },
  { id: "gt5k", label: "> $5K" },
  { id: "gt10k", label: "> $10K" },
  { id: "gt50k", label: "> $50K" },
  { id: "gt100k", label: "> $100K" },
];

const TXNS_OPTIONS = [
  { id: "any", label: "Any txns" },
  { id: "gt10", label: "> 10" },
  { id: "gt50", label: "> 50" },
  { id: "gt100", label: "> 100" },
  { id: "gt500", label: "> 500" },
  { id: "gt1000", label: "> 1K" },
];

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

const mutedBtn =
  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition bg-[#101215] text-[#8b93a1] border-[#1c1f26] hover:border-[#3a3f4b] hover:text-[#f4f6f8]";
const mutedBtnActive =
  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition bg-[#1c1f26] text-[#b8ff3d] border-[#b8ff3d]/30";

export default function TokenTable({
  tokens,
  currentChain = "all",
  onlyNew = false,
}: {
  tokens: TokenWithStats[];
  currentChain?: string;
  onlyNew?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("volume24h");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Filter state (no partnership)
  const [filterAge, setFilterAge] = useState("any");
  const [filterMcap, setFilterMcap] = useState("any");
  const [filterLiq, setFilterLiq] = useState("any");
  const [filterVol, setFilterVol] = useState("any");
  const [filterTxns, setFilterTxns] = useState("any");
  const [filterChangeMin, setFilterChangeMin] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("filtard-watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  useEffect(() => {
    function onToggleSearch() {
      setShowSearch((prev) => {
        const next = !prev;
        if (next) {
          window.scrollTo({ top: 0, behavior: "instant" });
          setTimeout(() => searchInputRef.current?.focus(), 80);
        }
        return next;
      });
      setShowWatchlistOnly(false);
      setShowFilters(false);
    }

    function onToggleWatchlist() {
      setShowWatchlistOnly((prev) => !prev);
      setShowSearch(false);
      setShowFilters(false);
      setPage(1);
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    function onCloseAll() {
      setShowSearch(false);
      setShowWatchlistOnly(false);
      setShowFilters(false);
      setSearch("");
      setPage(1);
    }

    window.addEventListener("filtard-toggle-search", onToggleSearch);
    window.addEventListener("filtard-toggle-watchlist", onToggleWatchlist);
    window.addEventListener("filtard-close-all", onCloseAll);

    return () => {
      window.removeEventListener("filtard-toggle-search", onToggleSearch);
      window.removeEventListener("filtard-toggle-watchlist", onToggleWatchlist);
      window.removeEventListener("filtard-close-all", onCloseAll);
    };
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

  function clearFilters() {
    setFilterAge("any");
    setFilterMcap("any");
    setFilterLiq("any");
    setFilterVol("any");
    setFilterTxns("any");
    setFilterChangeMin("");
    setPage(1);
  }

  const activeFilterCount = [
    filterAge !== "any",
    filterMcap !== "any",
    filterLiq !== "any",
    filterVol !== "any",
    filterTxns !== "any",
    filterChangeMin !== "",
  ].filter(Boolean).length;

  const filteredAndSorted = useMemo(() => {
    let list = [...tokens];

    if (showWatchlistOnly) {
      list = list.filter((t) => watchlist.includes(t.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol?.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q)
      );
    }

    // Age filter
    if (filterAge !== "any") {
      const now = Date.now();
      list = list.filter((t) => {
        const ts = t.stats?.pairCreatedAt;
        if (!ts) return false;
        const hours = (now - ts) / (1000 * 60 * 60);
        if (filterAge === "24h") return hours <= 24;
        if (filterAge === "7d") return hours <= 24 * 7;
        if (filterAge === "30d") return hours <= 24 * 30;
        return true;
      });
    }

    // Market Cap filter
    if (filterMcap !== "any") {
      list = list.filter((t) => {
        const m = t.stats?.marketCap;
        if (m == null) return false;
        if (filterMcap === "lt10k") return m < 10_000;
        if (filterMcap === "10k-100k") return m >= 10_000 && m < 100_000;
        if (filterMcap === "100k-1m") return m >= 100_000 && m < 1_000_000;
        if (filterMcap === "1m-10m") return m >= 1_000_000 && m < 10_000_000;
        if (filterMcap === "gt10m") return m >= 10_000_000;
        return true;
      });
    }

    // Liquidity filter
    if (filterLiq !== "any") {
      list = list.filter((t) => {
        const l = t.stats?.liquidity;
        if (l == null) return false;
        if (filterLiq === "gt1k") return l >= 1_000;
        if (filterLiq === "gt5k") return l >= 5_000;
        if (filterLiq === "gt10k") return l >= 10_000;
        if (filterLiq === "gt50k") return l >= 50_000;
        if (filterLiq === "gt100k") return l >= 100_000;
        return true;
      });
    }

    // Volume 24h filter
    if (filterVol !== "any") {
      list = list.filter((t) => {
        const v = t.stats?.volume24h;
        if (v == null) return false;
        if (filterVol === "gt1k") return v >= 1_000;
        if (filterVol === "gt5k") return v >= 5_000;
        if (filterVol === "gt10k") return v >= 10_000;
        if (filterVol === "gt50k") return v >= 50_000;
        if (filterVol === "gt100k") return v >= 100_000;
        return true;
      });
    }

    // Txns 24h filter
    if (filterTxns !== "any") {
      list = list.filter((t) => {
        const tx = t.stats?.txns24h;
        if (tx == null) return false;
        if (filterTxns === "gt10") return tx >= 10;
        if (filterTxns === "gt50") return tx >= 50;
        if (filterTxns === "gt100") return tx >= 100;
        if (filterTxns === "gt500") return tx >= 500;
        if (filterTxns === "gt1000") return tx >= 1000;
        return true;
      });
    }

    // Min 24h Change %
    if (filterChangeMin !== "") {
      const min = Number(filterChangeMin);
      if (!isNaN(min)) {
        list = list.filter((t) => (t.stats?.change24h ?? -999) >= min);
      }
    }

    // Keep pinned token(s) on top
    const pinned = list.filter((t) => t.is_pinned);
    const rest = list.filter((t) => !t.is_pinned);

    rest.sort((a, b) => {
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

    return [...pinned, ...rest];
  }, [
    tokens,
    search,
    sortKey,
    sortDir,
    showWatchlistOnly,
    watchlist,
    filterAge,
    filterMcap,
    filterLiq,
    filterVol,
    filterTxns,
    filterChangeMin,
  ]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageTokens = filteredAndSorted.slice(startIndex, startIndex + PAGE_SIZE);

  const currentChainLabel =
    CHAINS.find((c) => c.id === currentChain)?.label || "All Chains";

  function buildUrl(params: { chain?: string; new?: boolean }) {
    const search = new URLSearchParams();
    if (params.chain && params.chain !== "all") search.set("chain", params.chain);
    if (params.new) search.set("new", "true");
    const str = search.toString();
    return str ? `/?${str}` : "/";
  }

  const FiltersPanel = (
    <div className="p-4 space-y-4 min-w-[280px]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#f4f6f8]">Filters</span>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-[#8b93a1] hover:text-[#b8ff3d] transition"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Age */}
      <div>
        <div className="text-xs text-[#8b93a1] mb-1.5">Age</div>
        <div className="flex flex-wrap gap-1.5">
          {AGE_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setFilterAge(o.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${
                filterAge === o.id
                  ? "bg-[#b8ff3d]/10 text-[#b8ff3d] border-[#b8ff3d]/30"
                  : "bg-[#101215] text-[#8b93a1] border-[#1c1f26] hover:border-[#3a3f4b]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market Cap */}
      <div>
        <div className="text-xs text-[#8b93a1] mb-1.5">Market Cap</div>
        <div className="flex flex-wrap gap-1.5">
          {MCAP_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setFilterMcap(o.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${
                filterMcap === o.id
                  ? "bg-[#b8ff3d]/10 text-[#b8ff3d] border-[#b8ff3d]/30"
                  : "bg-[#101215] text-[#8b93a1] border-[#1c1f26] hover:border-[#3a3f4b]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liquidity */}
      <div>
        <div className="text-xs text-[#8b93a1] mb-1.5">Liquidity</div>
        <div className="flex flex-wrap gap-1.5">
          {LIQ_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setFilterLiq(o.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${
                filterLiq === o.id
                  ? "bg-[#b8ff3d]/10 text-[#b8ff3d] border-[#b8ff3d]/30"
                  : "bg-[#101215] text-[#8b93a1] border-[#1c1f26] hover:border-[#3a3f4b]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div>
        <div className="text-xs text-[#8b93a1] mb-1.5">Volume 24h</div>
        <div className="flex flex-wrap gap-1.5">
          {VOL_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setFilterVol(o.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${
                filterVol === o.id
                  ? "bg-[#b8ff3d]/10 text-[#b8ff3d] border-[#b8ff3d]/30"
                  : "bg-[#101215] text-[#8b93a1] border-[#1c1f26] hover:border-[#3a3f4b]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Txns */}
      <div>
        <div className="text-xs text-[#8b93a1] mb-1.5">Txns 24h</div>
        <div className="flex flex-wrap gap-1.5">
          {TXNS_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setFilterTxns(o.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${
                filterTxns === o.id
                  ? "bg-[#b8ff3d]/10 text-[#b8ff3d] border-[#b8ff3d]/30"
                  : "bg-[#101215] text-[#8b93a1] border-[#1c1f26] hover:border-[#3a3f4b]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Min 24h Change % */}
      <div>
        <div className="text-xs text-[#8b93a1] mb-1.5">Min 24h Change %</div>
        <input
          type="number"
          value={filterChangeMin}
          onChange={(e) => {
            setFilterChangeMin(e.target.value);
            setPage(1);
          }}
          placeholder="e.g. 10"
          className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-1.5 text-sm text-[#f4f6f8] placeholder:text-[#5c6573] focus:outline-none focus:border-[#b8ff3d]/40"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* ===== DESKTOP CONTROLS ===== */}
      <div className="hidden md:flex flex-wrap items-center gap-3 mb-5">
        {/* Chain */}
        <div className="relative">
          <details className="group">
            <summary className={`${mutedBtn} cursor-pointer list-none`}>
              <span className="text-[#f4f6f8] font-medium">{currentChainLabel}</span>
              <svg
                className="w-4 h-4 text-[#8b93a1] group-open:rotate-180 transition"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="absolute left-0 mt-2 w-48 rounded-xl border border-[#1c1f26] bg-[#101215] shadow-xl overflow-hidden z-40">
              {CHAINS.map((c) => (
                <Link
                  key={c.id}
                  href={buildUrl({ chain: c.id, new: onlyNew })}
                  className={`block px-4 py-2.5 text-sm transition ${
                    currentChain === c.id
                      ? "bg-[#b8ff3d]/10 text-[#b8ff3d]"
                      : "text-[#f4f6f8] hover:bg-[#1c1f26]"
                  }`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </details>
        </div>

        {/* New */}
        <Link
          href={buildUrl({ chain: currentChain, new: !onlyNew })}
          className={onlyNew ? mutedBtnActive : mutedBtn}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          New
        </Link>

        {/* Watchlist */}
        <button
          onClick={() => {
            setShowWatchlistOnly((prev) => !prev);
            setPage(1);
          }}
          className={showWatchlistOnly ? mutedBtnActive : mutedBtn}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Watchlist
        </button>

        {/* Filters */}
        <div className="relative" ref={filtersRef}>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={activeFilterCount > 0 || showFilters ? mutedBtnActive : mutedBtn}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="8" y1="4" x2="8" y2="12" />
              <line x1="4" y1="16" x2="20" y2="16" />
              <line x1="16" y1="12" x2="16" y2="20" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#b8ff3d] text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="absolute left-0 mt-2 rounded-xl border border-[#1c1f26] bg-[#0c0d10] shadow-2xl z-50 overflow-hidden">
              {FiltersPanel}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c6573] pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, ticker or CA..."
            className="w-full rounded-xl border border-[#1c1f26] bg-[#101215] pl-10 pr-10 py-2.5 text-sm placeholder:text-[#5c6573] focus:outline-none focus:border-[#b8ff3d]/50 focus:ring-1 focus:ring-[#b8ff3d]/20 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c6573] hover:text-white transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ===== MOBILE CONTROLS ===== */}
      <div className="md:hidden flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative">
          <details className="group">
            <summary className={`${mutedBtn} cursor-pointer list-none text-xs px-3 py-1.5`}>
              <span className="text-[#f4f6f8] font-medium">{currentChainLabel}</span>
              <svg
                className="w-3.5 h-3.5 text-[#8b93a1] group-open:rotate-180 transition"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="absolute left-0 mt-2 w-44 rounded-xl border border-[#1c1f26] bg-[#101215] shadow-xl overflow-hidden z-40">
              {CHAINS.map((c) => (
                <Link
                  key={c.id}
                  href={buildUrl({ chain: c.id, new: onlyNew })}
                  className={`block px-3 py-2 text-sm transition ${
                    currentChain === c.id
                      ? "bg-[#b8ff3d]/10 text-[#b8ff3d]"
                      : "text-[#f4f6f8] hover:bg-[#1c1f26]"
                  }`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </details>
        </div>

        <Link
          href={buildUrl({ chain: currentChain, new: !onlyNew })}
          className={
            onlyNew
              ? mutedBtnActive + " text-xs px-3 py-1.5"
              : mutedBtn + " text-xs px-3 py-1.5"
          }
        >
          New
        </Link>

        <div className="relative" ref={filtersRef}>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={
              (activeFilterCount > 0 || showFilters ? mutedBtnActive : mutedBtn) +
              " text-xs px-3 py-1.5"
            }
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="8" y1="4" x2="8" y2="12" />
              <line x1="4" y1="16" x2="20" y2="16" />
              <line x1="16" y1="12" x2="16" y2="20" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#b8ff3d] text-[9px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="absolute left-0 mt-2 w-[min(92vw,320px)] rounded-xl border border-[#1c1f26] bg-[#0c0d10] shadow-2xl z-50 overflow-hidden">
              {FiltersPanel}
            </div>
          )}
        </div>
      </div>

      {showWatchlistOnly && (
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-[#b8ff3d]">★ Showing watchlist only</span>
          <button
            onClick={() => setShowWatchlistOnly(false)}
            className="text-[#8b93a1] hover:text-white"
          >
            Show all
          </button>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-[#8b93a1]">
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active ·{" "}
            {filteredAndSorted.length} tokens
          </span>
          <button onClick={clearFilters} className="text-[#8b93a1] hover:text-[#b8ff3d]">
            Clear filters
          </button>
        </div>
      )}

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
          <div
            className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1"
            onClick={() => handleSort("marketCap")}
          >
            Mcap <SortIcon active={sortKey === "marketCap"} direction={sortDir} />
          </div>
          <div
            className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1"
            onClick={() => handleSort("priceUsd")}
          >
            Price <SortIcon active={sortKey === "priceUsd"} direction={sortDir} />
          </div>
          <div
            className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1"
            onClick={() => handleSort("change24h")}
          >
            24h <SortIcon active={sortKey === "change24h"} direction={sortDir} />
          </div>
          <div
            className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1"
            onClick={() => handleSort("volume24h")}
          >
            Volume <SortIcon active={sortKey === "volume24h"} direction={sortDir} />
          </div>
          <div
            className="px-3 py-3 text-right border-r border-[#1c1f26] cursor-pointer select-none hover:text-white flex items-center justify-end gap-1"
            onClick={() => handleSort("liquidity")}
          >
            Liq <SortIcon active={sortKey === "liquidity"} direction={sortDir} />
          </div>
          <div
            className="px-3 py-3 text-right cursor-pointer select-none hover:text-white flex items-center justify-end gap-1"
            onClick={() => handleSort("age")}
          >
            Age <SortIcon active={sortKey === "age"} direction={sortDir} />
          </div>
        </div>

        {pageTokens.length === 0 ? (
          <div className="p-12 text-center text-[#8b93a1]">No tokens found.</div>
        ) : (
          pageTokens.map((token, index) => {
            const isWatched = watchlist.includes(token.id);
            const isPinned = !!token.is_pinned;

            return (
              <Link
                key={token.id}
                href={`/token/${token.chain}/${token.address}`}
                className={`grid grid-cols-[40px_40px_2.2fr_1fr_1fr_1fr_1fr_0.9fr_0.8fr] gap-0 items-center transition ${
                  isPinned
                    ? "bg-[#b8ff3d]/[0.04] border-y border-[#b8ff3d]/20"
                    : "hover:bg-[#14171d]"
                } ${index !== pageTokens.length - 1 && !isPinned ? "border-b border-[#1c1f26]" : ""}`}
              >
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

                <div className="px-1 py-3 text-center text-sm text-[#8b93a1]">
                  {isPinned ? (
                    <span className="text-[#b8ff3d] text-xs font-medium">P</span>
                  ) : (
                    startIndex + index + 1
                  )}
                </div>

                <div className="px-3 py-3 border-r border-[#1c1f26] flex items-center gap-3 min-w-0">
                  {token.image_url ? (
                    <img
                      src={token.image_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-[#1c1f26] flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[15px] truncate">
                        {token.symbol || "???"}
                      </span>
                      {isPinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#b8ff3d]/10 text-[#8b93a1] font-medium tracking-wide">
                          Partnership
                        </span>
                      )}
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
                <div
                  className={`px-3 py-3 text-right border-r border-[#1c1f26] text-[15px] ${
                    (token.stats?.change24h ?? 0) < 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
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

      {/* ===== MOBILE SEARCH ===== */}
      {showSearch && (
        <div className="md:hidden mb-3">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c6573] pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>

            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, ticker or CA..."
              className="w-full rounded-xl border border-[#1c1f26] bg-[#101215] pl-10 pr-10 py-3 text-sm placeholder:text-[#5c6573] focus:outline-none focus:border-[#b8ff3d]/60 focus:ring-1 focus:ring-[#b8ff3d]/25 transition shadow-sm"
              autoFocus
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c6573] hover:text-white transition p-0.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== MOBILE TABLE ===== */}
      <div className="md:hidden border border-[#1c1f26] rounded-xl overflow-hidden">
        {pageTokens.length === 0 ? (
          <div className="p-10 text-center text-[#8b93a1]">No tokens found.</div>
        ) : (
          pageTokens.map((token, index) => {
            const isWatched = watchlist.includes(token.id);
            const isPinned = !!token.is_pinned;

            return (
              <Link
                key={token.id}
                href={`/token/${token.chain}/${token.address}`}
                className={`block transition ${
                  isPinned
                    ? "bg-[#b8ff3d]/[0.04] border-y border-[#b8ff3d]/20"
                    : "hover:bg-[#14171d]"
                } ${index !== pageTokens.length - 1 && !isPinned ? "border-b border-[#1c1f26]" : ""}`}
              >
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <button
                    onClick={(e) => toggleWatchlist(e, token.id)}
                    className={`text-lg leading-none flex-shrink-0 ${
                      isWatched ? "text-[#b8ff3d]" : "text-[#3a3f4b]"
                    }`}
                  >
                    {isWatched ? "★" : "☆"}
                  </button>

                  {token.image_url ? (
                    <img
                      src={token.image_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-[#1c1f26] flex-shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[14px] truncate">
                        {token.symbol || "???"}
                      </span>
                      {isPinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#b8ff3d]/10 text-[#8b93a1] font-medium">
                          Partnership
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#8b93a1] truncate">
                      {token.name || token.address.slice(0, 8) + "…"}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-medium">
                      {formatUsd(token.stats?.marketCap ?? null)}
                    </div>
                    <div
                      className={`text-[12px] ${
                        (token.stats?.change24h ?? 0) < 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {formatPct(token.stats?.change24h ?? null)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-[#1c1f26] bg-[#101215] text-[#8b93a1] disabled:opacity-40 hover:border-[#3a3f4b] transition"
          >
            Prev
          </button>
          <span className="text-sm text-[#8b93a1]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm border border-[#1c1f26] bg-[#101215] text-[#8b93a1] disabled:opacity-40 hover:border-[#3a3f4b] transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}