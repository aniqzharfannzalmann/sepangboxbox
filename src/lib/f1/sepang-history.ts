import "server-only";

import {
  type CircuitRaceEntry,
  HISTORY_REVALIDATE_SECONDS,
  getCircuitFastestLaps,
  getCircuitPoles,
  getCircuitWinners,
  getRaceResult,
} from "./jolpica";
import { lapTimeToSeconds } from "./time";
import type { RaceResult, WithOrigin } from "./types";
import snapshot from "./sepang-history.static.json";

/**
 * The committed record, used when the live query fails.
 *
 * Cast because JSON widens the literal types: the file is generated from the
 * same endpoints by `npm run snapshot:sepang`, and the script refuses to write
 * one without winners.
 */
const SNAPSHOT = snapshot as unknown as {
  winners: CircuitRaceEntry[];
  poles: CircuitRaceEntry[];
  fastest: CircuitRaceEntry[];
  lastRace: RaceResult | null;
};

/**
 * Sepang's Formula 1 history, 1999–2017.
 *
 * The circuit held nineteen Malaysian Grands Prix before F1 left after 2017,
 * and all of it is in Jolpica for free. It is the one thing this app can show
 * that a generic F1 companion will not, and it is what gives the 2026 return
 * its weight.
 *
 * The data is immutable, so it is cached for a day upstream — this page costs
 * almost nothing against the request budget.
 */

export const SEPANG_CIRCUIT_ID = "sepang";

/** The last time F1 raced here before the 2026 return. */
export const LAST_SEPANG_RACE = { season: "2017", round: "15" } as const;

export interface TallyEntry {
  id: string;
  name: string;
  count: number;
}

export interface LapRecord {
  time: string;
  seconds: number;
  driverName: string;
  season: string;
}

export interface SepangHistory {
  /** Every completed Malaysian GP, oldest first. Excludes 2026. */
  winners: CircuitRaceEntry[];
  poles: CircuitRaceEntry[];
  driverWins: TallyEntry[];
  constructorWins: TallyEntry[];
  driverPoles: TallyEntry[];
  lapRecord: LapRecord | null;
  /** How many of the nineteen races have pole and fastest-lap data. */
  coverage: { races: number; poles: number; fastestLaps: number };
  lastRace: RaceResult | null;
}

/**
 * Counts by id, never by name.
 *
 * Sepang has been won by Michael Schumacher (2000, 2001, 2004) and by Ralf
 * Schumacher (2002). Keying on family name merges them into a single
 * four-time winner who never existed, and the page would state it as fact.
 */
function tally(
  entries: CircuitRaceEntry[],
  id: (e: CircuitRaceEntry) => string,
  name: (e: CircuitRaceEntry) => string,
): TallyEntry[] {
  const counts = new Map<string, TallyEntry>();
  for (const entry of entries) {
    const key = id(entry);
    const held = counts.get(key);
    if (held) held.count += 1;
    else counts.set(key, { id: key, name: name(entry), count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

function fastestOf(entries: CircuitRaceEntry[]): LapRecord | null {
  let best: LapRecord | null = null;
  for (const entry of entries) {
    const seconds = lapTimeToSeconds(entry.time);
    if (seconds === null || !entry.time) continue;
    if (!best || seconds < best.seconds) {
      best = {
        time: entry.time,
        seconds,
        driverName: entry.driverName,
        season: entry.season,
      };
    }
  }
  return best;
}

/**
 * Assemble the page's data from the four raw inputs.
 *
 * Shared by the live path and the committed snapshot so the two cannot drift:
 * the tallies and the lap record are derived here once, and the snapshot only
 * ever stores what came off the wire.
 */
function assemble(
  rawWinners: CircuitRaceEntry[],
  poles: CircuitRaceEntry[],
  fastest: CircuitRaceEntry[],
  lastRace: RaceResult | null,
): SepangHistory {
  // The 2026 running appears in the circuit's race list but has no result
  // yet, so it never reaches here — the winners query only returns finished
  // races. Guard anyway: a future season must not become a "winner".
  const winners = rawWinners.filter(
    (w) => Number(w.season) < Number(LAST_SEPANG_RACE.season) + 1,
  );

  return {
    winners,
    poles,
    driverWins: tally(winners, (e) => e.driverId, (e) => e.driverName),
    constructorWins: tally(
      winners,
      (e) => e.constructorId,
      (e) => e.constructorName,
    ),
    driverPoles: tally(poles, (e) => e.driverId, (e) => e.driverName),
    lapRecord: fastestOf(fastest),
    coverage: {
      races: winners.length,
      poles: poles.length,
      fastestLaps: fastest.length,
    },
    lastRace,
  };
}

export async function getSepangHistory(): Promise<WithOrigin<SepangHistory>> {
  const fetchedAtMs = Date.now();

  try {
    // Poles and fastest laps are sparser than winners and the last race may
    // fail on its own, so each is settled independently — one gap should not
    // cost the whole page.
    const [winnersResult, polesResult, fastestResult, lastRaceResult] =
      await Promise.allSettled([
        getCircuitWinners(SEPANG_CIRCUIT_ID),
        getCircuitPoles(SEPANG_CIRCUIT_ID),
        getCircuitFastestLaps(SEPANG_CIRCUIT_ID),
        getRaceResult(
          LAST_SEPANG_RACE.season,
          LAST_SEPANG_RACE.round,
          HISTORY_REVALIDATE_SECONDS,
        ),
      ]);

    if (winnersResult.status === "rejected") throw winnersResult.reason;

    return {
      data: assemble(
        winnersResult.value,
        polesResult.status === "fulfilled" ? polesResult.value : [],
        fastestResult.status === "fulfilled" ? fastestResult.value : [],
        lastRaceResult.status === "fulfilled" ? lastRaceResult.value : null,
      ),
      origin: "live",
      fetchedAtMs,
    };
  } catch (error) {
    /*
     * Fall back to the committed snapshot rather than to nothing.
     *
     * This used to return empty arrays, which blanked the page — and because
     * /sepang is prerendered, one transient Jolpica failure during a Vercel
     * build got that empty state baked into a static page and served from
     * cache. That is what happened on the first deploy.
     *
     * The snapshot is not a workaround. Sepang's nineteenth and last Grand
     * Prix was in 2017 and its twentieth is in October 2026, so this data is
     * finished; committing it is the same argument that already justifies
     * season.static.json. Regenerate with `npm run snapshot:sepang`.
     */
    console.error("[sepang-history] live query failed, using snapshot:", error);

    return {
      data: assemble(
        SNAPSHOT.winners,
        SNAPSHOT.poles,
        SNAPSHOT.fastest,
        SNAPSHOT.lastRace,
      ),
      origin: "fallback",
      reason:
        "Live timing data is unavailable, so this is the committed record of " +
        "Sepang's races. It is complete through 2017.",
      fetchedAtMs,
    };
  }
}
