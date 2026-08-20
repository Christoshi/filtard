"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, supabase } from "@/lib/auth";
import Link from "next/link";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [chain, setChain] = useState("solana");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      setLoadingUser(false);
    }
    checkUser();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let symbol: string | null = null;

    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address.trim()}`
      );
      const data = await res.json();
      const pair = data?.pairs?.[0];

      const name = pair?.baseToken?.name || null;
      symbol = pair?.baseToken?.symbol || null;
      const image_url = pair?.info?.imageUrl || null;

      // Decide status based on role
      const isAdmin = user.role === "admin" || user.role === "super_admin";
      const status = isAdmin ? "approved" : "pending";

      const { error } = await supabase.from("tokens").insert({
        chain: chain.toLowerCase(),
        address: address.trim(),
        name,
        symbol,
        image_url,
        status,
        submitted_by: user.id,
      });

      if (error) {
        const isDuplicate =
          error.code === "23505" ||
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.includes("tokens_chain_address_key");

        if (isDuplicate) {
          setMessage(`${symbol || "Token"} already added`);
        } else {
          setMessage("Error: " + error.message);
        }
      } else {
        if (isAdmin) {
          setMessage(`Successfully added ${symbol || "token"}!`);
        } else {
          setMessage(`${symbol || "Token"} submitted for approval!`);
        }
        setAddress("");
      }
    } catch (err) {
      setMessage("Error fetching token data");
    }

    setLoading(false);
  }

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-[#8b93a1]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Submit a token to curate
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8b93a1] mb-1">Chain</label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2"
            >
              <option value="solana">Solana</option>
              <option value="base">Base</option>
              <option value="ethereum">Ethereum</option>
              <option value="bsc">BSC</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="robinhood">Robinhood</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#8b93a1] mb-1">
              Contract Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Paste contract address"
              className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#b8ff3d] py-2.5 font-medium text-black hover:bg-[#a3e635] disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Token"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm text-center ${
              message.includes("already added") || message.startsWith("Error")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {message}
          </p>
        )}

        {(user.role === "admin" || user.role === "super_admin") && (
          <div className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-[#b8ff3d] hover:underline"
            >
              Go to Admin Dashboard →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}