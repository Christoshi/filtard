"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const CHAINS = [
  { id: "all", label: "All Chains" },
  { id: "solana", label: "Solana" },
  { id: "base", label: "Base" },
  { id: "ethereum", label: "Ethereum" },
  { id: "bsc", label: "BSC" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "robinhood", label: "Robinhood" },
];

export default function ChainSelector({
  currentChain,
  onlyNew,
}: {
  currentChain: string;
  onlyNew: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel =
    CHAINS.find((c) => c.id === currentChain)?.label || "All Chains";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function buildUrl(chainId: string) {
    const search = new URLSearchParams();
    if (chainId && chainId !== "all") search.set("chain", chainId);
    if (onlyNew) search.set("new", "true");
    const str = search.toString();
    return str ? `/?${str}` : "/";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1c1f26] bg-[#101215] text-sm hover:border-[#3a3f4b] transition"
      >
        <span className="text-[#f4f6f8] font-medium">{currentLabel}</span>
        <svg
          className={`w-4 h-4 text-[#8b93a1] transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-48 rounded-xl border border-[#1c1f26] bg-[#101215] shadow-xl overflow-hidden z-50">
          {CHAINS.map((c) => (
            <Link
              key={c.id}
              href={buildUrl(c.id)}
              onClick={() => setOpen(false)}
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
      )}
    </div>
  );
}