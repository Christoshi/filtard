"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/auth";

type Token = {
  id: string;
  chain: string;
  address: string;
  name: string | null;
  symbol: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

export default function SubmissionsPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("tokens")
        .select("id, chain, address, name, symbol, image_url, status, created_at")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTokens(data);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-[#8b93a1]">Loading your submissions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">My Submissions</h1>
      <p className="text-sm text-[#8b93a1] mb-8">
        Track the status of tokens you have submitted
      </p>

      {tokens.length === 0 ? (
        <div className="border border-[#1c1f26] rounded-xl p-12 text-center text-[#8b93a1]">
          You haven’t submitted any tokens yet.
          <div className="mt-4">
            <Link
              href="/admin"
              className="text-[#b8ff3d] hover:underline"
            >
              Submit your first token →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <Link
              key={token.id}
              href={`/${token.chain}/${token.address}`}
              className="flex items-center gap-4 border border-[#1c1f26] rounded-xl p-4 bg-[#101215] hover:bg-[#14171d] transition"
            >
              {token.image_url ? (
                <img
                  src={token.image_url}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-[#1c1f26] flex-shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{token.symbol || "???"}</span>
                  <span className="text-xs text-[#8b93a1] border border-[#1c1f26] px-1.5 rounded">
                    {token.chain}
                  </span>
                </div>
                <div className="text-sm text-[#8b93a1] truncate">
                  {token.name || token.address}
                </div>
              </div>

              <div className="flex-shrink-0">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    token.status === "approved"
                      ? "bg-green-500/15 text-green-400"
                      : token.status === "pending"
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}