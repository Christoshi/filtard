import { supabase } from "@/lib/supabase";

export { supabase };

export type UserRole = "user" | "curator" | "admin" | "super_admin";

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
  const next = redirectTo || "/";
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
}

export async function signInWithX(redirectTo?: string) {
  const next = redirectTo || "/";
  return await supabase.auth.signInWithOAuth({
    provider: "x",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}