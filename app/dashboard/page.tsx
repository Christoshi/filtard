"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/auth";

type Profile = {
  id: string;
  display_name: string | null;
  role: string;
  twitter_url: string | null;
  telegram_url: string | null;
  avatar_url: string | null;
  token_count?: number;
};

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
  thesis: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<"tokens" | "curators">("tokens");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Thesis modal
  const [thesisModal, setThesisModal] = useState<{
    open: boolean;
    symbol: string;
    thesis: string;
  }>({ open: false, symbol: "", thesis: "" });

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
      await Promise.all([loadTokens(), loadProfiles()]);
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
        thesis,
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

  async function loadProfiles() {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, display_name, role, twitter_url, telegram_url, avatar_url")
      .order("display_name");

    if (!profilesData) return;

    const { data: tokenCounts } = await supabase
      .from("tokens")
      .select("submitted_by")
      .eq("status", "approved");

    const countMap: Record<string, number> = {};
    tokenCounts?.forEach((t) => {
      if (t.submitted_by) {
        countMap[t.submitted_by] = (countMap[t.submitted_by] || 0) + 1;
      }
    });

    const enriched = profilesData
      .map((p) => ({
        ...p,
        token_count: countMap[p.id] || 0,
      }))
      .filter((p) => p.token_count > 0);

    setProfiles(enriched);
  }

  async function updateRole(userId: string, newRole: string) {
    if (userId === user.id) {
      setMessage("You cannot change your own role");
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      setMessage("Error updating role: " + error.message);
      await loadProfiles();
    } else {
      setMessage("Role updated successfully");
    }
  }

  async function getCurrentMcap(address: string): Promise<number | null> {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`
      );
      const data = await res.json();
      const pair = data?.pairs?.[0];
      return pair?.marketCap ?? pair?.fdv ?? null;
    } catch {
      return null;
    }
  }

  async function approveToken(id: string) {
    const token = tokens.find((t) => t.id === id);
    if (!token) return;

    const mcap = await getCurrentMcap(token.address);

    const { error } = await supabase
      .from("tokens")
      .update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        initial_mcap: mcap,
      })
      .eq("id", id);

    if (error) {
      setMessage("Error approving token: " + error.message);
    } else {
      setMessage("Token approved");
      setSelected((prev) => prev.filter((x) => x !== id));
      await loadTokens();
    }
  }

  /** Delete related rows first, then the token */
  async function deleteRelatedRows(tokenIds: string[]) {
    // Order matters only if there are deeper FKs; these are all children of tokens
    const tables = ["ratings", "token_views", "token_stats"] as const;

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .in("token_id", tokenIds);

      if (error) {
        return error;
      }
    }

    return null;
  }

  async function deleteToken(id: string) {
    if (!confirm("Are you sure you want to delete this token?")) return;

    // 1. Remove related rows
    const relatedError = await deleteRelatedRows([id]);
    if (relatedError) {
      setMessage("Error deleting related data: " + relatedError.message);
      return;
    }

    // 2. Remove the token
    const { error } = await supabase.from("tokens").delete().eq("id", id);

    if (error) {
      setMessage("Error deleting token: " + error.message);
    } else {
      setMessage("Token deleted");
      setSelected((prev) => prev.filter((x) => x !== id));
      await loadTokens();
    }
  }

  async function bulkApprove() {
    if (selected.length === 0) return;
    if (!confirm(`Approve ${selected.length} tokens?`)) return;

    setMessage("Approving tokens...");

    for (const id of selected) {
      const token = tokens.find((t) => t.id === id);
      if (!token) continue;

      const mcap = await getCurrentMcap(token.address);

      await supabase
        .from("tokens")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          initial_mcap: mcap,
        })
        .eq("id", id);
    }

    setMessage(`${selected.length} tokens approved`);
    setSelected([]);
    await loadTokens();
  }

  async function bulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} tokens permanently?`)) return;

    // 1. Remove related rows
    const relatedError = await deleteRelatedRows(selected);
    if (relatedError) {
      setMessage("Error deleting related data: " + relatedError.message);
      return;
    }

    // 2. Remove the tokens
    const { error } = await supabase.from("tokens").delete().in("id", selected);

    if (error) {
      setMessage("Error bulk deleting: " + error.message);
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
        <p className="text-[#8b93a1]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("tokens")}
          className={`px-4 py-2 rounded-xl text-sm border transition ${
            activeTab === "tokens"
              ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
              : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b]"
          }`}
        >
          Tokens
        </button>
        <button
          onClick={() => setActiveTab("curators")}
          className={`px-4 py-2 rounded-xl text-sm border transition ${
            activeTab === "curators"
              ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
              : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b]"
          }`}
        >
          Curators
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-[#101215] border border-[#1c1f26] text-sm text-center">
          {message}
        </div>
      )}

      {/* ===================== TOKENS TAB ===================== */}
      {activeTab === "tokens" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, symbol, address or curator..."
              className="flex-1 rounded-xl border border-[#1c1f26] bg-[#101215] px-4 py-2.5 text-sm placeholder:text-[#5c6573] focus:outline-none focus:border-[#3a3f4b]"
            />

            <div className="flex gap-2">
              {(["all", "pending", "approved"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm border transition ${
                    filter === f
                      ? "bg-[#b8ff3d] text-black border-[#b8ff3d]"
                      : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b]"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3.5 rounded-xl bg-[#101215] border border-[#1c1f26]">
              <span className="text-sm text-[#8b93a1]">
                {selected.length} selected
              </span>
              <button
                onClick={bulkApprove}
                className="px-3.5 py-1.5 rounded-lg bg-[#b8ff3d] text-black text-sm font-medium hover:bg-[#a3e635]"
              >
                Approve Selected
              </button>
              <button
                onClick={bulkDelete}
                className="px-3.5 py-1.5 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelected([])}
                className="text-sm text-[#8b93a1] hover:text-white"
              >
                Clear
              </button>
            </div>
          )}

          {filteredTokens.length === 0 ? (
            <div className="border border-[#1c1f26] rounded-2xl p-16 text-center text-[#8b93a1]">
              No tokens found
            </div>
          ) : (
            <div className="border border-[#1c1f26] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 bg-[#0c0d10] border-b border-[#1c1f26] text-xs text-[#8b93a1]">
                <div className="w-5">
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filteredTokens.length &&
                      filteredTokens.length > 0
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
                  className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 border-b border-[#1c1f26] last:border-0 hover:bg-[#14171d] transition"
                >
                  <div className="w-5">
                    <input
                      type="checkbox"
                      checked={selected.includes(token.id)}
                      onChange={() => toggleSelect(token.id)}
                      className="rounded border-[#3a3f4b] bg-[#101215]"
                    />
                  </div>

                  <div className="flex items-center gap-3.5 min-w-0">
                    {token.image_url ? (
                      <img
                        src={token.image_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-[#1c1f26] flex-shrink-0" />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${token.chain}/${token.address}`}
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

                      <div className="text-xs text-[#5c6573] mt-1">
                        Submitted by{" "}
                        {token.profiles?.display_name ? (
                          <Link
                            href={`/${token.profiles.display_name}`}
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
                    {token.thesis && (
                      <button
                        onClick={() =>
                          setThesisModal({
                            open: true,
                            symbol: token.symbol || "Token",
                            thesis: token.thesis || "",
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-[#2a2e38] text-[#8b93a1] text-sm hover:text-white hover:border-[#3a3f4b] transition"
                      >
                        View Thesis
                      </button>
                    )}

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
        </>
      )}

      {/* ===================== CURATORS TAB ===================== */}
      {activeTab === "curators" && (
        <div className="border border-[#1c1f26] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px] gap-4 px-5 py-3.5 bg-[#0c0d10] border-b border-[#1c1f26] text-xs text-[#8b93a1] uppercase tracking-wider">
            <div>Curator</div>
            <div className="text-center">Tokens</div>
            <div className="text-right">Role</div>
          </div>

          {profiles.length === 0 ? (
            <div className="p-16 text-center text-[#8b93a1]">
              No curators yet
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="grid grid-cols-[1fr_120px_120px] gap-4 items-center px-5 py-4 border-b border-[#1c1f26] last:border-0 hover:bg-[#14171d] transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-[#1c1f26] flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {(profile.display_name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/${profile.display_name}`}
                      className="font-medium hover:text-[#b8ff3d] transition"
                    >
                      {profile.display_name || "Anonymous"}
                    </Link>
                  </div>
                </div>

                <div className="text-center font-medium">
                  {profile.token_count}
                </div>

                <div className="text-right">
                  <select
                    value={profile.role}
                    onChange={(e) => updateRole(profile.id, e.target.value)}
                    className="rounded-lg border border-[#1c1f26] bg-[#101215] px-2 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="user">user</option>
                    <option value="curator">curator</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Thesis Modal */}
      {thesisModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setThesisModal({ open: false, symbol: "", thesis: "" })
            }
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl border border-[#2a2e38] bg-[#0a0b0e] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c1f26]">
              <h3 className="text-lg font-medium text-white">
                Thesis — ${thesisModal.symbol}
              </h3>
              <button
                onClick={() =>
                  setThesisModal({ open: false, symbol: "", thesis: "" })
                }
                className="text-[#8b93a1] hover:text-white transition"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-[15px] leading-relaxed text-[#c8cdd5] whitespace-pre-wrap">
              {thesisModal.thesis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}