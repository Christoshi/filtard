import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next";
import { getSiteUrl } from "@/lib/site";
import {
  X_HANDOFF_COOKIE,
  X_HANDOFF_MARKER,
  X_HANDOFF_TTL_SECONDS,
  isHandoffId,
} from "@/lib/x-handoff";

const STORAGE_KEY = "filtard-x-handoff";

type HandoffRow = {
  id: string;
  code_verifier: string;
  flow_id: string | null;
  authorize_url: string;
  next_path: string;
  status: "pending" | "complete";
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string;
};

export type PrepareXHandoffResult =
  | { ok: true; kind: "authorize"; handoffId: string; authorizeUrl: string }
  | { ok: true; kind: "waiting"; handoffId: string }
  | { ok: false; status: number; error: string };

export type FinishXHandoffResult =
  | {
      ok: true;
      mode: "session";
      accessToken: string;
      refreshToken: string;
      nextPath: string;
    }
  | { ok: true; mode: "return" }
  | { ok: false; status: number; error: string };

export type PollXHandoffResult =
  | { status: "idle"; clearCookies: boolean }
  | { status: "pending"; clearCookies: false }
  | {
      status: "complete";
      accessToken: string;
      refreshToken: string;
      nextPath: string;
      clearCookies: true;
    };

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function cookieBase() {
  return {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: X_HANDOFF_TTL_SECONDS,
  };
}

export function applyHandoffCookies(response: NextResponse, handoffId: string) {
  const base = cookieBase();
  response.cookies.set(X_HANDOFF_COOKIE, handoffId, {
    ...base,
    httpOnly: true,
  });
  response.cookies.set(X_HANDOFF_MARKER, "1", {
    ...base,
    httpOnly: false,
  });
}

export function clearHandoffCookies(response: NextResponse) {
  const base = { ...cookieBase(), maxAge: 0 };
  response.cookies.set(X_HANDOFF_COOKIE, "", {
    ...base,
    httpOnly: true,
  });
  response.cookies.set(X_HANDOFF_MARKER, "", {
    ...base,
    httpOnly: false,
  });
}

export function readHandoffCookie(request: NextRequest): string | null {
  const value = request.cookies.get(X_HANDOFF_COOKIE)?.value;
  return isHandoffId(value) ? value : null;
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function handoffJson(
  body: unknown,
  options: { status?: number; handoffId?: string; clearCookies?: boolean } = {}
) {
  const response = NextResponse.json(body, { status: options.status ?? 200 });
  if (options.clearCookies) clearHandoffCookies(response);
  if (options.handoffId) applyHandoffCookies(response, options.handoffId);
  return noStore(response);
}

function supabaseEnv():
  | { url: string; anonKey: string; serviceKey: string }
  | { error: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return { error: "Supabase URL or anon key is not set" };
  }
  if (!serviceKey) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY not set" };
  }
  return { url, anonKey, serviceKey };
}

function adminClient():
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string } {
  const env = supabaseEnv();
  if ("error" in env) return { ok: false, error: env.error };
  return {
    ok: true,
    client: createClient(env.url, env.serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }),
  };
}

function callbackUrl(request: NextRequest, handoffId: string): string {
  const origin = request.nextUrl.origin;
  const base =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
      ? `${origin}/auth/callback`
      : `${getSiteUrl()}/auth/callback`;
  const url = new URL(base);
  url.searchParams.set("handoff", handoffId);
  return url.toString();
}

function isSupabaseAuthorizeUrl(url: string, supabaseUrl: string): boolean {
  try {
    const parsed = new URL(url);
    const base = new URL(supabaseUrl);
    return (
      parsed.origin === base.origin &&
      parsed.pathname.endsWith("/authorize") &&
      parsed.searchParams.get("provider") === "x"
    );
  } catch {
    return false;
  }
}

function memoryStorage(store: Record<string, string>): MemoryStorage {
  return {
    getItem: (key) =>
      Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
}

function readVerifier(store: Record<string, string>, flowId: string | null): string | null {
  const slotKey = flowId
    ? `${STORAGE_KEY}-flow-${flowId}-code-verifier`
    : `${STORAGE_KEY}-code-verifier`;
  const raw = store[slotKey] ?? store[`${STORAGE_KEY}-code-verifier`];
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "string") return null;
    const verifier = parsed.split("/")[0];
    if (verifier.length < 43 || verifier.length > 256) return null;
    return verifier;
  } catch {
    return null;
  }
}

async function createAuthorizeUrl(redirectTo: string): Promise<
  | { authorizeUrl: string; codeVerifier: string; flowId: string | null }
  | { error: string }
