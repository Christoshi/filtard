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
  is_pinned: boolean;
  created_at: string;
  submitted_by: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
  } | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  role: string;
  twitter_url: string | null;
  telegram_url: string | null;
  avatar_url: string | null;
  token_count: number;
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
        is_pinned,
        created_at,
        submitted_by,
        profiles!submitted_by (
          id,
          display_name
        )
      `)
      .order("is_pinned", { ascending: false })
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
      setMessage("Error updating role");
      await loadProfiles();
    } else {
      setMessage("Role updated successfully");
    }
  }

  async function togglePin(tokenId: string, currentlyPinned: boolean) {
    // First unpin any currently pinned token
    if (!currentlyPinned) {
      await supabase
        .from("tokens")
        .update({ is_pinned: false })
        .eq("is_pinned", true);
    }

    const { error } = await supabase
      .from("tokens")
      .update({ is_pinned: !currentlyPinned })
      .eq("id", tokenId);

    if (error) {
      setMessage("Error updating pin status");
    } else {
      setMessage(currentlyPinned ? "Token unpinned" : "Token pinned as Partnership");
      await loadTokens();
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

    const { error } = await supabase.from("tokens").delete().in("id", selected);

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
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-[#8b93a1] mt-1">
            Manage tokens and curators
          </p>
        </div>
        <Link href="/admin" className="text-sm text-[#b8ff3d] hover:underline">
          Submit Token →
        </Link>
      </div>

      {message && (
        <div className="mb-6 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab("tokens")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "tokens"
              ? "bg-[#b8ff3d] text-black"
              : "bg-[#101215] text-[#8b93a1] hover:text-white border border-[#1c1f26]"
          }`}
        >
          Tokens
        </button>
        <button
          onClick={() => setActiveTab("curators")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "curators"
              ? "bg-[#b8ff3d] text-black"
              : "bg-[#101215] text-[#8b93a1] hover:text-white border border-[#1c1f26]"
          }`}
        >
          Curators
        </button>
      </div>

      {/* ===================== TOKENS TAB ===================== */}
      {activeTab === "tokens" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                  {f.charAt(0).toUpperCase() + f.slice(1)} (
                  {f === "all"
                    ? tokens.length
                    : tokens.filter((t) => t.status === f).length}
                  )
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
                className="text-sm text-[#8b93a1] hover:text-white ml-auto"
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
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3.5 bg-[#0c0d10] border-b border-[#1c1f26] text-xs text-[#8b93a1] uppercase tracking-wider">
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
                  className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 border-b border-[#1c1f26] last:border-0 transition ${
                    token.is_pinned
                      ? "bg-[#b8ff3d]/[0.04]"
                      : "hover:bg-[#14171d]"
                  }`}
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
                        {token.is_pinned && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#b8ff3d]/15 text-[#b8ff3d]">
                            Partnership
                          </span>
                        )}
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
                    {token.status === "approved" && (
                      <button
                        onClick={() => togglePin(token.id, token.is_pinned)}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                          token.is_pinned
                            ? "border border-[#b8ff3d]/50 text-[#b8ff3d] hover:bg-[#b8ff3d]/10"
                            : "border border-[#1c1f26] text-[#8b93a1] hover:border-[#b8ff3d]/50 hover:text-[#b8ff3d]"
                        }`}
                      >
                        {token.is_pinned ? "Unpin" : "Pin"}
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
          <div className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_1fr_1.2fr] gap-4 px-5 py-3.5 bg-[#0c0d10] border-b border-[#1c1f26] text-xs text-[#8b93a1] uppercase tracking-wider">
            <div>Username</div>
            <div className="text-center">#Tokens</div>
            <div className="text-center">X</div>
            <div className="text-center">TG</div>
            <div>Role</div>
            <div>Promote</div>
          </div>

          {profiles.length === 0 ? (
            <div className="p-16 text-center text-[#8b93a1]">
              No curators with approved tokens yet
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_1fr_1.2fr] gap-4 items-center px-5 py-4 border-b border-[#1c1f26] last:border-0 hover:bg-[#14171d] transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-[#1c1f26] flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {(profile.display_name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <Link
                    href={`/${profile.display_name}`}
                    className="font-medium hover:text-[#b8ff3d] transition truncate"
                  >
                    {profile.display_name || "Unnamed"}
                  </Link>
                </div>

                <div className="text-center text-sm text-[#f4f6f8]">
                  {profile.token_count}
                </div>

                <div className="flex justify-center">
                  {profile.twitter_url ? (
                    <a
                      href={profile.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8b93a1] hover:text-white transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-[#3a3f4b]">—</span>
                  )}
                </div>

                <div className="flex justify-center">
                  {profile.telegram_url ? (
                    <a
                      href={profile.telegram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8b93a1] hover:text-white transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-[#3a3f4b]">—</span>
                  )}
                </div>

                <div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      profile.role === "super_admin"
                        ? "bg-purple-500/15 text-purple-400"
                        : profile.role === "admin"
                        ? "bg-blue-500/15 text-blue-400"
                        : profile.role === "curator"
                        ? "bg-[#b8ff3d]/15 text-[#b8ff3d]"
                        : "bg-[#1c1f26] text-[#8b93a1]"
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>

                <div>
                  {profile.id === user.id ? (
                    <span className="text-xs text-[#5c6573]">You</span>
                  ) : (
                    <select
                      value={profile.role}
                      onChange={(e) => updateRole(profile.id, e.target.value)}
                      className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#b8ff3d]/50"
                    >
                      <option value="user">user</option>
                      <option value="curator">curator</option>
                      {user.role === "super_admin" && (
                        <option value="admin">admin</option>
                      )}
                      {user.role === "super_admin" && (
                        <option value="super_admin">super_admin</option>
                      )}
                    </select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}