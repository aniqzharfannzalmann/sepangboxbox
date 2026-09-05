"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { countdownFrom, pad2 } from "@/lib/f1/time";

/*
 * A shared one-second clock.
 *
 * The clock is an external mutable source, so useSyncExternalStore is the
 * primitive React provides for it — not useState + useEffect, which sets state
 * during the effect and triggers a cascading render on mount.
 *
 * Two things fall out of this for free:
 *   - getServerSnapshot returns null, so SSR and the first client render both
 *     produce the skeleton. No hydration mismatch, no layout shift.
 *   - Every countdown on the page shares one interval, and it stops entirely
 *     when the last one unmounts.
 */

let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (timer === null) {
    tick = Date.now();
    timer = setInterval(() => {
      tick = Date.now();
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// Must return a cached value, not a fresh Date.now(), or React re-renders forever.
const getSnapshot = (): number | null => (tick === 0 ? Date.now() : tick);
const getServerSnapshot = (): number | null => null;

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-xxxs">
      <span className="text-display-lg tnum text-ink">{value}</span>
      <span className="label-caps text-muted">{label}</span>
    </div>
  );
}

export function Countdown({
  targetIso,
  className,
}: {
  targetIso: string;
  className?: string;
}) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const c = now === null ? null : countdownFrom(targetIso, now);

  return (
    <div
      /*
       * Wraps, and sits closer together below sm.
       *
       * Four units at a 48px gap need about 324px, against roughly 288px of
       * content width on a 320px phone — so this was pushing the whole page
       * sideways. gap-lg returns from sm: up, leaving every larger screen
       * exactly as it was.
       */
      className={cn("flex flex-wrap gap-sm sm:gap-lg", className)}
      // The value changes every second; announcing it would be hostile.
      aria-live="off"
    >
      <Unit value={c ? String(c.days) : "–"} label="Days" />
      <Unit value={c ? pad2(c.hours) : "––"} label="Hrs" />
      <Unit value={c ? pad2(c.minutes) : "––"} label="Min" />
      <Unit value={c ? pad2(c.seconds) : "––"} label="Sec" />
    </div>
  );
}
