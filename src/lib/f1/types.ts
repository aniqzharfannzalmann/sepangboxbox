/**
 * Canonical domain types.
 *
 * Everything the UI renders is shaped like this. The Ergast/Jolpica wire
 * format (every number is a string, times are split across fields) stops at
 * the client boundary in jolpica.ts and never reaches a component.
 */

export interface Driver {
  id: string;
  code: string | null;
  permanentNumber: number | null;
  givenName: string;
  familyName: string;
  fullName: string;
  nationality: string;
  url: string;
}

export interface Constructor {
  id: string;
  name: string;
  nationality: string;
  url: string;
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driver: Driver;
  constructors: Constructor[];
  /** Points behind the championship leader. 0 for the leader. */
  pointsBehindLeader: number;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructor: Constructor;
  pointsBehindLeader: number;
}

export interface StandingsSnapshot<T> {
  season: string;
  /** Round the standings were computed after. */
  round: string;
  entries: T[];
}

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

export type SessionKind =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint-quali"
  | "sprint"
  | "quali"
  | "race";

export interface F1Session {
  kind: SessionKind;
  label: string;
  /** ISO 8601 UTC instant. Kept as a string so it survives the server →
   *  client boundary without a Date serialisation round-trip. */
  startsAtIso: string;
  endsAtIso: string;
}

export interface RaceWeekend {
  season: string;
  round: string;
  raceName: string;
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
  url: string;
  /** Chronological. A weekend without a sprint simply has fewer entries. */
  sessions: F1Session[];
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export interface RaceResultRow {
  position: number | null;
  /** "R" (retired), "D", "E", "W", "F", "N" or a lap count — Ergast overloads
   *  this field, so it is preserved verbatim for display. */
  positionText: string;
  points: number;
  gridPosition: number;
  laps: number;
  status: string;
  driver: Driver;
  constructor: Constructor;
  /** Winner's total time, or the gap for finishers on the lead lap. */
  time: string | null;
  fastestLap: string | null;
}

export interface RaceResult {
  season: string;
  round: string;
  raceName: string;
  circuitName: string;
  dateIso: string;
  rows: RaceResultRow[];
}

/* ------------------------------------------------------------------ */
/* Data provenance                                                     */
/* ------------------------------------------------------------------ */

/**
 * Where a payload actually came from. The UI is required to tell the truth
 * about this — a stale or fallback render must be visibly labelled rather
 * than silently passed off as current (PRD section 8).
 */
export type DataOrigin = "live" | "fallback";

export interface WithOrigin<T> {
  data: T;
  origin: DataOrigin;
  /** Populated when origin is "fallback", for the status line. */
  reason?: string;
  /**
   * Clock reading taken when this payload was assembled.
   *
   * Components must be pure, so they cannot call Date.now() themselves — but
   * "is this session over?" needs a clock. Reading it here, in plain async
   * code, makes the render a deterministic function of its inputs and keeps
   * every row on a page agreeing on what "now" means.
   */
  fetchedAtMs: number;
}
