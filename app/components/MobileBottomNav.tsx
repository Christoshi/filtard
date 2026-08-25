"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"search" | "watchlist" | null>(
    null
  );

  const isHome = pathname === "/";
  const isLeaderboard = pathname === "/leaderboard";
  const isSubmit =
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname === "/submissions" ||
    pathname === "/profile";

  useEffect(() => {
    async function load() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    }
    load();
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    function handleClose() {
      setActivePanel(null);
    }
    window.addEventListener("filtard-close-all", handleClose);
    return () => window.removeEventListener("filtard-close-all", handleClose);
  }, []);

  useEffect(() => {
    if (!isHome) {
      setActivePanel(null);
    }
  }, [isHome]);

  function goHome(e: React.MouseEvent) {
    window.dispatchEvent(new Event("filtard-close-all"));
    window.scrollTo({ top: 0, behavior: "instant" });
    if (isHome) e.preventDefault();
  }

  function openSearch() {
    setActivePanel("search");
    if (!isHome) {
      router.push("/");
      setTimeout(() => {
        window.dispatchEvent(new Event("filtard-toggle-search"));
      }, 50);
    } else {
      window.dispatchEvent(new Event("filtard-toggle-search"));
    }
  }

  function openWatchlist() {
    setActivePanel("watchlist");
    if (!isHome) {
      router.push("/");
      setTimeout(() => {
        window.dispatchEvent(new Event("filtard-toggle-watchlist"));
      }, 50);
    } else {
      window.dispatchEvent(new Event("filtard-toggle-watchlist"));
    }
  }

  async function handleLogout() {
    await signOut();
    setUser(null);
    setMenuOpen(false);
    router.refresh();
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1c1f26] bg-[#07080a]/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-1 relative">
        {/* Home */}
        <Link
          href="/"
          onClick={goHome}
          prefetch={true}
          className="flex flex-col items-center justify-center gap-0.5 text-[#8b93a1] hover:text-white transition active:scale-95 w-[18%]"
        >
          <img
            src="/logo.png"
            alt="Filtard"
            className="h-7 w-7 rounded-md object-contain"
          />
          <span className="text-[10px] font-medium leading-tight">Filtard</span>
        </Link>

        {/* Search */}
        <button
          onClick={openSearch}
          className={`flex flex-col items-center justify-center gap-0.5 transition active:scale-95 w-[18%] ${
            activePanel === "search"
              ? "text-[#b8ff3d]"
              : "text-[#8b93a1] hover:text-[#b8ff3d]"
          }`}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">Search</span>
        </button>

        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          className={`flex flex-col items-center justify-center gap-0.5 transition active:scale-95 w-[18%] ${
            isLeaderboard
              ? "text-[#b8ff3d]"
              : "text-[#8b93a1] hover:text-[#b8ff3d]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">
            Leaderboard
          </span>
        </Link>

        {/* Watchlist */}
        <button
          onClick={openWatchlist}
          className={`flex flex-col items-center justify-center gap-0.5 transition active:scale-95 w-[18%] ${
            activePanel === "watchlist"
              ? "text-[#b8ff3d]"
              : "text-[#8b93a1] hover:text-[#b8ff3d]"
          }`}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">
            Watchlist
          </span>
        </button>

        {/* Profile / Submit */}
        <div className="relative w-[18%] flex justify-center" ref={menuRef}>
          {user ? (
            <>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                  menuOpen || pathname === "/profile"
                    ? "text-[#b8ff3d]"
                    : "text-[#8b93a1] hover:text-[#b8ff3d]"
                }`}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover border border-[#1c1f26]"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-[#1c1f26] flex items-center justify-center text-[11px] font-medium text-white">
                    {(user.display_name || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[10px] font-medium leading-tight">
                  Profile
                </span>
              </button>

              {menuOpen && (
                <div className="absolute bottom-14 right-0 w-48 rounded-xl border border-[#1c1f26] bg-[#101215] shadow-xl overflow-hidden z-50">
                  <div className="py-1.5">
                    {(user.role === "admin" || user.role === "super_admin") && (
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#b8ff3d] hover:bg-[#1c1f26] transition"
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                    >
                      Submit Token
                    </Link>
                    <Link
                      href="/submissions"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                    >
                      My Submissions
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                    >
                      Edit Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[#1c1f26] transition"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              prefetch={true}
              className={`flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                isSubmit
                  ? "text-[#b8ff3d]"
                  : "text-[#8b93a1] hover:text-[#b8ff3d]"
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[10px] font-medium leading-tight">
                Submit
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}