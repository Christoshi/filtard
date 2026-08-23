"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, supabase } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [solWallet, setSolWallet] = useState("");
  const [evmWallet, setEvmWallet] = useState("");

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

    setAvatarUrl(publicUrl);
    setUploading(false);
    setMessage("Image uploaded – click Save Changes to keep it");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const cleanName = displayName.trim().toLowerCase();

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

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: cleanName,
        avatar_url: avatarUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        discord_url: discordUrl.trim() || null,
        sol_wallet: solWallet.trim() || null,
        evm_wallet: evmWallet.trim() || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Could not save changes. Please try again.");
      setSaving(false);
      return;
    }

    setMessage("Profile updated successfully!");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-[#8b93a1]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Edit Profile</h1>
      <p className="text-sm text-[#8b93a1] mb-8">
        This information is shown publicly on your curator page
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover border border-[#1c1f26]"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#1c1f26] flex items-center justify-center text-2xl font-medium">
                {(displayName || "U")[0].toUpperCase()}
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
              {uploading ? "Uploading..." : "Upload new picture"}
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
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2.5 focus:outline-none focus:border-[#b8ff3d]"
          />
        </div>

        {/* Social Links */}
        <div>
          <p className="text-sm text-[#8b93a1] mb-3">Social Links (optional)</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">X (Twitter)</label>
              <input
                type="url"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/yourhandle"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">Telegram</label>
              <input
                type="url"
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
                placeholder="https://t.me/yourhandle"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">Discord</label>
              <input
                type="url"
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
                placeholder="https://discord.gg/... or discord.com/users/..."
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
          </div>
        </div>

        {/* Wallet Addresses */}
        <div>
          <p className="text-sm text-[#8b93a1] mb-3">Wallet Addresses (for tips)</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">Solana Wallet</label>
              <input
                type="text"
                value={solWallet}
                onChange={(e) => setSolWallet(e.target.value)}
                placeholder="Your Solana address"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8b93a1] mb-1">EVM Wallet</label>
              <input
                type="text"
                value={evmWallet}
                onChange={(e) => setEvmWallet(e.target.value)}
                placeholder="Your EVM address (0x...)"
                className="w-full rounded-lg border border-[#1c1f26] bg-[#101215] px-3 py-2 focus:outline-none focus:border-[#b8ff3d]"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        {message && <p className="text-sm text-green-400 text-center">{message}</p>}

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