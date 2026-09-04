import "server-only";

import { JolpicaTimingSource } from "./jolpica.source";
import { OpenF1TimingSource } from "./openf1.source";
import type { LiveTimingSource } from "./types";

/**
 * Picks the timing source for this deployment.
 *
 * This one function is the whole payoff of the adapter: buying OpenF1 live
 * access is setting OPENF1_API_KEY and shipping openf1.source.ts. Nothing in
 * the UI changes, because nothing in the UI knows which source it is drawing.
 *
 * Until that key exists there is only one source, and the free tier is not a
 * fallback for it — while any F1 session is running anywhere in the world,
 * OpenF1 returns 401 to unauthenticated callers for every endpoint including
 * historical ones. There is nothing to degrade to.
 */
export function getTimingSource(): LiveTimingSource {
  const key = process.env.OPENF1_API_KEY;
  if (key) return new OpenF1TimingSource(key);
  return new JolpicaTimingSource();
}

export function hasLiveAccess(): boolean {
  return Boolean(process.env.OPENF1_API_KEY);
}

export type { LiveTimingSource, SourceCapabilities } from "./types";
