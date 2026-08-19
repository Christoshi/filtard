"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  function goHome() {
    // Instant feedback first
    window.dispatchEvent(new Event("filtard-close-all"));
    window.scrollTo({ top: 0, behavior: "instant" });

    if (pathname !== "/") {
      router.push("/");
    }
  }

  function toggleSearch() {
    if (pathname !== "/") {
      // Go home first, then open search after navigation
      router.push("/");
      // Small delay so TokenTable has mounted
      setTimeout(() => {
        window.dispatchEvent(new Event("filtard-toggle-search"));
      }, 150);
    } else {
      window.dispatchEvent(new Event("filtard-toggle-search"));
    }
  }

  function toggleWatchlist() {
    if (pathname !== "/") {
      router.push("/");
      setTimeout(() => {
        window.dispatchEvent(new Event("filtard-toggle-watchlist"));
      }, 150);
    } else {
      window.dispatchEvent(new Event("filtard-toggle-watchlist"));
    }
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-1">
        {/* Home / Logo – instant */}
        <button
          onClick={goHome}
          className="flex flex-col items-center justify-center gap-0.5 text-[#8b93a1] hover:text-white transition active:scale-95 w-16"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#b8ff3d] text-xs font-bold text-black">
            F
          </span>
          <span className="text-[10px] font-medium leading-tight">Filtard</span>
        </button>

        {/* Search */}
        <button
          onClick={toggleSearch}
          className="flex flex-col items-center justify-center gap-0.5 text-[#8b93a1] hover:text-white transition active:scale-95 w-16"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">Search</span>
        </button>

        {/* Watchlist */}
        <button
          onClick={toggleWatchlist}
          className="flex flex-col items-center justify-center gap-0.5 text-[#8b93a1] hover:text-white transition active:scale-95 w-16"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">Watchlist</span>
        </button>

        {/* Submit */}
        <Link
          href="/login"
          className="flex flex-col items-center justify-center gap-0.5 text-[#8b93a1] hover:text-white transition active:scale-95 w-16"
          prefetch={true}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">Submit</span>
        </Link>
      </div>
    </nav>
  );
}