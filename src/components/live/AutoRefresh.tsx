"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches the live page on an interval while a session is under way.
 *
 * The app calls itself a realtime companion, but the page is server-rendered
 * with ISR — without this a fan watching qualifying end would sit on a stale
 * table until they thought to reload.
 *
 * router.refresh() re-runs the Server Components and merges the new payload,
 * keeping scroll position and client state. It does not clear the server-side
 * fetch cache, so this only produces new rows because the timing calls in
 * jolpica.ts use a 60s window — refreshing faster than that would just re-render
 * identical data.
 *
 * Two deliberate limits:
 *   - It only mounts while a session is live or provisional. Polling around the
 *     clock would burn the Jolpica budget to watch nothing change.
 *   - It pauses when the tab is hidden. Most people at Sepang are on mobile
 *     data with a phone in their pocket between sessions.
 */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer === null) timer = setInterval(() => router.refresh(), intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Catch up on whatever was missed while the tab was backgrounded.
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
