import { getCurrentUser, supabase } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-next";

export async function completeHandoffLogin(input: {
  accessToken: string;
  refreshToken: string;
  nextPath?: string | null;
}) {
  const { error } = await supabase.auth.setSession({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  });
  if (error) return false;

  const next = safeNextPath(input.nextPath);
  const user = await getCurrentUser();
  if (user && !user.display_name) {
    window.location.assign(
      `/setup-username?redirect=${encodeURIComponent(next)}`
    );
    return true;
  }

  window.location.assign(next);
  return true;
}
