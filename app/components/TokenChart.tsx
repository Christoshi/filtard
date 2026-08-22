"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";

type Props = {
  chain: string;
  pairAddress: string | null;
  tokenAddress: string;
  symbol: string;
};

const TIMEFRAMES = [
  { id: "5m", label: "5m", gt: { timeframe: "minute", aggregate: 5 } },
  { id: "15m", label: "15m", gt: { timeframe: "minute", aggregate: 15 } },
  { id: "1h", label: "1H", gt: { timeframe: "hour", aggregate: 1 } },
  { id: "4h", label: "4H", gt: { timeframe: "hour", aggregate: 4 } },
  { id: "1d", label: "1D", gt: { timeframe: "day", aggregate: 1 } },
] as const;

// Map our chain names → GeckoTerminal network ids
const CHAIN_MAP: Record<string, string> = {
  solana: "solana",
  ethereum: "eth",
  base: "base",
  bsc: "bsc",
  arbitrum: "arbitrum",
  polygon: "polygon_pos",
  avalanche: "avax",
  optimism: "optimism",
  robinhood: "eth", // fallback
};

export default function TokenChart({
  chain,
  pairAddress,
  tokenAddress,
  symbol,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]["id"]>("15m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0b0e" },
        textColor: "#8b93a1",
      },
      grid: {
        vertLines: { color: "#1c1f26" },
        horzLines: { color: "#1c1f26" },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: "#1c1f26",
      },
      timeScale: {
        borderColor: "#1c1f26",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Fetch + update data
  useEffect(() => {
    if (!pairAddress || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    let cancelled = false;
    const network = CHAIN_MAP[chain.toLowerCase()] || chain.toLowerCase();
    const tf = TIMEFRAMES.find((t) => t.id === timeframe)!;

    async function loadCandles() {
      setLoading(true);
      setError(null);

      try {
        const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pairAddress}/ohlcv/${tf.gt.timeframe}?aggregate=${tf.gt.aggregate}&limit=300&currency=usd`;

        const res = await fetch(url, {
          headers: { Accept: "application/json;version=20230203" },
        });

        if (!res.ok) throw new Error("Failed to load chart data");

        const json = await res.json();
        const list: [number, number, number, number, number, number][] =
          json?.data?.attributes?.ohlcv_list || [];

        if (list.length === 0) {
          setError("No chart data available for this pair");
          setLoading(false);
          return;
        }

        // Gecko returns newest first → reverse for Lightweight Charts
        const candles: CandlestickData[] = [];
        const volumes: HistogramData[] = [];

        for (let i = list.length - 1; i >= 0; i--) {
          const [ts, open, high, low, close, volume] = list[i];
          const time = ts as UTCTimestamp;

          candles.push({
            time,
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close),
          });

          volumes.push({
            time,
            value: Number(volume),
            color:
              Number(close) >= Number(open)
                ? "rgba(34, 197, 94, 0.4)"
                : "rgba(239, 68, 68, 0.4)",
          });
        }

        if (cancelled) return;

        candleSeriesRef.current?.setData(candles);
        volumeSeriesRef.current?.setData(volumes);
        chartRef.current?.timeScale().fitContent();
      } catch (e) {
        if (!cancelled) {
          setError("Chart temporarily unavailable");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCandles();

    // Near-real-time polling
    const interval = setInterval(loadCandles, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chain, pairAddress, timeframe]);

  return (
    <div className="rounded-xl border border-[#1c1f26] bg-[#0a0b0e] overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1f26]">
        <div className="text-sm font-medium text-[#f4f6f8]">
          {symbol} Chart
        </div>

        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                timeframe === tf.id
                  ? "bg-[#b8ff3d]/15 text-[#b8ff3d]"
                  : "text-[#8b93a1] hover:text-white hover:bg-[#1c1f26]"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0b0e]/70">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b8ff3d] border-t-transparent" />
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-[#8b93a1]">
            {error}
          </div>
        )}

        <div ref={containerRef} className="w-full" style={{ height: 420 }} />
      </div>
    </div>
  );
}