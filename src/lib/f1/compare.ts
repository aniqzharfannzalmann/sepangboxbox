import "server-only";

import {
  SEPANG,
  getDriverSeasonResults,
  summariseDriverSeason,
} from "./jolpica";
import { getDriverStandingsSafe } from "./standings";
import type { Driver, DriverSeasonStats, WithOrigin } from "./types";

/**
 * Head-to-head season stats for two drivers.
 *
 * The driver list is taken from the standings response the app already
 * fetches, rather than from /drivers.json — same data, one fewer endpoint, and
 * it arrives already ordered by championship position, which is the order a
 * picker should offer.
 */

export interface DriverOption {
  id: string;
  name: string;
  constructorNames: string[];
  position: number;
}

export interface ComparePayload {
  options: DriverOption[];
  left: DriverSeasonStats | null;
  right: DriverSeasonStats | null;
}

export async function getDriverOptions(): Promise<WithOrigin<DriverOption[]>> {
  const standings = await getDriverStandingsSafe();
  if (!standings.data) {
    return {
      data: [],
      origin: "fallback",
      reason: "The driver list is temporarily unavailable.",
      fetchedAtMs: standings.fetchedAtMs,
    };
  }

  return {
    data: standings.data.entries.map((entry) => ({
      id: entry.driver.id,
      name: entry.driver.fullName,
      constructorNames: entry.constructors.map((c) => c.name),
      position: entry.position,
    })),
    origin: "live",
    fetchedAtMs: standings.fetchedAtMs,
  };
}

/**
 * Null when the driver has no results this season, or the request failed.
 * Both cases render the same way — there is nothing to compare — so they are
 * not distinguished here.
 */
export async function getDriverStats(
  driverId: string,
  driver: Driver | null,
  constructorNames: string[],
  /**
   * Championship points from the standings table.
   *
   * Summing the race results instead would silently undercount: the per-driver
   * results endpoint returns races only, so every sprint point goes missing
   * (Antonelli reads 216 there against an official 242). The standings figure
   * is the authoritative one and is what /standings shows, so /compare uses it
   * and cannot drift from that page.
   */
  championshipPoints: number,
): Promise<DriverSeasonStats | null> {
  try {
    const entries = await getDriverSeasonResults(SEPANG.season, driverId);
    if (entries.length === 0) return null;

    // The standings response carries the full Driver record; fall back to a
    // minimal one built from the id if a driver is somehow absent from it.
    const resolved: Driver = driver ?? {
      id: driverId,
      code: null,
      permanentNumber: null,
      givenName: "",
      familyName: driverId,
      fullName: driverId,
      nationality: "",
      url: "",
    };

    return {
      ...summariseDriverSeason(resolved, constructorNames, entries),
      points: championshipPoints,
    };
  } catch {
    return null;
  }
}
