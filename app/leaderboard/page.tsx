import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 60;

type CuratorScore = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  tokens: number;
  multiplier: number;
  points: number;
};

async function getCurrentMcap(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const pair = data?.pairs?.[0];
    return pair?.marketCap ?? pair?.fdv ?? null;
  } catch {
    return null;
  }
}

async function getLeaderboard(): Promise<CuratorScore[]> {
  const { data: tokens } = await supabase
    .from("tokens")
    .select("id, address, submitted_by, initial_mcap")
    .eq("status", "approved")
    .not("submitted_by", "is", null);

  if (!tokens || tokens.length === 0) return [];

  const byCurator: Record<
    string,
    { address: string; initial_mcap: number | null }[]
  > = {};

  tokens.forEach((t) => {
    if (!t.submitted_by) return;
    if (!byCurator[t.submitted_by]) byCurator[t.submitted_by] = [];
    byCurator[t.submitted_by].push({
      address: t.address,
      initial_mcap: t.initial_mcap,
    });
  });

  const curatorIds = Object.keys(byCurator);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, twitter_url, telegram_url")
    .in("id", curatorIds);

  if (!profiles) return [];

  const scores: CuratorScore[] = [];

  for (const profile of profiles) {
    const curatorTokens = byCurator[profile.id] || [];
    const tokenCount = curatorTokens.length;
    if (tokenCount === 0) continue;

    const currentMcaps = await Promise.all(
      curatorTokens.map((t) => getCurrentMcap(t.address))
    );

    const multipliers = curatorTokens.map((t, i) => {
      const current = currentMcaps[i];
      const initial = t.initial_mcap;
      if (!current || !initial || initial <= 0) return 1;
      const raw = current / initial;
      return Math.min(10, Math.max(1, raw));
    });

    const avgMultiplier =
      multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;

    const points = tokenCount * 10 * avgMultiplier;

    scores.push({
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      twitter_url: profile.twitter_url,
      telegram_url: profile.telegram_url,
      tokens: tokenCount,
      multiplier: Number(avgMultiplier.toFixed(2)),
      points: Math.round(points),
    });
  }

  return scores.sort((a, b) => b.points - a.points);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300/20 text-gray-300 text-xs font-bold">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 text-xs font-bold">
        3
      </span>
    );
  }
  return <span className="text-[#8b93a1] text-sm tabular-nums w-6 text-center">{rank}</span>;
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
          Curator Leaderboard
        </h1>
        <p className="text-sm text-[#8b93a1] mt-1.5">
          Earn FTD points based on the number of tokens submitted and their performance
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="border border-[#1c1f26] rounded-2xl p-16 text-center text-[#8b93a1]">
          No curators yet
        </div>
      ) : (
        <>
          <div className="border border-[#1c1f26] rounded-2xl overflow-x-auto">
            <div className="min-w-[520px]">
              {/* Header */}
              <div className="grid grid-cols-[40px_minmax(140px,2fr)_60px_80px_60px_70px] md:grid-cols-[48px_minmax(180px,2.2fr)_70px_90px_90px_90px] gap-2 md:gap-3 px-4 md:px-5 py-3 bg-[#0c0d10] border-b border-[#1c1f26] text-xs text-[#8b93a1] tracking-wide">
                <div className="text-center">Rank</div>
                <div>Curator</div>
                <div className="text-center">Tokens</div>
                <div className="text-center">Points</div>
                <div className="text-center">
                  <span className="md:hidden">X</span>
                  <span className="hidden md:inline">Multiplier</span>
                </div>
                <div className="text-right">Socials</div>
              </div>

              {leaderboard.map((curator, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;

                return (
                  <div
                    key={curator.id}
                    className={`grid grid-cols-[40px_minmax(140px,2fr)_60px_80px_60px_70px] md:grid-cols-[48px_minmax(180px,2.2fr)_70px_90px_90px_90px] gap-2 md:gap-3 items-center px-4 md:px-5 py-3.5 border-b border-[#1c1f26] last:border-0 hover:bg-[#14171d] transition ${
                      isTop3 ? "bg-[#b8ff3d]/[0.03]" : ""
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex justify-center">
                      <RankBadge rank={rank} />
                    </div>

                    {/* Curator */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {curator.avatar_url ? (
                        <img
                          src={curator.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0 ring-1 ring-[#1c1f26]"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[#1c1f26] flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {(curator.display_name || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <Link
                        href={`/${curator.display_name}`}
                        className="font-medium text-sm hover:text-[#b8ff3d] transition truncate"
                      >
                        {curator.display_name || "Anonymous"}
                      </Link>
                    </div>

                    {/* Tokens */}
                    <div className="text-center text-sm font-medium tabular-nums">
                      {curator.tokens}
                    </div>

                    {/* Points */}
                    <div className="text-center text-sm font-semibold text-[#b8ff3d] tabular-nums">
                      {curator.points.toLocaleString()}
                    </div>

                    {/* Multiplier / X */}
                    <div className="text-center text-sm text-[#8b93a1] tabular-nums">
                      {curator.multiplier.toFixed(1)}×
                    </div>

                    {/* Socials */}
                    <div className="flex items-center justify-end gap-1">
                      {curator.twitter_url && (
                        <a
                          href={curator.twitter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-[#8b93a1] hover:text-white hover:bg-[#1c1f26] transition"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      )}
                      {curator.telegram_url && (
                        <a
                          href={curator.telegram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-[#8b93a1] hover:text-white hover:bg-[#1c1f26] transition"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.36-.49.99-.75 3.89-1.69 6.49-2.81 7.79-3.35 3.72-1.54 4.49-1.81 4.99-1.82.11 0 .35.03.51.14.13.09.17.21.19.3-.01.06.01.24 0 .38z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formula */}
          <div className="mt-5 px-1">
            <p className="text-sm text-[#f4f6f8]">
              * Formula: Points = Tokens × 10 × Multiplier
            </p>
            <p className="mt-1 text-xs text-[#8b93a1] leading-relaxed max-w-2xl">
              Multiplier is the average performance of a curator’s approved tokens
              (current market cap ÷ market cap at approval), with a maximum of 10x.
            </p>
          </div>
        </>
      )}
    </div>
  );
}