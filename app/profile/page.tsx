"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, supabase } from "@/lib/auth";
import { isReservedUsername } from "@/lib/reserved";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Current saved values
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [solWallet, setSolWallet] = useState("");
  const [evmWallet, setEvmWallet] = useState("");

  // Draft values while editing
  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");
  const [draftTwitter, setDraftTwitter] = useState("");
  const [draftTelegram, setDraftTelegram] = useState("");
  const [draftDiscord, setDraftDiscord] = useState("");
  const [draftSol, setDraftSol] = useState("");
  const [draftEvm, setDraftEvm] = useState("");

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setAvatarUrl(profile.avatar_url || "");
        setTwitterUrl(profile.twitter_url || "");
        setTelegramUrl(profile.telegram_url || "");
        setDiscordUrl(profile.discord_url || "");
        setSolWallet(profile.sol_wallet || "");
        setEvmWallet(profile.evm_wallet || "");
      }

      setLoading(false);
    }
    load();
  }, [router]);

  function startEditing() {
    setDraftName(displayName);
    setDraftAvatar(avatarUrl);
    setDraftTwitter(twitterUrl);
    setDraftTelegram(telegramUrl);
    setDraftDiscord(discordUrl);
    setDraftSol(solWallet);
    setDraftEvm(evmWallet);
    setError("");
    setMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError("");
    setMessage("");
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    setUploading(true);
    setError("");

    const user = await getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Failed to upload image. Please try again.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl + `?t=${Date.now()}`;

    setDraftAvatar(publicUrl);
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const cleanName = draftName.trim().toLowerCase();

    if (cleanName.length < 3) {
      setError("Username must be at least 3 characters");
      setSaving(false);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanName)) {
      setError("Only letters, numbers and underscores allowed");
      setSaving(false);
      return;
    }

        if (isReservedUsername(cleanName)) {
      setError("This username is reserved");
      setSaving(false);
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", cleanName)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      setError("This username is already taken");
      setSaving(false);
      return;
    }

    const cleanSol = draftSol.trim();
    const cleanEvm = draftEvm.trim();

    if (cleanSol && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanSol)) {
      setError("Invalid Solana wallet address");
      setSaving(false);
      return;
    }

    if (cleanEvm && !/^0x[a-fA-F0-9]{40}$/.test(cleanEvm)) {
      setError("Invalid EVM wallet address (must start with 0x)");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: cleanName,
        avatar_url: draftAvatar.trim() || null,
        twitter_url: draftTwitter.trim() || null,
        telegram_url: draftTelegram.trim() || null,
        discord_url: draftDiscord.trim() || null,
        sol_wallet: cleanSol || null,
        evm_wallet: cleanEvm || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Could not save changes. Please try again.");
      setSaving(false);
      return;
    }

    // Update the displayed values
    setDisplayName(cleanName);
    setAvatarUrl(draftAvatar);
    setTwitterUrl(draftTwitter);
    setTelegramUrl(draftTelegram);
    setDiscordUrl(draftDiscord);
    setSolWallet(cleanSol);
    setEvmWallet(cleanEvm);

    setMessage("Profile updated");
    setSaving(false);
    setIsEditing(false);
  }

  function truncate(addr: string) {
    if (!addr || addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-[#8b93a1]">Loading...</p>
      </div>
    );
  }

  // ===================== VIEW MODE =====================
  if (!isEditing) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Profile</h1>
        </div>

        <div className="rounded-2xl border border-[#1c1f26] bg-[#0a0b0e] overflow-hidden">
          {/* Header */}
          <div className="relative p-6 pb-5">
            <button
              onClick={startEditing}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#8b93a1] hover:text-white hover:bg-[#1c1f26] transition"
              title="Edit profile"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover border border-[#1c1f26]"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-[#1c1f26] flex items-center justify-center text-xl font-medium">
                  {(displayName || "U")[0].toUpperCase()}
                </div>
              )}

              <div>
                {displayName ? (
                  <a
                    href={`/${displayName}`}
                    className="text-xl font-semibold hover:text-[#b8ff3d] transition"
                  >
                    {displayName}
                  </a>
                ) : (
                  <h2 className="text-xl font-semibold">Anonymous</h2>
                )}
                <p className="text-sm text-[#8b93a1] mt-0.5">Curator profile</p>
              </div>
            </div>
          </div>

          {/* Socials */}
          {(twitterUrl || telegramUrl || discordUrl) && (
            <div className="px-6 pb-5">
              <p className="text-xs text-[#5c6573] uppercase tracking-wider mb-3">
                Socials
              </p>
              <div className="flex items-center gap-3">
                {twitterUrl && (
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#101215] border border-[#1c1f26] text-[#8b93a1] hover:text-white hover:border-[#3a3f4b] transition"
                    title="X"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {telegramUrl && (
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#101215] border border-[#1c1f26] text-[#8b93a1] hover:text-white hover:border-[#3a3f4b] transition"
                    title="Telegram"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.36-.49.99-.75 3.89-1.69 6.49-2.81 7.79-3.35 3.72-1.54 4.49-1.81 4.99-1.82.11 0 .35.03.51.14.13.09.17.21.19.3-.01.06.01.24 0 .38z" />
                    </svg>
                  </a>
                )}
                {discordUrl && (
                  <a
                    href={discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#101215] border border-[#1c1f26] text-[#8b93a1] hover:text-white hover:border-[#3a3f4b] transition"
                    title="Discord"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Wallets */}
          {(solWallet || evmWallet) && (
            <div className="px-6 pb-6 border-t border-[#1c1f26] pt-5">
              <p className="text-xs text-[#5c6573] uppercase tracking-wider mb-3">
                Wallets (for tips)
              </p>
              <div className="space-y-2.5">
                {solWallet && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9945FF] flex-shrink-0" />
                      <span className="text-xs text-[#8b93a1] w-12">Solana</span>
                      <code className="text-sm text-[#c8cdd5] truncate">
                        {truncate(solWallet)}
                      </code>
                    </div>
                    <button
                      onClick={() => copyText(solWallet)}
                      className="text-xs text-[#8b93a1] hover:text-white transition flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                )}
                {evmWallet && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#627EEA] flex-shrink-0" />
                      <span className="text-xs text-[#8b93a1] w-12">EVM</span>
                      <code className="text-sm text-[#c8cdd5] truncate">
                        {truncate(evmWallet)}
                      </code>
                    </div>
                    <button
                      onClick={() => copyText(evmWallet)}
                      className="text-xs text-[#8b93a1] hover:text-white transition flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!twitterUrl &&
            !telegramUrl &&
            !discordUrl &&
            !solWallet &&
            !evmWallet && (
              <div className="px-6 pb-6 text-sm text-[#5c6573]">
                No socials or wallets added yet. Click the edit icon to add
                them.
              </div>
            )}
        </div>

        {message && (
          <p className="text-sm text-green-400 text-center mt-4">{message}</p>
        )}
      </div>
    );
  }

  // ===================== EDIT MODE =====================
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Edit Profile</h1>
        <button
          onClick={cancelEditing}
          className="text-sm text-[#8b93a1] hover:text-white transition"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {draftAvatar ? (
              <img
                src={draftAvatar}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover border border-[#1c1f26]"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#1c1f26] flex items-center justify-center text-2xl font-medium">
                {(draftName || "U")[0].toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-lg border border-[#1c1f26] bg-[#101215] text-sm hover:bg-[#1c1f26] transition disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change picture"}
            </button>
            <p className="text-xs text-[#5c6573] mt-1.5">
              JPG, PNG or WebP. Max 2MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm text-[#8b93a1] mb-1">Username</label>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            required
            className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2.5 focus:outline-none focus:border-[#b8ff3d]"
          />
        </div>

        {/* Social Links */}
        <div>
          <p className="text-sm text-[#8b93a1] mb-3">Social Links (optional)</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">
                X (Twitter)
              </label>
              <input
                type="url"
                value={draftTwitter}
                onChange={(e) => setDraftTwitter(e.target.value)}
                placeholder="https://x.com/yourhandle"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">
                Telegram
              </label>
              <input
                type="url"
                value={draftTelegram}
                onChange={(e) => setDraftTelegram(e.target.value)}
                placeholder="https://t.me/yourhandle"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">Discord</label>
              <input
                type="url"
                value={draftDiscord}
                onChange={(e) => setDraftDiscord(e.target.value)}
                placeholder="https://discord.gg/... or discord.com/users/..."
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
          </div>
        </div>

        {/* Wallets */}
        <div>
          <p className="text-sm text-[#8b93a1] mb-3">
            Wallet Addresses (for tips)
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">
                Solana Wallet
              </label>
              <input
                type="text"
                value={draftSol}
                onChange={(e) => setDraftSol(e.target.value)}
                placeholder="Your Solana address"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">
                EVM Wallet
              </label>
              <input
                type="text"
                value={draftEvm}
                onChange={(e) => setDraftEvm(e.target.value)}
                placeholder="Your EVM address (0x...)"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        {message && (
          <p className="text-sm text-green-400 text-center">{message}</p>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full rounded-lg bg-[#b8ff3d] py-2.5 font-medium text-black hover:bg-[#a3e635] disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}