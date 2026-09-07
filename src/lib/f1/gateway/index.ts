import "server-only";

import {
  getConstructorStandings,
  getDriverStandings,
  getQualifyingResult,
  getRaceResult,
  getRaceWeekend,
  getSeasonSchedule,
  getSprintResult,
} from "../jolpica";
import { getSepangWeatherNow } from "../weather";
import type {
  QualifyingResult,
  RaceResult,
  RaceWeekend,
  Weather,
} from "../types";
import type { GatewayResult } from "./types";
import { complete, unavailable } from "./types";

export const GATEWAY_SOURCE = "jolpica-gateway";

async function guarded<T>(operation: string, action: () => Promise<T | null>): Promise<GatewayResult<T>> {
  const fetchedAtMs = Date.now();
  try {
    const data = await action();
    if (data === null) return unavailable(GATEWAY_SOURCE, `${operation} returned no data.`, fetchedAtMs);
    return complete(data, GATEWAY_SOURCE, fetchedAtMs);
  } catch (error) {
    console.error(`[gateway] ${operation} unavailable:`, error);
    return unavailable(GATEWAY_SOURCE, `${operation} is temporarily unavailable.`, fetchedAtMs);
  }
}

export function gatewaySeasonSchedule(): Promise<GatewayResult<RaceWeekend[]>> {
  return guarded("Season schedule", async () => {
    const data = await getSeasonSchedule();
    return data.length > 0 ? data : null;
  });
}

export function gatewayRaceWeekend(season: string, round: string): Promise<GatewayResult<RaceWeekend>> {
  return guarded("Race weekend", async () => getRaceWeekend(season, round));
}

export function gatewayDriverStandings(): Promise<GatewayResult<ReturnType<typeof getDriverStandings> extends Promise<infer T> ? T : never>> {
  return guarded("Driver standings", getDriverStandings);
}

export function gatewayConstructorStandings(): Promise<GatewayResult<ReturnType<typeof getConstructorStandings> extends Promise<infer T> ? T : never>> {
  return guarded("Constructor standings", getConstructorStandings);
}

export function gatewayRaceResult(season: string, round: string): Promise<GatewayResult<RaceResult>> {
  return guarded("Race result", () => getRaceResult(season, round));
}

export function gatewaySprintResult(season: string, round: string): Promise<GatewayResult<RaceResult>> {
  return guarded("Sprint result", () => getSprintResult(season, round));
}

export function gatewayQualifyingResult(season: string, round: string): Promise<GatewayResult<QualifyingResult>> {
  return guarded("Qualifying result", () => getQualifyingResult(season, round));
}

export function gatewayWeather(): Promise<GatewayResult<Weather>> {
  return guarded("Sepang weather", getSepangWeatherNow);
}
