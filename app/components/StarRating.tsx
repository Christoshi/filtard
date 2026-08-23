"use client";

import { useState } from "react";
import { getCurrentUser, supabase } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Props = {
  tokenId: string;
  initialAverage: number;
  initialCount: number;
  userRating: number | null;
};

export default function StarRating({
  tokenId,
  initialAverage,
  initialCount,
  userRating,
}: Props) {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [myRating, setMyRating] = useState<number | null>(userRating);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRate(value: number) {
    const user = await getCurrentUser();
    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    setLoading(true);

    if (myRating) {
      const { error } = await supabase
        .from("ratings")
        .update({ stars: value })
        .eq("token_id", tokenId)
        .eq("user_id", user.id);

      if (!error) {
        setMyRating(value);
        const newAverage = (average * count - myRating + value) / count;
        setAverage(Number(newAverage.toFixed(1)));
      }
    } else {
      const { error } = await supabase.from("ratings").insert({
        token_id: tokenId,
        user_id: user.id,
        stars: value,
      });

      if (!error) {
        setMyRating(value);
        const newCount = count + 1;
        const newAverage = (average * count + value) / newCount;
        setAverage(Number(newAverage.toFixed(1)));
        setCount(newCount);
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Always show the number (0 when no ratings) */}
      <span className="text-sm font-medium text-white">
        {count > 0 ? average : 0}
      </span>

      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={loading}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-lg leading-none transition disabled:opacity-50"
          >
            <span
              className={
                star <= (hover || myRating || 0)
                  ? "text-[#b8ff3d]"
                  : "text-[#3a3f4b]"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}