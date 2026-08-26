export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.filtard.com";
  if (raw === "https://filtard.com" || raw === "http://filtard.com") {
    return "https://www.filtard.com";
  }
  return raw.replace(/\/$/, "");
}