> {
  const env = supabaseEnv();
  if ("error" in env) return env;

  const store: Record<string, string> = {};
  const supabase = createClient(env.url, env.anonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      skipAutoInitialize: true,
      storageKey: STORAGE_KEY,
      storage: memoryStorage(store),
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "x",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { error: "Could not start X login" };
  }
  if (!isSupabaseAuthorizeUrl(data.url, env.url)) {
    return { error: "Could not start X login" };
  }

  const flowId =
    typeof data.flowId === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(data.flowId)
      ? data.flowId
      : null;
  const codeVerifier = readVerifier(store, flowId);
  if (!codeVerifier) {
    return { error: "Could not start X login" };
  }

  return { authorizeUrl: data.url, codeVerifier, flowId };
}

function rowIsLive(row: HandoffRow): boolean {
  return new Date(row.expires_at).getTime() > Date.now();
}

async function deleteExpired(admin: SupabaseClient) {
  await admin
    .from("x_oauth_handoffs")
    .delete()
    .lt("expires_at", new Date().toISOString());
}

export async function prepareXHandoff(
  request: NextRequest,
  nextPath: string
): Promise<PrepareXHandoffResult> {
  const adminResult = adminClient();
  if (!adminResult.ok) {
    return { ok: false, status: 500, error: adminResult.error };
  }
  const admin = adminResult.client;

  const next = safeNextPath(nextPath).slice(0, 1024);
  await deleteExpired(admin);

  const existingId = readHandoffCookie(request);
  if (existingId) {
    const { data: existing } = await admin
      .from("x_oauth_handoffs")
      .select(
        "id, code_verifier, flow_id, authorize_url, next_path, status, access_token, refresh_token, expires_at"
      )
      .eq("id", existingId)
      .maybeSingle();

    const row = existing as HandoffRow | null;
    if (row && rowIsLive(row)) {
      if (row.next_path !== next) {
        await admin
          .from("x_oauth_handoffs")
          .update({ next_path: next })
          .eq("id", row.id);
      }

      if (row.status === "complete") {
        return { ok: true, kind: "waiting", handoffId: row.id };
      }

      const env = supabaseEnv();
      if (
        row.status === "pending" &&
        !("error" in env) &&
        isSupabaseAuthorizeUrl(row.authorize_url, env.url)
      ) {
        return {
          ok: true,
          kind: "authorize",
          handoffId: row.id,
          authorizeUrl: row.authorize_url,
        };
      }
    }
  }

  const handoffId = crypto.randomUUID();
  const created = await createAuthorizeUrl(callbackUrl(request, handoffId));
  if ("error" in created) {
    return { ok: false, status: 500, error: created.error };
  }

  const expiresAt = new Date(
    Date.now() + X_HANDOFF_TTL_SECONDS * 1000
  ).toISOString();

  const { error: insertError } = await admin.from("x_oauth_handoffs").insert({
    id: handoffId,
    code_verifier: created.codeVerifier,
    flow_id: created.flowId,
    authorize_url: created.authorizeUrl,
    next_path: next,
    status: "pending",
    expires_at: expiresAt,
  });

  if (insertError) {
    return { ok: false, status: 500, error: "Could not start X login" };
  }

  return {
    ok: true,
    kind: "authorize",
    handoffId,
    authorizeUrl: created.authorizeUrl,
  };
}

function verifierStore(codeVerifier: string, flowId: string | null) {
  const encoded = JSON.stringify(codeVerifier);
  const store: Record<string, string> = {
    [`${STORAGE_KEY}-code-verifier`]: encoded,
  };
  if (flowId) {
    store[`${STORAGE_KEY}-flow-${flowId}-code-verifier`] = encoded;
    store[`${STORAGE_KEY}-flows-code-verifier`] = JSON.stringify([flowId]);
  }
  return store;
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
  flowId: string | null
): Promise<
  | { accessToken: string; refreshToken: string }
  | { error: string }
> {
  const env = supabaseEnv();
  if ("error" in env) return env;

  const supabase = createClient(env.url, env.anonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      skipAutoInitialize: true,
      storageKey: STORAGE_KEY,
      storage: memoryStorage(verifierStore(codeVerifier, flowId)),
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined
  );

  const accessToken = data.session?.access_token;
  const refreshToken = data.session?.refresh_token;
  if (error || !accessToken || !refreshToken) {
    return { error: "Login failed. Go back and try again." };
  }

  return { accessToken, refreshToken };
}

