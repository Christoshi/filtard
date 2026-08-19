"use client";

import Link from "next/link";

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16">
        {/* Home */}
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#b8ff3d] text-sm font-bold text-black">
            F
          </span>
        </Link>

        {/* Search */}
        <button
          onClick={() => window.dispatchEvent(new Event("filtard-toggle-search"))}
          className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[10px]">Search</span>
        </button>

        {/* Watchlist */}
        <button
          onClick={() => window.dispatchEvent(new Event("filtard-toggle-watchlist"))}
          className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-[10px]">Watchlist</span>
        </button>

        {/* Submit */}
        <Link
          href="/login"
          className="flex flex-col items-center gap-1 text-[#8b93a1] hover:text-white transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[10px]">Submit</span>
        </Link>
      </div>
    </nav>
  );
}