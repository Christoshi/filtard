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

  if (loading) {
    return <div className="w-9 h-9" />;
  }

  if (user) {
    const initial = (user.display_name || "U")[0].toUpperCase();

    return (
      <div className="relative flex-shrink-0 ml-2" ref={dropdownRef}>
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
    );
  }

  // Not logged in → only show the green Submit button
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      <Link
        href="/login"
        className="text-sm bg-[#b8ff3d] text-black px-3 py-1.5 rounded-md font-medium hover:bg-[#a3e635] transition"
      >
        Submit
      </Link>
    </div>
  );
}