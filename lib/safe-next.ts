export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";

  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/";
  }

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/";
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    return "/submit";
  }

  if (
    path === "/login" ||
    path.startsWith("/login?") ||
    path === "/auth/callback" ||
    path.startsWith("/auth/callback?")
  ) {
    return "/";
  }

  return path;
}
