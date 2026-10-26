export const REWARD_COVERS_BUCKET = "reward-covers";

/** Cards shown in the strip above the footer. */
export const REWARD_SPOTLIGHT_LIMIT = 3;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type RewardPost = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  body: string;
  cover_image_url: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published: boolean;
  telegram_posted_at: string | null;
};

export type RewardCardData = Pick<
  RewardPost,
  | "id"
  | "title"
  | "subtitle"
  | "slug"
  | "cover_image_url"
  | "expires_at"
  | "created_at"
  | "updated_at"
>;

export type RewardDetail = RewardCardData & Pick<RewardPost, "body">;

export type RewardWriteInput = {
  title: string;
  subtitle: string;
  slug: string;
  body: string;
  cover_image_url: string | null;
  expires_at: string | null;
  published: boolean;
};

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function isRewardSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_RE.test(slug);
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Posts for the footer strip on this path.
 * The listing page gets none. A reward detail page drops that post and
 * keeps the next candidate so the strip can still fill.
 */
export function spotlightPostsForPath<T extends { slug: string }>(
  posts: readonly T[],
  pathname: string,
  limit = REWARD_SPOTLIGHT_LIMIT
): T[] {
  const path = normalizePathname(pathname);
  if (path === "/rewards") return [];

  let slug: string | null = null;
  const prefix = "/rewards/";
  if (path.startsWith(prefix)) {
    const rest = path.slice(prefix.length);
    if (rest.length > 0 && !rest.includes("/")) {
      try {
        slug = decodeURIComponent(rest);
      } catch {
        slug = rest;
      }
    }
  }

  const filtered = slug ? posts.filter((post) => post.slug !== slug) : posts;
  return filtered.slice(0, limit);
}

export function isRewardExpired(
  expiresAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts <= now;
}

export function formatRewardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function coverStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${REWARD_COVERS_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    if (!path || path.includes("..") || path.startsWith("/")) return null;
    return path;
  } catch {
    return null;
  }
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asRewardPost(row: Record<string, unknown>): RewardPost {
  return {
    id: asText(row.id),
    title: asText(row.title),
    subtitle: asText(row.subtitle),
    slug: asText(row.slug),
    body: asText(row.body),
    cover_image_url: row.cover_image_url ? asText(row.cover_image_url) : null,
    expires_at: row.expires_at ? asText(row.expires_at) : null,
    created_by: row.created_by ? asText(row.created_by) : null,
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
    published: row.published === true,
    telegram_posted_at: row.telegram_posted_at
      ? asText(row.telegram_posted_at)
      : null,
  };
}

export function parseRewardInput(
  body: unknown
): RewardWriteInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid reward" };
  }

  const raw = body as Record<string, unknown>;
  const title = asText(raw.title).trim();
  if (!title || title.length > 160) {
    return { error: "Title must be between 1 and 160 characters" };
  }

  const subtitle = asText(raw.subtitle).trim();
  if (subtitle.length > 280) {
    return { error: "Subtitle must be 280 characters or fewer" };
  }

  const slug = asText(raw.slug).trim().toLowerCase();
  if (!isRewardSlug(slug)) {
    return {
      error: "Slug must use lowercase letters, numbers, and single hyphens",
    };
  }

  const html = asText(raw.body);
  if (html.length > 100000) {
    return { error: "Body is too long" };
  }

  let cover: string | null = null;
  if (raw.cover_image_url != null && raw.cover_image_url !== "") {
    if (typeof raw.cover_image_url !== "string") {
      return { error: "Cover image must be a URL" };
    }
    const trimmed = raw.cover_image_url.trim();
    if (trimmed.length > 2000) {
      return { error: "Cover image URL is too long" };
    }
    if (trimmed) {
      try {
        const url = new URL(trimmed);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return { error: "Cover image must be an http or https URL" };
        }
        cover = trimmed;
      } catch {
        return { error: "Cover image must be an http or https URL" };
      }
    }
  }

  let expiresAt: string | null = null;
  if (raw.expires_at != null && raw.expires_at !== "") {
    if (typeof raw.expires_at !== "string") {
      return { error: "Expiry must be a date" };
    }
    const parsed = new Date(raw.expires_at);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Expiry must be a valid date" };
    }
    expiresAt = parsed.toISOString();
  }

  if (typeof raw.published !== "boolean") {
    return { error: "Published must be true or false" };
  }

  return {
    title,
    subtitle,
    slug,
    body: html,
    cover_image_url: cover,
    expires_at: expiresAt,
    published: raw.published,
  };
}

export function isRewardInputError(
  result: RewardWriteInput | { error: string }
): result is { error: string } {
  return "error" in result;
}
