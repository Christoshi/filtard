"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, supabase } from "@/lib/auth";
import Link from "next/link";

type Token = {
  id: string;
  chain: string;
  address: string;
  name: string | null;
  symbol: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  submitted_by: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
        router.push("/admin");
        return;
      }

      setUser(currentUser);
      await loadTokens();
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadTokens() {
    const { data, error } = await supabase
      .from("tokens")
      .select(`
        id,
        chain,
        address,
        name,
        symbol,
        image_url,
        status,
        created_at,
        submitted_by,
        profiles!submitted_by (
          id,
          display_name
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTokens(data as any);
    }
  }

  async function approveToken(id: string) {
    const { error } = await supabase
      .from("tokens")
      .update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage("Error approving token");
    } else {
      setMessage("Token approved");
      setSelected((prev) => prev.filter((x) => x !== id));
      await loadTokens();
    }
  }

  async function deleteToken(id: string) {
    if (!confirm("Are you sure you want to delete this token?")) return;

    const { error } = await supabase.from("tokens").delete().eq("id", id);

    if (error) {
      setMessage("Error deleting token");
    } else {
      setMessage("Token deleted");
      setSelected((prev) => prev.filter((x) => x !== id));
      await loadTokens();
    }
  }

  async function bulkApprove() {
    if (selected.length === 0) return;
    if (!confirm(`Approve ${selected.length} tokens?`)) return;

    const { error } = await supabase
      .from("tokens")
      .update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .in("id", selected);

    if (error) {
      setMessage("Error bulk approving");
    } else {
      setMessage(`${selected.length} tokens approved`);
      setSelected([]);
      await loadTokens();
    }
  }

  async function bulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} tokens permanently?`)) return;

    const { error } = await supabase
      .from("tokens")
      .delete()
      .in("id", selected);

    if (error) {
      setMessage("Error bulk deleting");
    } else {
      setMessage(`${selected.length} tokens deleted`);
      setSelected([]);
      await loadTokens();
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selected.length === filteredTokens.length) {
      setSelected([]);
    } else {
      setSelected(filteredTokens.map((t) => t.id));
    }
  }

  const filteredTokens = tokens.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (!search.trim()) return true;

    const q = search.toLowerCase();
    return (
      t.symbol?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q) ||
      t.profiles?.display_name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-[#8b93a1]">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-[#8b93a1] mt-1">
            Manage submitted tokens
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[#b8ff3d] hover:underline"
        >
          Submit Token →
        </Link>
      </div>

      {message && (
        <div className="mb-4 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
          {message}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, symbol, address or curator..."
          className="flex-1 rounded-lg border border-[#1c1f26] bg-[#101215] px-3.5 py-2 text-sm placeholder:text-[#5c6573] focus:outline-none focus:border-[#3a3f4b]"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              filter === "all"
                ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
                : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b]"
            }`}
          >
            All ({tokens.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              filter === "pending"
                ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
                : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b]"
            }`}
          >
            Pending ({tokens.filter((t) => t.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              filter === "approved"
                ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
                : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b]"
            }`}
          >
            Approved ({tokens.filter((t) => t.status === "approved").length})
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-[#101215] border border-[#1c1f26]">
          <span className="text-sm text-[#8b93a1]">
            {selected.length} selected
          </span>
          <button
            onClick={bulkApprove}
            className="px-3 py-1.5 rounded-lg bg-[#b8ff3d] text-black text-sm font-medium hover:bg-[#a3e635]"
          >
            Approve Selected
          </button>
          <button
            onClick={bulkDelete}
            className="px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10"
          >
            Delete Selected
          </button>
          <button
            onClick={() => setSelected([])}
            className="text-sm text-[#8b93a1] hover:text-white ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {filteredTokens.length === 0 ? (
        <div className="border border-[#1c1f26] rounded-xl p-12 text-center text-[#8b93a1]">
          No tokens found
        </div>
      ) : (
        <div className="border border-[#1c1f26] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 bg-[#0c0d10] border-b border-[#1c1f26] text-xs text-[#8b93a1] uppercase tracking-wider">
            <div className="w-5">
              <input
                type="checkbox"
                checked={
                  filteredTokens.length > 0 &&
                  selected.length === filteredTokens.length
                }
                onChange={toggleSelectAll}
                className="rounded border-[#3a3f4b] bg-[#101215]"
              />
            </div>
            <div>Token</div>
            <div className="text-right">Actions</div>
          </div>

          {filteredTokens.map((token) => (
            <div
              key={token.id}
              className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3.5 border-b border-[#1c1f26] last:border-0 hover:bg-[#14171d] transition"
            >
              <div className="w-5">
                <input
                  type="checkbox"
                  checked={selected.includes(token.id)}
                  onChange={() => toggleSelect(token.id)}
                  className="rounded border-[#3a3f4b] bg-[#101215]"
                />
              </div>

              <div className="flex items-center gap-3 min-w-0">
                {token.image_url ? (
                  <img
                    src={token.image_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[#1c1f26] flex-shrink-0" />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/token/${token.chain}/${token.address}`}
                      className="font-medium hover:text-[#b8ff3d] transition"
                    >
                      {token.symbol || "???"}
                    </Link>
                    <span className="text-[11px] text-[#8b93a1] border border-[#1c1f26] px-1.5 rounded">
                      {token.chain}
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                        token.status === "approved"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {token.status}
                    </span>
                  </div>

                  <div className="text-sm text-[#8b93a1] truncate mt-0.5">
                    {token.name || token.address}
                  </div>

                  {/* Who submitted */}
                  <div className="text-xs text-[#5c6573] mt-1">
                    Submitted by{" "}
                    {token.profiles?.display_name ? (
                      <Link
                        href={`/curator/${token.profiles.id}`}
                        className="text-[#b8ff3d] hover:underline"
                      >
                        {token.profiles.display_name}
                      </Link>
                    ) : (
                      "Unknown"
                    )}{" "}
                    · {new Date(token.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {token.status === "pending" && (
                  <button
                    onClick={() => approveToken(token.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#b8ff3d] text-black text-sm font-medium hover:bg-[#a3e635] transition"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => deleteToken(token.id)}
                  className="px-3.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}