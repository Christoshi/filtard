"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, supabase } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Props = {
  tokenId: string;
  initialAverage: number;
  initialCount: number;
  userRating?: number | null;
};

export default function StarRating({
  tokenId,
  initialAverage,
  initialCount,
  userRating = null,
}: Props) {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [myRating, setMyRating] = useState<number | null>(userRating);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Load this user's rating so stars stay correct after refresh
  useEffect(() => {
    let cancelled = false;

    async function loadMine() {
      try {
        const user = await getCurrentUser();
        if (!user || cancelled) {
          if (!cancelled) setBooting(false);
          return;
        }

        const { data } = await supabase
          .from("ratings")
          .select("stars")
          .eq("token_id", tokenId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled && data?.stars != null) {
          setMyRating(Number(data.stars));
        }
      } catch {
        // ignore — still allow rating
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    loadMine();
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  async function handleRate(value: number) {
    if (loading || booting) return;
    setError("");

    const user = await getCurrentUser();
    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Snapshot for rollback
    const prevAverage = average;
    const prevCount = count;
    const prevMine = myRating;

    // Optimistic UI
    if (prevMine != null) {
      const nextAvg =
        prevCount > 0
          ? (prevAverage * prevCount - prevMine + value) / prevCount
          : value;
      setMyRating(value);
      setAverage(Number(nextAvg.toFixed(1)));
    } else {
      const nextCount = prevCount + 1;
      const nextAvg = (prevAverage * prevCount + value) / nextCount;
      setMyRating(value);
      setCount(nextCount);
      setAverage(Number(nextAvg.toFixed(1)));
    }

    setLoading(true);

    try {
      const { data: existing, error: readError } = await supabase
        .from("ratings")
        .select("id, stars")
        .eq("token_id", tokenId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (readError) throw readError;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("ratings")
          .update({ stars: value })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("ratings").insert({
          token_id: tokenId,
          user_id: user.id,
          stars: value,
        });

        if (insertError) {
          // Race: row created elsewhere — update instead
          const { error: retryError } = await supabase
            .from("ratings")
            .update({ stars: value })
            .eq("token_id", tokenId)
            .eq("user_id", user.id);

          if (retryError) throw insertError;
        }
      }

      // Refresh true average from DB (other users may have rated too)
      const { data: all } = await supabase
        .from("ratings")
        .select("stars")
        .eq("token_id", tokenId);

      if (all && all.length > 0) {
        const sum = all.reduce((acc, r) => acc + Number(r.stars), 0);
        setCount(all.length);
        setAverage(Number((sum / all.length).toFixed(1)));
      }
    } catch {
      setMyRating(prevMine);
      setAverage(prevAverage);
      setCount(prevCount);
      setError("Couldn’t save rating. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const shown = hover || myRating || 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white tabular-nums">
          {count > 0 ? average : 0}
        </span>

        <div
          className="flex items-center gap-0.5"
          role="group"
          aria-label="Rate this token"
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= shown;
            return (
              <button
                key={star}
                type="button"
                disabled={loading || booting}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${star} star${star === 1 ? "" : "s"}`}
                aria-pressed={myRating === star}
                className="text-lg leading-none transition active:scale-90 disabled:opacity-50 disabled:pointer-events-none"
              >
                <span
                  className={
                    active
                      ? "text-[#b8ff3d]"
                      : "text-[#3a3f4b] hover:text-[#5c6573]"
                  }
                >
                  ★
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-[#8b93a1]">
          {count > 0
            ? `${count} rating${count === 1 ? "" : "s"}`
            : "No ratings yet"}
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}