import type { DataOrigin } from "../types";

export type DataQuality = "complete" | "partial" | "unavailable";

export interface GatewayResult<T> {
  data: T | null;
  source: string;
  origin: DataOrigin | "cached";
  quality: DataQuality;
  fetchedAtMs: number;
  warnings: string[];
}

export function complete<T>(data: T, source: string, fetchedAtMs = Date.now()): GatewayResult<T> {
  return { data, source, origin: "live", quality: "complete", fetchedAtMs, warnings: [] };
}

export function unavailable<T>(source: string, warning: string, fetchedAtMs = Date.now()): GatewayResult<T> {
  return { data: null, source, origin: "fallback", quality: "unavailable", fetchedAtMs, warnings: [warning] };
}
