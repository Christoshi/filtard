import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = "user" | "curator" | "admin" | "super_admin";

const AUTH_NEXT_KEY = "auth_next";

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

function getOAuthCallbackUrl() {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return `${origin}/auth/callback`;
    }
  }

  return `${getSiteUrl()}/auth/callback`;
}

function storeAuthNext(redirectTo?: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_NEXT_KEY, safeNextPath(redirectTo || "/"));
}

export function readAuthNext(): string {
  if (typeof window === "undefined") return "/";
  const stored = sessionStorage.getItem(AUTH_NEXT_KEY);
  sessionStorage.removeItem(AUTH_NEXT_KEY);
  return safeNextPath(stored);
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    role: (profile?.role as UserRole) || "user",
    display_name: profile?.display_name || null,
    avatar_url: profile?.avatar_url || null,
  };
}

export async function signInWithGoogle(redirectTo?: string) {
  storeAuthNext(redirectTo);
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthCallbackUrl(),
    },
  });
}

export async function signInWithX(redirectTo?: string) {
  storeAuthNext(redirectTo);
  return await supabase.auth.signInWithOAuth({
    provider: "x",
    options: {
      redirectTo: getOAuthCallbackUrl(),
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}