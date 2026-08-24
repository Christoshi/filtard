"use client";

import { useEffect, useState } from "react";

type Props = {
  embedUrl: string;
  height?: number;
};

const LOAD_TIMEOUT_MS = 12000;

export default function DexChartEmbed({ embedUrl, height = 520 }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [key, setKey] = useState(0); // forces iframe remount on retry

  useEffect(() => {
    setStatus("loading");

    const timer = setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "error" : prev));
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [embedUrl, key]);

  function handleLoad() {
    setStatus("ready");
  }

  function handleRetry() {
    setKey((k) => k + 1);
  }

  return (
    <div
      className="relative rounded-xl border border-[#1c1f26] overflow-hidden mb-6 bg-[#0a0b0e]"
      style={{ height }}
    >
      {/* Loading */}
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0b0e]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#b8ff3d] border-t-transparent" />
          <p className="text-xs text-[#8b93a1]">Loading chart…</p>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0b0e] px-4">
          <p className="text-sm text-[#8b93a1] text-center">
            Chart temporarily unavailable
          </p>
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#1c1f26] text-[#f4f6f8] hover:bg-[#252830] transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Iframe — always mounted so onLoad can fire; hidden until ready */}
      <iframe
        key={key}
        src={embedUrl}
        title="chart"
        className={`w-full h-full border-0 transition-opacity duration-300 ${
          status === "ready" ? "opacity-100" : "opacity-0"
        }`}
        onLoad={handleLoad}
        allow="clipboard-write"
      />
    </div>
  );
}