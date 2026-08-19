"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, supabase } from "@/lib/auth";

export default function SetupUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const user = await getCurrentUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Already has a username → go home
      if (user.display_name) {
        router.push("/");
        return;
      }

      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const clean = username.trim().toLowerCase();

    if (clean.length < 3) {
      setError("Username must be at least 3 characters");
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      setError("Only letters, numbers and underscores allowed");
      setLoading(false);
      return;
    }

    // Check if username is already taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", clean)
      .maybeSingle();

    if (existing) {
      setError("This username is already taken");
      setLoading(false);
      return;
    }

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Save the username
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: clean })
      .eq("id", user.id);

    if (updateError) {
      console.error(updateError);
      setError("Could not save username. Please try again.");
      setLoading(false);
      return;
    }

    // Force a full page reload so everything picks up the new username
    window.location.href = "/";
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-[#8b93a1]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Choose a username</h1>
          <p className="text-sm text-[#8b93a1] mt-2">
            This will be shown publicly when you curate tokens
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8b93a1] mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. satoshi"
              className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2.5 focus:outline-none focus:border-[#b8ff3d]"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#b8ff3d] py-2.5 font-medium text-black hover:bg-[#a3e635] disabled:opacity-50 transition"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}