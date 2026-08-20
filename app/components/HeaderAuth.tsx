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

  // Proper filled trophy cup
  const TrophyIcon = (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935"/>
    </svg>
  );

  if (loading) {
    return <div className="w-9 h-9" />;
  }

  if (user) {
    const initial = (user.display_name || "U")[0].toUpperCase();

    return (
      <div className="flex items-center gap-2 flex-shrink-0">
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