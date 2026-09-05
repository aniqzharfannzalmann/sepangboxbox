import "server-only";

import { JolpicaTimingSource } from "./jolpica.source";
import type { LiveTimingSource } from "./types";

/**
 * Picks the timing source for this deployment.
 *
 * There is one, and by decision there will be one: second-by-second timing is
 * only sold, and this project is a zero-cost build. The OpenF1 adapter that
 * used to sit behind an API-key check has been removed rather than left
 * dormant — it had never once run against the real API, so keeping it would
 * have meant an untested integration one environment variable away from
 * production on a race weekend.
 *
 * The seam stays. `LiveTimingSource` costs nothing to keep, it is what lets
 * the live view render without knowing where its numbers come from, and if a
 * free source ever appears this is the one function that has to change. Git
 * history has the OpenF1 implementation if it is ever wanted back.
 */
export function getTimingSource(): LiveTimingSource {
  return new JolpicaTimingSource();
}

export type { LiveTimingSource, SourceCapabilities } from "./types";