async function loadHandoff(
  admin: SupabaseClient,
  handoffId: string
): Promise<HandoffRow | null> {
  const { data } = await admin
    .from("x_oauth_handoffs")
    .select(
      "id, code_verifier, flow_id, authorize_url, next_path, status, access_token, refresh_token, expires_at"
    )
    .eq("id", handoffId)
    .maybeSingle();
  return (data as HandoffRow | null) ?? null;
}

async function consumeSession(
  admin: SupabaseClient,
  handoffId: string
): Promise<
  | { accessToken: string; refreshToken: string; nextPath: string }
  | null
> {
  const { data } = await admin
    .from("x_oauth_handoffs")
    .delete()
    .eq("id", handoffId)
    .eq("status", "complete")
    .select("access_token, refresh_token, next_path")
    .maybeSingle();

  const row = data as {
    access_token: string | null;
    refresh_token: string | null;
    next_path: string | null;
  } | null;

  if (!row?.access_token || !row.refresh_token) return null;
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    nextPath: safeNextPath(row.next_path),
  };
}

export async function finishXHandoff(input: {
  handoffId: string;
  code: string;
  sameBrowser: boolean;
}): Promise<FinishXHandoffResult> {
  if (!isHandoffId(input.handoffId) || !/^[A-Za-z0-9._~-]{8,512}$/.test(input.code)) {
    return {
      ok: false,
      status: 400,
      error: "Login failed. Go back and try again.",
    };
  }

  const adminResult = adminClient();
  if (!adminResult.ok) {
    return { ok: false, status: 500, error: adminResult.error };
  }
  const admin = adminResult.client;

  const row = await loadHandoff(admin, input.handoffId);
  if (!row || !rowIsLive(row)) {
    if (row) {
      await admin.from("x_oauth_handoffs").delete().eq("id", row.id);
    }
    return {
      ok: false,
      status: 400,
      error: "Login failed. Go back and try again.",
    };
  }

  if (row.status === "complete") {
    if (!input.sameBrowser) return { ok: true, mode: "return" };
    const session = await consumeSession(admin, row.id);
    if (!session) {
      return {
        ok: false,
        status: 400,
        error: "Login failed. Go back and try again.",
      };
    }
    return { ok: true, mode: "session", ...session };
  }

  const exchanged = await exchangeCode(input.code, row.code_verifier, row.flow_id);
  if ("error" in exchanged) {
    const latest = await loadHandoff(admin, row.id);
    if (latest?.status === "complete") {
      if (!input.sameBrowser) return { ok: true, mode: "return" };
      const session = await consumeSession(admin, row.id);
      if (session) return { ok: true, mode: "session", ...session };
    }
    return { ok: false, status: 400, error: exchanged.error };
  }

  if (input.sameBrowser) {
    const { error: updateError } = await admin
      .from("x_oauth_handoffs")
      .update({
        status: "complete",
        access_token: exchanged.accessToken,
        refresh_token: exchanged.refreshToken,
      })
      .eq("id", row.id)
      .eq("status", "pending");

    if (updateError) {
      return {
        ok: false,
        status: 500,
        error: "Login failed. Go back and try again.",
      };
    }

    const session = await consumeSession(admin, row.id);
    if (session) return { ok: true, mode: "session", ...session };

    return {
      ok: true,
      mode: "session",
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
      nextPath: safeNextPath(row.next_path),
    };
  }

  const { data: saved } = await admin
    .from("x_oauth_handoffs")
    .update({
      status: "complete",
      access_token: exchanged.accessToken,
      refresh_token: exchanged.refreshToken,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!saved) {
    const latest = await loadHandoff(admin, row.id);
    if (latest?.status === "complete") return { ok: true, mode: "return" };
    return {
      ok: false,
      status: 400,
      error: "Login failed. Go back and try again.",
    };
  }

  return { ok: true, mode: "return" };
}

export async function pollXHandoff(
  request: NextRequest
): Promise<PollXHandoffResult> {
  const handoffId = readHandoffCookie(request);
  if (!handoffId) return { status: "idle", clearCookies: true };

  const adminResult = adminClient();
  if (!adminResult.ok) return { status: "pending", clearCookies: false };
  const admin = adminResult.client;

  const row = await loadHandoff(admin, handoffId);
  if (!row) return { status: "idle", clearCookies: true };

  if (!rowIsLive(row)) {
    await admin.from("x_oauth_handoffs").delete().eq("id", row.id);
    return { status: "idle", clearCookies: true };
  }

  if (row.status !== "complete" || !row.access_token || !row.refresh_token) {
    return { status: "pending", clearCookies: false };
  }

  const session = await consumeSession(admin, row.id);
  if (!session) return { status: "pending", clearCookies: false };

  return {
    status: "complete",
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    nextPath: session.nextPath,
    clearCookies: true,
  };
}
