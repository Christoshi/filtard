"use client";

import { useEffect } from "react";
import { completeHandoffLogin } from "@/lib/complete-handoff-login";
import { isPhoneUserAgent } from "@/lib/phone-ua";
import {
  X_HANDOFF_EVENT,
  X_HANDOFF_MARKER,
  X_HANDOFF_POLL_MS,
} from "@/lib/x-handoff";

function markerPresent(): boolean {
  return document.cookie
    .split("; ")
    .some((part) => part.startsWith(`${X_HANDOFF_MARKER}=`));
}

export default function XHandoffPoller() {
  useEffect(() => {
    if (!isPhoneUserAgent(navigator.userAgent)) return;

    let stopped = false;
    let inFlight = false;

    async function tick() {
      if (stopped || inFlight) return;
      if (!markerPresent()) return;

      inFlight = true;
      try {
        const response = await fetch("/auth/inapp/poll", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;

        const body = (await response.json()) as {
          status?: string;
          access_token?: string;
          refresh_token?: string;
          next?: string;
        };

        if (
          body.status === "complete" &&
          body.access_token &&
          body.refresh_token
        ) {
          stopped = true;
          await completeHandoffLogin({
            accessToken: body.access_token,
            refreshToken: body.refresh_token,
            nextPath: body.next,
          });
        }
      } catch {
        // A dropped poll is retried on the next interval.
      } finally {
        inFlight = false;
      }
    }

    void tick();
    const intervalId = window.setInterval(() => {
      void tick();
    }, X_HANDOFF_POLL_MS);

    const onWake = () => {
      void tick();
    };

    window.addEventListener(X_HANDOFF_EVENT, onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      window.removeEventListener(X_HANDOFF_EVENT, onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return null;
}
