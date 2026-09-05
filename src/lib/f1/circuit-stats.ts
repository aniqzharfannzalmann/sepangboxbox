import "server-only";

import {
  type CircuitRaceEntry,
  type CircuitResultRow,
  getCircuitFastestLaps,
  getCircuitPoles,
  getCircuitResults,
  getCircuitWinners,
} from "./jolpica";
import { lapTimeToSeconds } from "./time";
import type { WithOrigin } from "./types";

/**
 * Circuit character, computed from race history.
 *
 * Reference apps show Pirelli's 1-5 ratings for traction, downforce and so
 * on. That is licensed editorial data we cannot source, so instead of copying
 * it these are measured from results. They answer the same questions — can you
 * pass here, does pole decide the race, is it hard on cars — from evidence
 * rather than opinion.
 *
 * Measured over roughly the last twenty races at the circuit, not its whole
 * history: see getCircuitResults for why mixing eras destroys the signal. The
 * seasons covered travel with the profile, and the page states them, because
 * "Monaco 2007-2026" and "Sepang 1999-2017" are different claims.
 */

export interface CircuitRating {
  key: string;
  label: string;
  /** The measured value, in its own units. */
  value: number;
  /** Human-readable form of `value`. */
  display: string;
  /** 0–1, for the bar. */
  fraction: number;
  /** What the number means, in one line. */
  meaning: string;
}

export interface CircuitProfile {
  circuitId: string;
  racesHeld: number;
  firstSeason: string | null;
  lastSeason: string | null;
  winners: CircuitRaceEntry[];
  topDrivers: Array<{ id: string; name: string; count: number }>;
  topConstructors: Array<{ id: string; name: string; count: number }>;
  topPoleSitters: Array<{ id: string; name: string; count: number }>;
  lapRecord: {
    time: string;
    driverName: string;
    season: string;
  } | null;
  ratings: CircuitRating[];
  /** Rows the ratings were computed from. */
  sampleSize: number;
  /**
   * The seasons the ratings actually cover. Not the full history — see
   * getCircuitResults — and the page states it, because "Monaco 2007-2026"
   * and "Sepang 1999-2017" are different claims and a reader deserves both.
   */
  ratingSeasons: { from: string; to: string } | null;
  poleDataFrom: string | null;
}

