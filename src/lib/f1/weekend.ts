import "server-only";

import { SEPANG, getRaceWeekend, getSeasonSchedule } from "./jolpica";
import sepangSnapshot from "./sepang.static.json";
import type { RaceWeekend, WithOrigin } from "./types";

/**
 * The Sepang weekend, guaranteed.
 *
 * The schedule is the single most important thing this app shows during race
 * week, and it is also completely fixed — so a snapshot of it is committed to
 * the repository. If Jolpica is unreachable, rate-limited, or slow at exactly
 * the wrong moment, the page still renders the right times; it just says so.
 *
 * Regenerate the snapshot with `npm run snapshot:sepang`.
 */
const SNAPSHOT = sepangSnapshot as RaceWeekend;

export async function getSepangWeekend(): Promise<WithOrigin<RaceWeekend>> {
  const fetchedAtMs = Date.now();
  try {
    const data = await getRaceWeekend(SEPANG.season, SEPANG.round);
    // Guard against a well-formed response for the wrong race.
    if (data.circuitId !== SNAPSHOT.circuitId) {
      return {
        data: SNAPSHOT,
        origin: "fallback",
        reason: "Schedule feed returned an unexpected circuit",
        fetchedAtMs,
      };
    }
    return { data, origin: "live", fetchedAtMs };
  } catch (error) {
    // The cause belongs in the server log, not in front of a fan at the
    // circuit — they need the session times, not an endpoint path.
    console.error("[schedule] falling back to committed snapshot:", error);
    return {
      data: SNAPSHOT,
      origin: "fallback",
      reason:
        "Live schedule feed is unavailable — showing the published session times.",
      fetchedAtMs,
    };
  }
}

/**
 * Full season calendar. There is no snapshot for this one: it is supporting
 * context rather than race-critical, so an empty list and an honest message
 * beats shipping a stale copy of 23 rounds.
 */
export async function getSeasonScheduleSafe(): Promise<
  WithOrigin<RaceWeekend[]>
> {
  const fetchedAtMs = Date.now();
  try {
    return { data: await getSeasonSchedule(), origin: "live", fetchedAtMs };
  } catch {
    return {
      data: [],
      origin: "fallback",
      reason: "Season calendar is temporarily unavailable.",
      fetchedAtMs,
    };
  }
}
