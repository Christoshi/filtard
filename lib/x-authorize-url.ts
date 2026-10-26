export function isXAuthorizeUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;

  try {
    const parsed = new URL(url);
    const expected = new URL(base);
    return (
      parsed.origin === expected.origin &&
      parsed.pathname.endsWith("/authorize") &&
      parsed.searchParams.get("provider") === "x"
    );
  } catch {
    return false;
  }
}
