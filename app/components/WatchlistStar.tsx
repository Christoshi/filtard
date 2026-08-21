"use client";

import { useState, useEffect } from "react";

export default function WatchlistStar({ tokenId }: { tokenId: string }) {
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("filtard-watchlist");
    if (saved) {
      try {
        const list: string[] = JSON.parse(saved);
        setIsWatched(list.includes(tokenId));
      } catch {}
    }
  }, [tokenId]);

  function toggle() {
    const saved = localStorage.getItem("filtard-watchlist");
    let list: string[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch {}
    }

    if (list.includes(tokenId)) {
      list = list.filter((id) => id !== tokenId);
      setIsWatched(false);
    } else {
      list.push(tokenId);
      setIsWatched(true);
    }

    localStorage.setItem("filtard-watchlist", JSON.stringify(list));
  }

  return (
    <button
      onClick={toggle}
      className={`text-xl leading-none transition ${
        isWatched ? "text-[#b8ff3d]" : "text-[#3a3f4b] hover:text-[#8b93a1]"
      }`}
      title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
    >
      {isWatched ? "★" : "☆"}
    </button>
  );
}