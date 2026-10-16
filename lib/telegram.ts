import type { SupabaseClient } from "@supabase/supabase-js";
import { chainLabel } from "@/lib/chains";
import { getSiteUrl } from "@/lib/site";

export type ListingPost = {
  name: string | null;
  symbol: string | null;
  chain: string;
  address: string;
  thesis: string | null;
  marketCap: number | null;
  curatorName: string | null;
  imageUrl: string | null;
};

const EXCERPT_MAX = 220;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).trimEnd()}...`;
}

function plainThesis(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatListingMcap(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

export function buildListingMessage(listing: ListingPost): string {
  const symbol = clip(listing.symbol || "???", 32);
  const name = clip(listing.name || symbol, 80);
  const chain = escapeHtml(chainLabel(listing.chain));
  const address = escapeHtml(listing.address.trim());
  const curator = escapeHtml(clip(listing.curatorName || "Anonymous", 64));
  const siteUrl = `${getSiteUrl()}/${encodeURIComponent(listing.chain)}/${encodeURIComponent(listing.address)}`;
  const dexUrl = `https://dexscreener.com/${encodeURIComponent(listing.chain.toLowerCase())}/${encodeURIComponent(listing.address)}`;

  const lines = [
    `<b>${escapeHtml(name)}</b> ($${escapeHtml(symbol)})`,
    `Chain: ${chain}`,
    `CA: <code>${address}</code>`,
  ];

  const excerpt = listing.thesis ? clip(plainThesis(listing.thesis), EXCERPT_MAX) : "";
  if (excerpt) {
    lines.push("", escapeHtml(excerpt));
  }

  const mcap = listing.marketCap != null ? formatListingMcap(listing.marketCap) : null;
  lines.push("");
  if (mcap) lines.push(`Market cap at listing: ${escapeHtml(mcap)}`);
  lines.push(`Curated by ${curator}`);
  lines.push(
    "",
    `<a href="${siteUrl}">View on Filtard</a>`,
    `<a href="${dexUrl}">DexScreener</a>`
  );

  return lines.join("\n");
}

function redactSecrets(message: string): string {
  return message.replace(/bot[^/\s]+/gi, "bot[redacted]");
}

async function callTelegram(
  method: "sendPhoto" | "sendMessage",
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.description || `Telegram ${method} failed (${res.status})`,
      };
    }
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Telegram request failed";
    return { ok: false, error: redactSecrets(message) };
  }
}

async function deliverListing(html: string, imageUrl: string | null): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.error(
      "telegram announce skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set"
    );
    return;
  }

  const photo =
    imageUrl && /^https:\/\//i.test(imageUrl) ? imageUrl : null;

  if (photo) {
    const withPhoto = await callTelegram("sendPhoto", {
      chat_id: chatId,
      photo,
      caption: html,
      parse_mode: "HTML",
    });
    if (withPhoto.ok) return;
    console.error("telegram sendPhoto failed, falling back to text:", withPhoto.error);
  }

  const text = await callTelegram("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
  });
  if (!text.ok) {
    console.error("telegram sendMessage failed:", text.error);
  }
}

/**
 * Claim the one announcement slot, then post. A lost claim or a Telegram
 * error is logged and swallowed so listing the token still succeeds.
 */
export async function announceApprovedToken(
  admin: SupabaseClient,
  tokenId: string,
  listing: ListingPost
): Promise<void> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID?.trim()) {
      console.error(
        "telegram announce skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set"
      );
      return;
    }

    const { data, error } = await admin
      .from("tokens")
      .update({ telegram_posted_at: new Date().toISOString() })
      .eq("id", tokenId)
      .eq("status", "approved")
      .is("telegram_posted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("telegram announce skipped:", error.message);
      return;
    }
    if (!data) return;

    await deliverListing(buildListingMessage(listing), listing.imageUrl);
  } catch (err: unknown) {
    console.error("telegram announce failed:", err);
  }
}
