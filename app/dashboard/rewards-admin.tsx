"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import RewardEditor from "@/app/components/RewardEditor";
import { supabase } from "@/lib/auth";
import {
  isRewardExpired,
  slugifyTitle,
  type RewardPost,
} from "@/lib/rewards";

const fieldClass =
  "w-full rounded-xl border border-[#1c1f26] bg-[#101215] px-4 py-2.5 text-sm placeholder:text-[#5c6573] focus:border-[#3a3f4b] focus:outline-none";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function accessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function RewardsAdmin() {
  const [posts, setPosts] = useState<RewardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [postId, setPostId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [cover, setCover] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [published, setPublished] = useState(false);
  const [telegramPostedAt, setTelegramPostedAt] = useState<string | null>(null);
  const slugTouched = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    const token = await accessToken();
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/rewards", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Could not load rewards");
      setLoading(false);
      return;
    }

    setPosts(Array.isArray(data?.posts) ? data.posts : []);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadPosts();
    }
    void init();
  }, [loadPosts]);

  function startNew() {
    setEditing(true);
    setPostId(null);
    setTitle("");
    setSubtitle("");
    setSlug("");
    setBody("");
    setCover("");
    setExpiresAt("");
    setPublished(false);
    setTelegramPostedAt(null);
    slugTouched.current = false;
    setError("");
    setNotice("");
  }

  function startEdit(post: RewardPost) {
    setEditing(true);
    setPostId(post.id);
    setTitle(post.title);
    setSubtitle(post.subtitle);
    setSlug(post.slug);
    setBody(post.body);
    setCover(post.cover_image_url || "");
    setExpiresAt(toDatetimeLocal(post.expires_at));
    setPublished(post.published);
    setTelegramPostedAt(post.telegram_posted_at);
    slugTouched.current = true;
    setError("");
    setNotice("");
  }

  function closeEditor() {
    setEditing(false);
    setError("");
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    const token = await accessToken();
    if (!token) {
      setError("Not authenticated");
      setUploading(false);
      return;
    }

    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/admin/rewards/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data?.url !== "string") {
      setError(data?.error || "Could not upload the cover image");
      setUploading(false);
      return;
    }

    setCover(data.url);
    setUploading(false);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const token = await accessToken();
    if (!token) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    let expires: string | null = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        setError("Expiry must be a valid date");
        setSaving(false);
        return;
      }
      expires = parsed.toISOString();
    }

    const payload = {
      title,
      subtitle,
      slug,
      body,
      cover_image_url: cover.trim() || null,
      expires_at: expires,
      published,
    };

    const res = await fetch(
      postId ? `/api/admin/rewards/${postId}` : "/api/admin/rewards",
      {
        method: postId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Could not save the reward");
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    setNotice("Saved");
    await loadPosts();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this reward post?")) return;
    setError("");
    setNotice("");

    const token = await accessToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    const res = await fetch(`/api/admin/rewards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Could not delete the reward");
      return;
    }

    setNotice("Deleted");
    if (postId === id) setEditing(false);
    await loadPosts();
  }

  if (loading) {
    return <p className="text-sm text-[#8b93a1]">Loading...</p>;
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {postId ? "Edit reward" : "New reward"}
          </h2>
          <button
            type="button"
            onClick={closeEditor}
            className="text-sm text-[#8b93a1] hover:text-white"
          >
            Back
          </button>
        </div>

        <div>
          <label htmlFor="reward-title" className="mb-1.5 block text-sm text-[#8b93a1]">
            Title
          </label>
          <input
            id="reward-title"
            value={title}
            onChange={(event) => {
              const next = event.target.value;
              setTitle(next);
              if (!slugTouched.current) setSlug(slugifyTitle(next));
            }}
            required
            maxLength={160}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="reward-subtitle" className="mb-1.5 block text-sm text-[#8b93a1]">
            Subtitle
          </label>
          <input
            id="reward-subtitle"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            maxLength={280}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="reward-slug" className="mb-1.5 block text-sm text-[#8b93a1]">
            Slug
          </label>
          <input
            id="reward-slug"
            value={slug}
            onChange={(event) => {
              slugTouched.current = true;
              setSlug(event.target.value.toLowerCase());
            }}
            required
            maxLength={80}
            autoComplete="off"
            className={fieldClass}
          />
          <p className="mt-1.5 text-xs text-[#6b7280]">
            filtard.com/rewards/{slug || "slug"}
          </p>
        </div>

        <div>
          <label htmlFor="reward-cover" className="mb-1.5 block text-sm text-[#8b93a1]">
            Cover image
          </label>
          <input
            id="reward-cover"
            value={cover}
            onChange={(event) => setCover(event.target.value)}
            placeholder="https://"
            className={fieldClass}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-[#2a2e38] px-3 py-1.5 text-sm text-[#8b93a1] transition hover:border-[#3a3f4b] hover:text-white disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            {cover ? (
              <button
                type="button"
                onClick={() => setCover("")}
                className="text-sm text-[#8b93a1] hover:text-white"
              >
                Remove
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onUpload}
            />
          </div>
          <p className="mt-1.5 text-xs text-[#6b7280]">
            Upload an image or paste a URL. JPEG, PNG, WEBP, or GIF, up to 5MB.
          </p>
          {cover ? (
            <img
              src={cover}
              alt=""
              className="mt-3 h-36 w-full max-w-sm rounded-xl border border-[#1c1f26] object-cover"
            />
          ) : null}
        </div>

        <div>
          <label htmlFor="reward-expires" className="mb-1.5 block text-sm text-[#8b93a1]">
            Expires
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="reward-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className={`${fieldClass} sm:max-w-xs`}
            />
            {expiresAt ? (
              <button
                type="button"
                onClick={() => setExpiresAt("")}
                className="text-sm text-[#8b93a1] hover:text-white"
              >
                Clear expiry
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-[#6b7280]">
            Optional. Expired posts stay listed with an Expired label.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-[#8b93a1]">Body</label>
          <RewardEditor
            key={postId || "new"}
            initialHtml={body}
            onChange={setBody}
          />
          <p className="mt-1.5 text-xs text-[#6b7280]">
            Headings, bold, italic, lists, and links.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="accent-[#b8ff3d]"
          />
          Published
        </label>
        <p className="text-xs text-[#6b7280]">
          {telegramPostedAt
            ? "Already sent to Telegram. Saving again will not send another message."
            : "The first time this is published, the title and link are sent to the Telegram group."}
        </p>

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-lg bg-[#b8ff3d] px-4 py-2 text-sm font-medium text-black hover:bg-[#a3e635] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {postId ? (
            <button
              type="button"
              onClick={() => onDelete(postId)}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[#8b93a1]">
          {posts.length === 0 ? "No reward posts yet" : `${posts.length} posts`}
        </p>
        <button
          type="button"
          onClick={startNew}
          className="rounded-xl bg-[#b8ff3d] px-4 py-2 text-sm font-medium text-black hover:bg-[#a3e635]"
        >
          New reward
        </button>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mb-4 text-sm text-[#b8ff3d]">{notice}</p> : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-[#1c1f26] p-16 text-center text-[#8b93a1]">
          No rewards yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#1c1f26]">
          {posts.map((post) => {
            const expired = post.published && isRewardExpired(post.expires_at);
            return (
              <div
                key={post.id}
                className="flex flex-col gap-3 border-b border-[#1c1f26] px-4 py-4 last:border-0 hover:bg-[#14171d] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-14 w-20 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-20 flex-shrink-0 rounded-lg bg-[#1c1f26]" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{post.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          post.published
                            ? "bg-green-500/15 text-green-400"
                            : "bg-yellow-500/15 text-yellow-400"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                      {expired ? (
                        <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[11px] text-yellow-400">
                          Expired
                        </span>
                      ) : null}
                    </div>
                    {post.subtitle ? (
                      <p className="mt-0.5 truncate text-sm text-[#8b93a1]">
                        {post.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[#5c6573]">/rewards/{post.slug}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {post.published ? (
                    <Link
                      href={`/rewards/${post.slug}`}
                      className="rounded-lg border border-[#2a2e38] px-3 py-1.5 text-sm text-[#8b93a1] transition hover:border-[#3a3f4b] hover:text-white"
                    >
                      View
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    className="rounded-lg border border-[#2a2e38] px-3 py-1.5 text-sm text-[#8b93a1] transition hover:border-[#3a3f4b] hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
