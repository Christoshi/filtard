"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import {
  X_HANDOFF_CLEARED,
  X_HANDOFF_STARTED,
  applyHandedOffSession,
  clearXHandoffPending,
  hasXHandoffPending,
} from "@/lib/x-handoff-client";

const SKIP = new Set([
  "/auth/inapp/done",
  "/auth/inapp/return",
  "/auth/callback",
]);

export default function XHandoffPoller() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP.has(pathname)) return;
    if (!isPhoneUserAgent(navigator.userAgent)) return;

    let stopped = false;
    let finished = false;
    let timer: number | null = null;
    let inFlight = false;
    let idleSince = 0;

    const stopTimer = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const tick = async () => {
      if (stopped || finished || inFlight || !hasXHandoffPending()) return;
      inFlight = true;
      try {
        const res = await fetch("/auth/inapp/poll", {
          method: "POST",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          status?: string;
          access_token?: string;
          refresh_token?: string;
          next?: string;
        } | null;
        if (stopped || finished || !data) return;

        if (
          data.status === "complete" &&
          data.access_token &&
          data.refresh_token
        ) {
          finished = true;
          stopTimer();
          await applyHandedOffSession(router, {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            next: data.next,
          });
          return;
        }

        if (data.status === "none") {
          stopTimer();
          clearXHandoffPending();
          window.dispatchEvent(new Event(X_HANDOFF_CLEARED));
          return;
        }

        if (data.status === "idle") {
          if (idleSince === 0) idleSince = Date.now();
          if (Date.now() - idleSince >= 10 * 60 * 1000) {
            stopTimer();
            clearXHandoffPending();
            window.dispatchEvent(new Event(X_HANDOFF_CLEARED));
          }
          return;
        }

        idleSince = 0;
      } catch {
        // The tab may be backgrounded. The next tick tries again.
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if (stopped || finished || timer !== null || !hasXHandoffPending()) return;
      void tick();
      timer = window.setInterval(() => {
        void tick();
      }, 2500);
    };

    const onShow = () => {
      if (document.visibilityState === "visible") void tick();
    };

    start();
    window.addEventListener(X_HANDOFF_STARTED, start);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);

    return () => {
      stopped = true;
      stopTimer();
      window.removeEventListener(X_HANDOFF_STARTED, start);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, [pathname, router]);

  return null;
}
