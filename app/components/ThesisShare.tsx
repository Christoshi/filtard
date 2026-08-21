"use client";

import { useState } from "react";

export default function ThesisShare({
  symbol,
  thesis,
}: {
  symbol: string;
  thesis: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `$${symbol} thesis by @filtard\n${typeof window !== "undefined" ? window.location.href : ""}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy");
    }
  }

  function handleShareX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-5 pt-4 border-t border-[#1c1f26] flex items-center gap-3">
      <button
        onClick={handleCopy}
        className="text-xs text-[#a0a8b4] hover:text-white border border-[#2a2e38] hover:border-[#3a3f4b] bg-[#101215] rounded-lg px-3.5 py-1.5 transition"
      >
        {copied ? "Copied!" : "Copy Thesis"}
      </button>

      <button
        onClick={handleShareX}
        className="text-xs text-[#a0a8b4] hover:text-white border border-[#2a2e38] hover:border-[#3a3f4b] bg-[#101215] rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share to X
      </button>
    </div>
  );
}