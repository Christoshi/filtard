import type { SupabaseClient } from "@supabase/supabase-js";
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

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildListingMessage(listing: ListingPost): string {
  const symbol = oneLine(listing.symbol || "???").toUpperCase();
  const name = oneLine(listing.name || symbol);
  const url = `${getSiteUrl()}/${encodeURIComponent(listing.chain)}/${encodeURIComponent(listing.address)}`;

  return `${name} (${symbol}) just got listed on Filtard. Read the thesis here 👇\n\n${url}`;
}

function redactSecrets(message: string): string {
  return message.replace(/bot[^/\s]+/gi, "bot[redacted]");
}

async function sendPlainMessage(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set",
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
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
        error: data?.description || `Telegram sendMessage failed (${res.status})`,
      };
    }
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Telegram request failed";
    return { ok: false, error: redactSecrets(message) };
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

    const sent = await sendPlainMessage(buildListingMessage(listing));
    if (!sent.ok) {
      console.error("telegram sendMessage failed:", sent.error);
    }
  } catch (err: unknown) {
    console.error("telegram announce failed:", err);
  }
}
