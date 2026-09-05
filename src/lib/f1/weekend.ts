import "server-only";

import { SEPANG, getSeasonSchedule } from "./jolpica";
import seasonSnapshot from "./season.static.json";
import type { RaceWeekend, WithOrigin } from "./types";

/**
 * The season calendar, guaranteed.
 *
 * The schedule is the most important thing this app shows during a race week,
 * and the published times barely move — so the whole calendar is committed to
 * the repository. If Jolpica is unreachable, rate-limited, or slow at exactly
 * the wrong moment, every page still renders the right times; it just says so.
 *
 * This used to cover the Sepang weekend alone. Now that the app follows
 * whichever race is next, any round can be the one a reader needs, so all of
 * them are snapshotted.
 *
 * Regenerate with `npm run snapshot:season`.
 */
const SNAPSHOT = seasonSnapshot as RaceWeekend[];

export async function getSeasonScheduleSafe(): Promise<
  WithOrigin<RaceWeekend[]>
> {
  const fetchedAtMs = Date.now();

  try {
    const data = await getSeasonSchedule();
    // A well-formed response for the wrong season is still the wrong data.
    if (data.length === 0 || data[0]?.season !== SNAPSHOT[0]?.season) {
      return {
        data: SNAPSHOT,
        origin: "fallback",
        reason: "Schedule feed returned an unexpected season.",
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

/** The last thing that happens at a weekend — usually the race. */
function endOfWeekend(weekend: RaceWeekend): number {
  const ends = weekend.sessions.map((s) => new Date(s.endsAtIso).getTime());
  return ends.length ? Math.max(...ends) : 0;
}

export interface ActiveWeekend {
  /** The weekend in progress, or the next one still to come. */
  weekend: RaceWeekend;
  /** Rounds that have not finished, in order, including `weekend`. */
  upcoming: RaceWeekend[];
  /** The Sepang round, whenever it falls — this app is named for it. */
  sepang: RaceWeekend | null;
  /** True once every round has been run. */
  seasonOver: boolean;
}

/**
 * Which weekend the app should be pointed at.
 *
 * The app follows whatever race is next rather than a fixed round: Sepang is
 * round 16 and would leave every page stale for the eleven rounds around it,
 * and dead once it has been run. Sepang keeps a highlight of its own instead.
 *
 * Falls back to the final round when the season is over, so the pages have
 * something coherent to render rather than nothing.
 */
export function pickActiveWeekend(
  races: RaceWeekend[],
  nowMs: number,
): ActiveWeekend {
  const upcoming = races.filter((r) => endOfWeekend(r) > nowMs);
  const sepang = races.find((r) => r.circuitId === SEPANG.circuitId) ?? null;

  return {
    weekend: upcoming[0] ?? races[races.length - 1],
    upcoming,
    sepang,
    seasonOver: upcoming.length === 0,
  };
}

export async function getActiveWeekend(): Promise<WithOrigin<ActiveWeekend>> {
  const season = await getSeasonScheduleSafe();
  return {
    data: pickActiveWeekend(season.data, season.fetchedAtMs),
    origin: season.origin,
    reason: season.reason,
    fetchedAtMs: season.fetchedAtMs,
  };
}
