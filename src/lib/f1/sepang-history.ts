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

    // The 2026 running appears in the circuit's race list but has no result
    // yet, so it never reaches here — the winners query only returns finished
    // races. Guard anyway: a future season must not become a "winner".
    const winners = winnersResult.value.filter(
      (w) => Number(w.season) < Number(LAST_SEPANG_RACE.season) + 1,
    );
    const poles = polesResult.status === "fulfilled" ? polesResult.value : [];
    const fastest =
      fastestResult.status === "fulfilled" ? fastestResult.value : [];

    return {
      data: {
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
        lastRace:
          lastRaceResult.status === "fulfilled" ? lastRaceResult.value : null,
      },
      origin: "live",
      fetchedAtMs,
    };
  } catch (error) {
    console.error("[sepang-history] unavailable:", error);
    return {
      data: {
        winners: [],
        poles: [],
        driverWins: [],
        constructorWins: [],
        driverPoles: [],
        lapRecord: null,
        coverage: { races: 0, poles: 0, fastestLaps: 0 },
        lastRace: null,
      },
      origin: "fallback",
      reason:
        "Sepang's race history is temporarily unavailable. Please try again shortly.",
      fetchedAtMs,
    };
  }
}
