import { notFound } from "next/navigation";
import CopyButton from "@/app/copy-button";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import StarRating from "@/app/components/StarRating";
import WatchlistStar from "@/app/components/WatchlistStar";
import ThesisShare from "@/app/components/ThesisShare";

export const revalidate = 20;

async function getTokenStats(address: string) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { next: { revalidate: 20 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    if (!pair) return null;

    return {
      name: pair.baseToken?.name || "Unknown",
      symbol: pair.baseToken?.symbol || "???",
      imageUrl: pair.info?.imageUrl || null,
      priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
      change24h: pair.priceChange?.h24 ?? null,
      volume24h: pair.volume?.h24 ?? null,
      liquidity: pair.liquidity?.usd ?? null,
      marketCap: pair.marketCap ?? pair.fdv ?? null,
      pairAddress: pair.pairAddress || null,
      dexChain: pair.chainId || null,
      websites: pair.info?.websites || [],
      socials: pair.info?.socials || [],
    };
  } catch {
    return null;
  }
}

async function getTokenFromDb(chain: string, address: string) {
  let { data } = await supabase
    .from("tokens")
    .select(`
      id,
      chain,
      address,
      name,
      symbol,
      image_url,
      status,
      submitted_by,
      thesis,
      profiles!submitted_by (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq("chain", chain.toLowerCase())
    .eq("address", address)
    .maybeSingle();

  if (!data) {
    const result = await supabase
      .from("tokens")
      .select(`
        id,
        chain,
        address,
        name,
        symbol,
        image_url,
        status,
        submitted_by,
        thesis,
        profiles!submitted_by (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq("address", address)
      .maybeSingle();

    data = result.data;
  }

  return data;
}

async function getTokenRatings(tokenId: string) {
  const { data } = await supabase
    .from("ratings")
    .select("stars")
    .eq("token_id", tokenId);

  if (!data || data.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = data.reduce((acc, r) => acc + r.stars, 0);
  const average = Number((sum / data.length).toFixed(1));

  return { average, count: data.length };
}

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

function renderThesis(text: string) {
  if (!text) return null;

  let html = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#b8ff3d] hover:underline">$1</a>'
  );

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white'>$1</strong>");

  const lines = html.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2.5">
          <span className="text-[#b8ff3d] mt-0.5 flex-shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: trimmed.slice(2) }} />
        </div>
      );
    } else {
      elements.push(
        <p key={i} dangerouslySetInnerHTML={{ __html: trimmed }} />
      );
    }
  });

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-[#c8cdd5]">
      {elements}
    </div>
  );
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ chain: string; address: string }>;
}) {
  const { chain, address } = await params;
  const stats = await getTokenStats(address);
  const dbToken = await getTokenFromDb(chain, address);

  if (!stats) {
    notFound();
  }

  const ratings = dbToken?.id
    ? await getTokenRatings(dbToken.id)
    : { average: 0, count: 0 };

  const chartChain = stats.dexChain || chain;
  const embedUrl = stats.pairAddress
    ? `https://dexscreener.com/${chartChain}/${stats.pairAddress}?embed=1&theme=dark&trades=0&info=0`
    : `https://dexscreener.com/${chartChain}/${address}?embed=1&theme=dark&trades=0&info=0`;

  const socialLinks: { type: string; url: string }[] = [];

  if (stats.websites?.length) {
    stats.websites.forEach((w: any) => {
      if (w.url) socialLinks.push({ type: "website", url: w.url });
    });
  }

  if (stats.socials?.length) {
    stats.socials.forEach((s: any) => {
      if (s.url)
        socialLinks.push({ type: s.type || s.platform || "social", url: s.url });
    });
  }

  const curator = Array.isArray(dbToken?.profiles)
    ? dbToken.profiles[0]
    : dbToken?.profiles;

  const thesis = dbToken?.thesis?.trim() || null;
  const imageUrl = stats.imageUrl || dbToken?.image_url || null;

  return (
    <div className="w-full px-4 sm:px-6">
      {/* Top section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
        
        {/* Left block: Logo + texts */}
        <div className="flex justify-center lg:justify-start">
          <div className="flex items-center gap-4">
            {/* Logo */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-[#1c1f26] flex-shrink-0" />
            )}

            {/* Texts - always left aligned */}
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold truncate">{stats.symbol}</h1>
                {dbToken?.id && <WatchlistStar tokenId={dbToken.id} />}
              </div>
              <p className="text-sm text-[#8b93a1] truncate">{stats.name}</p>

              {curator && curator.display_name && (
                <p className="text-sm text-[#8b93a1] mt-1">
                  Curated by{" "}
                  <Link
                    href={`/${curator.display_name}`}
                    className="text-[#b8ff3d] hover:underline"
                  >
                    {curator.display_name}
                  </Link>
                </p>
              )}

              {dbToken?.id && (
                <div className="mt-2">
                  <StarRating
                    tokenId={dbToken.id}
                    initialAverage={ratings.average}
                    initialCount={ratings.count}
                    userRating={null}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metrics cards */}
        <div className="flex flex-wrap gap-2 text-sm items-center justify-center lg:justify-end">
          <div className="rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 min-w-[100px]">
            <div className="text-[10px] text-[#8b93a1]">Price</div>
            <div className="font-medium">{formatUsd(stats.priceUsd)}</div>
          </div>

          <div className="rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 min-w-[100px]">
            <div className="text-[10px] text-[#8b93a1]">24h</div>
            <div
              className={`font-medium ${
                (stats.change24h ?? 0) < 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              {formatPct(stats.change24h)}
            </div>
          </div>

          <div className="rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 min-w-[100px]">
            <div className="text-[10px] text-[#8b93a1]">Volume</div>
            <div className="font-medium">{formatUsd(stats.volume24h)}</div>
          </div>

          <div className="rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 min-w-[100px]">
            <div className="text-[10px] text-[#8b93a1]">Liquidity</div>
            <div className="font-medium">{formatUsd(stats.liquidity)}</div>
          </div>

          <div className="rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 min-w-[100px]">
            <div className="text-[10px] text-[#8b93a1]">Mcap</div>
            <div className="font-medium">{formatUsd(stats.marketCap)}</div>
          </div>

          <div className="rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 min-w-[140px]">
            <div className="text-[10px] text-[#8b93a1]">Contract</div>
            <div className="font-medium flex items-center">
              {address.slice(0, 6)}…{address.slice(-4)}
              <CopyButton text={address} />
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2 ml-1">
              {socialLinks.map((link, i) => {
                const type = link.type.toLowerCase();
                let icon = null;

                if (type.includes("twitter") || type.includes("x")) {
                  icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  );
                } else if (type.includes("telegram")) {
                  icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.36-.49.99-.75 3.89-1.69 6.49-2.81 7.79-3.35 3.72-1.54 4.49-1.81 4.99-1.82.11 0 .35.03.51.14.13.09.17.21.19.3-.01.06.01.24 0 .38z" />
                    </svg>
                  );
                } else {
                  icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  );
                }

                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-[#1c1f26] bg-[#101215] text-[#8b93a1] hover:text-white hover:bg-[#1c1f26] transition"
                  >
                    {icon}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== PREMIUM THESIS CARD (still tighter) ===== */}
      {thesis && (
        <div className="mb-8">
          <div className="rounded-2xl border border-[#2a2e38] bg-[#0a0b0e] shadow-[0_0_0_1px_rgba(255,255,255,0.03)] py-5 px-5 sm:px-6 max-w-2xl mx-auto">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-[#b8ff3d]">
                The Thesis
              </h3>
            </div>

            <div>
              {renderThesis(thesis)}
            </div>

            <ThesisShare symbol={stats.symbol} thesis={thesis} />
          </div>
        </div>
      )}

      {/* Chart - full width */}
      <div className="relative rounded-xl border border-[#1c1f26] overflow-hidden mb-6">
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <a
            href="https://fomo.family/r/christoshi_"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-[#b8ff3d] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#a3e635] transition"
          >
            Trade on Fomo
          </a>
        </div>

        <div style={{ height: "520px" }}>
          <iframe src={embedUrl} className="w-full h-full" title="chart" />
        </div>
      </div>
    </div>
  );
}