function tally(
  entries: CircuitRaceEntry[],
  id: (e: CircuitRaceEntry) => string,
  name: (e: CircuitRaceEntry) => string,
): Array<{ id: string; name: string; count: number }> {
  const counts = new Map<string, { id: string; name: string; count: number }>();
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

/** Clamp to the 0–1 the bars expect. */
const frac = (value: number, max: number) =>
  Math.max(0, Math.min(1, value / max));

function computeRatings(rows: CircuitResultRow[]): CircuitRating[] {
  if (rows.length === 0) return [];

  const ratings: CircuitRating[] = [];

  // --- Overtaking -------------------------------------------------------
  // Mean places gained or lost between the grid and the flag, over cars that
  // finished. A start from the pit lane is grid 0 in Ergast and is dropped;
  // it would read as a twenty-place gain and flatter the circuit.
  const movers = rows.filter((r) => r.classified && r.gridPosition > 0);
  if (movers.length > 0) {
    const mean =
      movers.reduce(
        (sum, r) => sum + Math.abs(r.gridPosition - r.position),
        0,
      ) / movers.length;
    ratings.push({
      key: "overtaking",
      label: "Position change",
      value: mean,
      display: `${mean.toFixed(1)} places`,
      // Six places of average movement is a lot; treat it as the top of scale.
      fraction: frac(mean, 6),
      meaning: "Average places gained or lost between the grid and the flag",
    });
  }

  // --- Attrition --------------------------------------------------------
  const dnfs = rows.filter((r) => !r.classified).length;
  const attrition = dnfs / rows.length;
  ratings.push({
    key: "attrition",
    label: "Attrition",
    value: attrition,
    display: `${Math.round(attrition * 100)}%`,
    fraction: frac(attrition, 0.5),
    meaning: "Share of starts that did not reach the finish",
  });

  // --- Pole conversion --------------------------------------------------
  // How often the front of the grid converts into a win. High means track
  // position decides the race here.
  const poles = rows.filter((r) => r.gridPosition === 1);
  if (poles.length > 0) {
    const wins = poles.filter((r) => r.position === 1 && r.classified).length;
    const conversion = wins / poles.length;
    ratings.push({
      key: "pole-conversion",
      label: "Pole converts",
      value: conversion,
      display: `${Math.round(conversion * 100)}%`,
      fraction: conversion,
      meaning: "How often pole position turns into a win",
    });
  }

  // --- Front-row lockout of the podium -----------------------------------
  // A proxy for how much the grid dictates the result beyond the win alone.
  const podium = rows.filter((r) => r.classified && r.position <= 3);
  if (podium.length > 0) {
    const fromTopThree = podium.filter(
      (r) => r.gridPosition > 0 && r.gridPosition <= 3,
    ).length;
    const grid_decides = fromTopThree / podium.length;
    ratings.push({
      key: "grid-decides",
      label: "Grid holds",
      value: grid_decides,
      display: `${Math.round(grid_decides * 100)}%`,
      fraction: grid_decides,
      meaning: "Share of podiums that started inside the top three",
    });
  }

  return ratings;
}

export async function getCircuitProfile(
  circuitId: string,
): Promise<WithOrigin<CircuitProfile | null>> {
  const fetchedAtMs = Date.now();

  try {
    const [winnersR, polesR, fastestR, rowsR] = await Promise.allSettled([
      getCircuitWinners(circuitId),
      getCircuitPoles(circuitId),
      getCircuitFastestLaps(circuitId),
      getCircuitResults(circuitId),
    ]);

    if (winnersR.status === "rejected") throw winnersR.reason;
    const winners = winnersR.value;

    // A circuit on the calendar for the first time has no history at all.
    // That is a real state, not a failure — the caller renders it as such.
    if (winners.length === 0) {
      return {
        data: {
          circuitId,
          racesHeld: 0,
          firstSeason: null,
          lastSeason: null,
          winners: [],
          topDrivers: [],
          topConstructors: [],
          topPoleSitters: [],
          lapRecord: null,
          ratings: [],
          sampleSize: 0,
          ratingSeasons: null,
          poleDataFrom: null,
        },
        origin: "live",
        fetchedAtMs,
      };
    }

    const poles = polesR.status === "fulfilled" ? polesR.value : [];
    const fastest = fastestR.status === "fulfilled" ? fastestR.value : [];
    const rows = rowsR.status === "fulfilled" ? rowsR.value : [];

    let lapRecord: CircuitProfile["lapRecord"] = null;
    for (const entry of fastest) {
      const seconds = lapTimeToSeconds(entry.time);
      if (seconds === null || !entry.time) continue;
      const bestSoFar = lapRecord ? lapTimeToSeconds(lapRecord.time) : null;
      if (bestSoFar === null || seconds < bestSoFar) {
        lapRecord = {
          time: entry.time,
          driverName: entry.driverName,
          season: entry.season,
        };
      }
    }

    return {
      data: {
        circuitId,
        racesHeld: winners.length,
        firstSeason: winners[0]?.season ?? null,
        lastSeason: winners.at(-1)?.season ?? null,
        winners,
        // Keyed on ids: a circuit won by two drivers who share a surname must
        // not merge them into one.
        topDrivers: tally(winners, (e) => e.driverId, (e) => e.driverName),
        topConstructors: tally(
          winners,
          (e) => e.constructorId,
          (e) => e.constructorName,
        ),
        topPoleSitters: tally(poles, (e) => e.driverId, (e) => e.driverName),
        lapRecord,
        ratings: computeRatings(rows),
        sampleSize: rows.length,
        ratingSeasons: rows.length
          ? {
              from: rows.reduce((a, r) => (r.season < a ? r.season : a), rows[0].season),
              to: rows.reduce((a, r) => (r.season > a ? r.season : a), rows[0].season),
            }
          : null,
        poleDataFrom: poles[0]?.season ?? null,
      },
      origin: "live",
      fetchedAtMs,
    };
  } catch (error) {
    console.error(`[circuit-stats] ${circuitId} unavailable:`, error);
    return {
      data: null,
      origin: "fallback",
      reason: "Circuit history is temporarily unavailable.",
      fetchedAtMs,
    };
  }
}
