import { getCurrentUser, supabase } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-next";
import { isXAuthorizeUrl } from "@/lib/x-authorize-url";

const FLAG = "filtard_x_handoff";
const URL_KEY = "filtard_x_authorize_url";

export const X_HANDOFF_STARTED = "filtard-x-handoff-started";
export const X_HANDOFF_CLEARED = "filtard-x-handoff-cleared";

let pending = false;
let sessionPromise: Promise<HandedSession | null> | null = null;

type HandedSession = {
  access_token: string;
  refresh_token: string;
  next?: string | null;
};

type NextRouter = {
  replace: (href: string) => void;
  refresh: () => void;
};

export function markXHandoffPending(authorizeUrl?: string) {
  pending = true;
  sessionPromise = null;
  try {
    sessionStorage.setItem(FLAG, "1");
    if (authorizeUrl) sessionStorage.setItem(URL_KEY, authorizeUrl);
  } catch {
    // Private mode can block sessionStorage. The in-memory flag still covers
    // this page view. A reload will not be able to resume the handoff.
  }
  window.dispatchEvent(new Event(X_HANDOFF_STARTED));
}

export function clearXHandoffPending() {
  pending = false;
  try {
    sessionStorage.removeItem(FLAG);
    sessionStorage.removeItem(URL_KEY);
  } catch {
    // ignore
  }
}

export function hasXHandoffPending(): boolean {
  if (pending) return true;
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export function readStoredAuthorizeUrl(): string | null {
  try {
    const stored = sessionStorage.getItem(URL_KEY);
    if (stored && isXAuthorizeUrl(stored)) return stored;
  } catch {
    // ignore
  }
  return null;
}

export function loadHandedOffSession(): Promise<HandedSession | null> {
  if (!sessionPromise) {
    sessionPromise = fetch("/auth/inapp/session", {
      method: "POST",
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as HandedSession | null;
        if (!res.ok || !data?.access_token || !data.refresh_token) return null;
        return data;
      })
      .catch(() => null);
  }
  return sessionPromise;
}

export async function applyHandedOffSession(
  router: NextRouter,
  session: HandedSession
): Promise<boolean> {
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) return false;

  clearXHandoffPending();
  const next = safeNextPath(session.next);
  const user = await getCurrentUser();
  if (user && !user.display_name) {
    router.replace(`/setup-username?redirect=${encodeURIComponent(next)}`);
  } else {
    router.replace(next);
  }
  router.refresh();
  return true;
}
