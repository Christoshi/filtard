"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getCurrentUser, signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function HeaderAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();

      if (currentUser && !currentUser.display_name) {
        if (window.location.pathname !== "/setup-username") {
          router.push("/setup-username");
        }
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await signOut();
    setUser(null);
    setOpen(false);
    router.refresh();
  }

  // Premium trophy icon
  const TrophyIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M17 4h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1" />
      <path d="M7 4H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1" />
    </svg>
  );

  if (loading) {
    return <div className="w-9 h-9" />;
  }

  if (user) {
    const initial = (user.display_name || "U")[0].toUpperCase();

    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Trophy → Leaderboard */}
        <Link
          href="/leaderboard"
          className="flex items-center justify-center h-9 w-9 rounded-full text-[#b8ff3d] hover:bg-[#b8ff3d]/10 transition"
          title="Leaderboard"
        >
          {TrophyIcon}
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center h-9 w-9 rounded-full overflow-hidden bg-[#1c1f26] hover:ring-2 hover:ring-[#b8ff3d]/40 transition"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium">{initial}</span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#1c1f26] bg-[#101215] shadow-xl overflow-hidden z-50">
              <div className="py-1.5">
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                >
                  Submit Token
                </Link>
                <Link
                  href="/submissions"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                >
                  My Submissions
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#f4f6f8] hover:bg-[#1c1f26] transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not logged in
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      {/* Trophy → Leaderboard */}
      <Link
        href="/leaderboard"
        className="flex items-center justify-center h-9 w-9 rounded-full text-[#b8ff3d] hover:bg-[#b8ff3d]/10 transition"
        title="Leaderboard"
      >
        {TrophyIcon}
      </Link>

      <Link
        href="/login"
        className="text-sm bg-[#b8ff3d] text-black px-3.5 py-1.5 rounded-md font-medium hover:bg-[#a3e635] transition"
      >
        Submit
      </Link>
    </div>
  );
}