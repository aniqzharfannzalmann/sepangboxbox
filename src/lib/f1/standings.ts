import "server-only";

import { getConstructorStandings, getDriverStandings } from "./jolpica";
import type {
  ConstructorStanding,
  DriverStanding,
  StandingsSnapshot,
  WithOrigin,
} from "./types";

/**
 * Standings have no committed fallback on purpose. Unlike the schedule they
 * change through the season, so a stale snapshot would be actively wrong —
 * and wrong championship points are worse than an honest "unavailable".
 * Callers render the failure state instead.
 */

export type StandingsResult<T> = WithOrigin<StandingsSnapshot<T> | null>;

export async function getDriverStandingsSafe(): Promise<
  StandingsResult<DriverStanding>
> {
  const fetchedAtMs = Date.now();
  try {
    return { data: await getDriverStandings(), origin: "live", fetchedAtMs };
  } catch {
    return {
      data: null,
      origin: "fallback",
      reason: "Driver standings are temporarily unavailable.",
      fetchedAtMs,
    };
  }
}

export async function getConstructorStandingsSafe(): Promise<
  StandingsResult<ConstructorStanding>
> {
  const fetchedAtMs = Date.now();
  try {
    return { data: await getConstructorStandings(), origin: "live", fetchedAtMs };
  } catch {
    return {
      data: null,
      origin: "fallback",
      reason: "Constructor standings are temporarily unavailable.",
      fetchedAtMs,
    };
  }
}
