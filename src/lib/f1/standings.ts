import "server-only";

import { gatewayConstructorStandings, gatewayDriverStandings } from "./gateway";
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
    const gateway = await gatewayDriverStandings();
    const data = gateway.data;
    if (!data) throw new Error(gateway.warnings[0] ?? "Driver standings unavailable");
    if (!data.season || data.entries.length === 0) throw new Error("Empty driver standings");
    return { data, origin: "live", fetchedAtMs };
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
    const gateway = await gatewayConstructorStandings();
    const data = gateway.data;
    if (!data) throw new Error(gateway.warnings[0] ?? "Constructor standings unavailable");
    if (!data.season || data.entries.length === 0) throw new Error("Empty constructor standings");
    return { data, origin: "live", fetchedAtMs };
  } catch {
    return {
      data: null,
      origin: "fallback",
      reason: "Constructor standings are temporarily unavailable.",
      fetchedAtMs,
    };
  }
}
