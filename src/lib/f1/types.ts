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

export interface QualifyingRow {
  position: number;
  driver: Driver;
  constructor: Constructor;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface QualifyingResult {
  season: string;
  round: string;
  raceName: string;
  rows: QualifyingRow[];
}

/** One driver's finish in one round, for season aggregates. */
export interface DriverRaceEntry {
  round: string;
  raceName: string;
  position: number | null;
  positionText: string;
  points: number;
  gridPosition: number;
  status: string;
  classified: boolean;
}

export interface DriverSeasonStats {
  driver: Driver;
  constructorNames: string[];
  racesEntered: number;
  points: number;
  wins: number;
  podiums: number;
  pointsFinishes: number;
  dnfs: number;
  bestFinish: number | null;
  /**
   * Mean finishing position across classified finishes only. Retirements are
   * excluded rather than counted as last — averaging them in would punish a
   * driver for a mechanical failure, and the UI states the exclusion so the
   * number is not read as something it is not.
   */
  averageFinish: number | null;
  averageGrid: number | null;
}

/* ------------------------------------------------------------------ */
/* Live timing                                                         */
/* ------------------------------------------------------------------ */

export type TyreCompound =
  | "SOFT"
  | "MEDIUM"
  | "HARD"
  | "INTERMEDIATE"
  | "WET"
  | "UNKNOWN";

/**
 * One car in the timing tower.
 *
 * Deliberately wider than any single source can fill. A field a source cannot
 * supply is null, and the UI reads the source's capabilities to decide whether
 * to hide that column or say it is unavailable — it never renders a null as a
 * blank cell and lets the reader assume the data is missing upstream.
 */
export interface TimingRow {
  position: number | null;
  /** Ergast overloads this ("R", "D", a lap count); shown verbatim. */
  positionText: string;
  driver: Driver;
  constructor: Constructor;
  /** Leader shows total time; everyone else a gap like "+11.536". */
  gapToLeader: string | null;
  gapToAhead: string | null;
  lastLap: string | null;
  bestLap: string | null;
  lapsCompleted: number | null;
  tyre: TyreCompound | null;
  stintLaps: number | null;
  inPit: boolean;
  /** "Finished", "+1 Lap", "Collision" — free text from the source. */
  status: string | null;
  retired: boolean;
}

export interface Stint {
  driverId: string;
  compound: TyreCompound;
  startLap: number;
  endLap: number | null;
}

export interface PitStop {
  driverId: string;
  lap: number;
  /** Stationary time in seconds, when the source reports it. */
  durationSeconds: number | null;
  atIso: string | null;
}

export interface RaceControlMessage {
  atIso: string;
  category: string | null;
  flag: string | null;
  scope: string | null;
  message: string;
}

export interface Weather {
  airTempC: number | null;
  trackTempC: number | null;
  humidityPct: number | null;
  rainfall: boolean | null;
  atIso: string | null;
}

/**
 * How close to the real thing the numbers on screen are.
 *
 * "live" is second-by-second timing. "post-session" is a classification
 * published after the flag — correct, but not live. "unavailable" means
 * nothing can be shown and the UI must say so.
 */
export type Fidelity = "live" | "post-session" | "unavailable";

export interface LiveSessionState {
  weekend: RaceWeekend;
  /** Running session, or the most recent one once the weekend is under way. */
  session: F1Session | null;
  /** The next session that has not started, when there is one. */
  next: F1Session | null;
  status: "before" | "live" | "between" | "finished";
  /**
   * True between the chequered flag and official classification, when
   * positions can still change on appeal or penalty (PRD 10.2). The UI must
   * label the table provisional while this holds.
   */
  provisional: boolean;
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
