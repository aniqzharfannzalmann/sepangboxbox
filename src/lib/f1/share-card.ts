import { isClassificationProvisional } from "./session-windows";
import type { RaceResult, RaceWeekend } from "./types";

export interface ShareCardDriver {
  id: string;
  name: string;
  constructorName: string;
  constructorId: string;
  position: number;
  points: number;
}

export interface ShareCardFastestLap {
  driverName: string;
  constructorName: string;
  time: string;
}

export interface ShareCardMover {
  driverName: string;
  constructorName: string;
  from: number;
  to: number;
  places: number;
  direction: "gained" | "lost";
}

/*
 * Four states, not two.
 *
 * Sepang is round 16 and has not run, so its card is generated from a schedule
 * entry with no classification behind it. With only provisional/official to
 * choose from that card labelled itself OFFICIAL CLASSIFICATION above an empty
 * podium — the one thing this project does not do.
 *
 * `unpublished` and `unavailable` then have to be separated, because the
 * gateway collapses them: a race that has not happened and a Jolpica outage
 * both arrive here as `result: null`. Announcing NOT PUBLISHED YET for a race
 * that ran in March, just because the API is down this minute, is a false
 * statement on the one artefact that leaves the site. The schedule settles it
 * — it is committed, so it is readable during the outage that caused the
 * question.
 */
export type ShareCardStatus =
  | "provisional"
  | "official"
  | "unpublished"
  | "unavailable";

/** Every card carries the disclaimer, and it states which of the four it is. */
const DISCLAIMER: Record<ShareCardStatus, string> = {
  official:
    "Unofficial fan project · Results from Jolpica-F1 · Check official sources for final classification",
  provisional:
    "Unofficial fan project · Provisional classification · Results from Jolpica-F1",
  unpublished:
    "Unofficial fan project · No classification published yet · Schedule from Jolpica-F1",
  unavailable:
    "Unofficial fan project · Result could not be loaded · Results from Jolpica-F1",
};

export interface ShareableResultCard {
  season: string;
  round: string;
  raceName: string;
  circuitName: string;
  status: ShareCardStatus;
  winner: ShareCardDriver | null;
  podium: ShareCardDriver[];
  fastestLap: ShareCardFastestLap | null;
  biggestMover: ShareCardMover | null;
  sourceDisclaimer: string;
  warnings: string[];
}

function classified(row: RaceResult["rows"][number]) {
  return row.position !== null && /^\d+$/.test(row.positionText);
}

function cardDriver(row: RaceResult["rows"][number]): ShareCardDriver | null {
  if (!classified(row)) return null;
  return {
    id: row.driver.id,
    name: row.driver.fullName,
    constructorName: row.constructor.name,
    constructorId: row.constructor.id,
    position: row.position as number,
    points: Number.isFinite(row.points) ? row.points : 0,
  };
}

function parseLapTime(value: string) {
  const parts = value.split(":");
  const seconds = Number(parts.at(-1));
  const minutes = parts.length > 1 ? Number(parts.at(-2)) : 0;
  return Number.isFinite(seconds) && Number.isFinite(minutes) ? minutes * 60 + seconds : null;
}

export function buildShareableResultCard({
  result,
  weekend,
  nowMs,
}: {
  result: RaceResult | null;
  weekend: RaceWeekend;
  /*
   * Injected, never read from the clock here. Every figure on one card has to
   * agree about when "now" is, and the caller already took that reading — the
   * same rule the rest of the app follows via WithOrigin.fetchedAtMs.
   */
  nowMs: number;
}): ShareableResultCard {
  const warnings: string[] = [];
  const rows = result?.rows ?? [];
  const classifiedRows = rows.filter(classified);
  const podium = classifiedRows
    .filter((row) => row.position !== null && row.position <= 3)
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map(cardDriver)
    .filter((row): row is ShareCardDriver => row !== null);
  const winner = podium.find((row) => row.position === 1) ?? null;

  if (!result || rows.length === 0) warnings.push("Classification is not available yet.");
  if (result && podium.length < 3) warnings.push("The full podium is not available.");

  const fastest = rows
    .filter((row) => classified(row) && row.fastestLap)
    .map((row) => ({ row, seconds: parseLapTime(row.fastestLap as string) }))
    .filter((item): item is { row: typeof item.row; seconds: number } => item.seconds !== null)
    .sort((a, b) => a.seconds - b.seconds)[0];

  const movements = classifiedRows
    .filter((row) => row.position !== null && Number.isFinite(row.gridPosition) && row.gridPosition > 0)
    .map((row) => ({ row, places: row.gridPosition - (row.position as number) }))
    .filter((item) => item.places !== 0)
    .sort((a, b) => Math.abs(b.places) - Math.abs(a.places) || b.places - a.places)[0];

  const biggestMover = movements
    ? {
        driverName: movements.row.driver.fullName,
        constructorName: movements.row.constructor.name,
        from: movements.row.gridPosition,
        to: movements.row.position as number,
        places: Math.abs(movements.places),
        direction: movements.places > 0 ? "gained" as const : "lost" as const,
      }
    : null;

  // A classification exists only if at least one car was actually classified.
  // Rows alone are not enough: a field of retirements carries no positions.
  const published = classifiedRows.length > 0;

  // Has the race been run at all? Read from the committed schedule rather than
  // from the result, so it still answers when the results API is unreachable.
  const raceSession = weekend.sessions.find((session) => session.kind === "race");
  const raceHasRun = raceSession
    ? new Date(raceSession.endsAtIso).getTime() <= nowMs
    : false;

  const status: ShareCardStatus = published
    ? isClassificationProvisional(weekend, nowMs)
      ? "provisional"
      : "official"
    : raceHasRun
      ? "unavailable"
      : "unpublished";

  return {
    season: result?.season ?? weekend.season,
    round: result?.round ?? weekend.round,
    raceName: result?.raceName ?? weekend.raceName,
    circuitName: weekend.circuitName || result?.circuitName || "Circuit information unavailable",
    status,
    winner,
    podium,
    fastestLap: fastest
      ? { driverName: fastest.row.driver.fullName, constructorName: fastest.row.constructor.name, time: fastest.row.fastestLap as string }
      : null,
    biggestMover,
    sourceDisclaimer: DISCLAIMER[status],
    warnings,
  };
}
