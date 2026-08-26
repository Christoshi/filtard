export const RESERVED_USERNAMES = [
  "admin",
  "dashboard",
  "login",
  "profile",
  "submissions",
  "setup-username",
  "auth",
  "api",
  "token",
  "curator",
  "about",
  "privacy",
  "terms",
  "leaderboard",
  "solana",
  "base",
  "ethereum",
  "bsc",
  "arbitrum",
  "robinhood",
  "filtard",
  "www",
  "submit",
] as const;

export function isReservedUsername(name: string): boolean {
  return (RESERVED_USERNAMES as readonly string[]).includes(
    name.trim().toLowerCase()
  );
}