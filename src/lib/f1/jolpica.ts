import "server-only";

import type {
  Constructor,
  ConstructorStanding,
  Driver,
  DriverRaceEntry,
  DriverSeasonStats,
  DriverStanding,
  F1Session,
  QualifyingResult,
  QualifyingRow,
  RaceResult,
  RaceResultRow,
  RaceWeekend,
  SessionKind,
  PitStop,
  StandingsSnapshot,
} from "./types";

import { lapTimeToSeconds } from "./time";

/**
 * Overridable so the fallback paths can be exercised for real — point it at a
 * dead host and every page must still render from its snapshot or its
 * unavailable state:
 *
 *   JOLPICA_BASE_URL=http://127.0.0.1:9 npm run build
 *
 * Also the escape hatch if Jolpica ever moves or a mirror is needed.
 */
const configuredBase = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";
let BASE: string;
try {
  const url = new URL(configuredBase);
  const localOverride = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production" && !localOverride) {
    throw new Error("JOLPICA_BASE_URL must use HTTPS in production.");
  }
  BASE = url.toString().replace(/\/$/, "");
} catch (error) {
  throw new Error(`Invalid JOLPICA_BASE_URL: ${String(error)}`);
}

/**
 * Jolpica allows 4 req/s and 500 req/hour unauthenticated. With ISR at five
 * minutes, a deployed instance makes ~12 requests/hour per cached route
 * regardless of traffic, which leaves the budget almost untouched.
 */
const REVALIDATE_SECONDS = 300;

/**
 * Shorter window for anything that moves during a session.
 *
 * A classification flips from provisional to final within an hour of the
 * flag, and router.refresh() on the live page re-renders but does not clear
 * this cache — so with the default 300s the page would refresh for five
 * minutes and keep showing the same rows.
 */
const LIVE_REVALIDATE_SECONDS = 60;

/**
 * Historical results are immutable — the 2004 Malaysian Grand Prix is not
 * going to change. Caching them for a day keeps the Sepang heritage page
 * essentially free against Jolpica's 500 requests/hour.
 */
export const HISTORY_REVALIDATE_SECONDS = 86_400;

/** The race this app is built around. */
export const SEPANG = {
  season: "2026",
  round: "16",
  circuitId: "sepang",
} as const;

/*
 * Nominal session lengths. Ergast/Jolpica publishes a start time but no
 * duration, and "is a session running right now" drives the whole home page,
 * so the end has to be inferred. These are generous on purpose: a session
 * shown as running slightly too long is a much smaller failure than the live
 * view disappearing while cars are still on track.
 */
const SESSION_MINUTES: Record<SessionKind, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  "sprint-quali": 45,
  sprint: 60,
  quali: 60,
  race: 150,
};

const SESSION_LABEL: Record<SessionKind, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  "sprint-quali": "Sprint Qualifying",
  sprint: "Sprint",
  quali: "Qualifying",
  race: "Race",
};

/* ------------------------------------------------------------------ */
/* Wire format                                                         */
/* ------------------------------------------------------------------ */

interface WireDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

interface WireConstructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

interface WireDateTime {
  date: string;
  time?: string;
}

interface WireRace {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
  date: string;
  time?: string;
  FirstPractice?: WireDateTime;
  SecondPractice?: WireDateTime;
  ThirdPractice?: WireDateTime;
  SprintQualifying?: WireDateTime;
  SprintShootout?: WireDateTime;
  Sprint?: WireDateTime;
  Qualifying?: WireDateTime;
  Results?: WireResult[];
  SprintResults?: WireResult[];
  QualifyingResults?: WireQualifyingResult[];
  PitStops?: WirePitStop[];
}

interface WirePitStop {
  driverId: string;
  lap: string;
  stop: string;
  time: string;
  duration: string;
}

interface WireDriverList {
  Drivers: WireDriver[];
}

interface WireResult {
  position: string;
  positionText: string;
  points: string;
  grid: string;
  laps: string;
  status: string;
  Driver: WireDriver;
  Constructor: WireConstructor;
  Time?: { time: string };
  FastestLap?: { Time?: { time: string } };
}

interface WireQualifyingResult {
  position: string;
  Driver: WireDriver;
  Constructor: WireConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

interface WireDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: WireDriver;
  Constructors: WireConstructor[];
}

interface WireConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: WireConstructor;
}

interface MRData {
  MRData: {
    total?: string;
    RaceTable?: { season: string; Races: WireRace[] };
    DriverTable?: WireDriverList;
    StandingsTable?: {
      season: string;
      round?: string;
      StandingsLists: Array<{
        season: string;
        round: string;
        DriverStandings?: WireDriverStanding[];
        ConstructorStandings?: WireConstructorStanding[];
      }>;
    };
  };
}

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

export class JolpicaError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "JolpicaError";
  }
}

async function get(
  path: string,
  revalidate: number = REVALIDATE_SECONDS,
): Promise<MRData> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw new JolpicaError(`Could not reach Jolpica (${path})`, undefined, {
      cause,
    });
  }

  if (!response.ok) {
    throw new JolpicaError(
      `Jolpica returned ${response.status} for ${path}`,
      response.status,
    );
  }

  const json: unknown = await response.json();
  if (!json || typeof json !== "object" || !("MRData" in json)) {
    throw new JolpicaError(`Jolpica returned malformed data for ${path}`);
  }
  return json as MRData;
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

function toDriver(w: WireDriver): Driver {
  return {
    id: w.driverId,
    code: w.code ?? null,
    permanentNumber: w.permanentNumber ? Number(w.permanentNumber) : null,
    givenName: w.givenName,
    familyName: w.familyName,
    fullName: `${w.givenName} ${w.familyName}`,
    nationality: w.nationality,
    url: w.url,
  };
}

function toConstructor(w: WireConstructor): Constructor {
  return {
    id: w.constructorId,
    name: w.name,
    nationality: w.nationality,
    url: w.url,
  };
}

/** Ergast splits an instant into "2026-10-04" + "07:00:00Z". */
function toIso(part: WireDateTime | undefined): string | null {
  if (!part?.date) return null;
  const time = part.time ?? "00:00:00Z";
  const iso = new Date(`${part.date}T${time}`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function session(kind: SessionKind, part: WireDateTime | undefined): F1Session | null {
  const startsAtIso = toIso(part);
  if (!startsAtIso) return null;
  const endsAtIso = new Date(
    new Date(startsAtIso).getTime() + SESSION_MINUTES[kind] * 60_000,
  ).toISOString();
  return { kind, label: SESSION_LABEL[kind], startsAtIso, endsAtIso };
}

export function toRaceWeekend(w: WireRace): RaceWeekend {
  const sessions = [
    session("fp1", w.FirstPractice),
    session("fp2", w.SecondPractice),
    session("fp3", w.ThirdPractice),
    // Ergast renamed this mid-era; accept either spelling.
    session("sprint-quali", w.SprintQualifying ?? w.SprintShootout),
    session("sprint", w.Sprint),
    session("quali", w.Qualifying),
    session("race", { date: w.date, time: w.time }),
  ]
    .filter((s): s is F1Session => s !== null)
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));

  return {
    season: w.season,
    round: w.round,
    raceName: w.raceName,
    circuitId: w.Circuit.circuitId,
    circuitName: w.Circuit.circuitName,
    locality: w.Circuit.Location.locality,
    country: w.Circuit.Location.country,
    url: w.url,
    sessions,
  };
}

function withPointsBehind<T extends { points: number }>(
  entries: T[],
): Array<T & { pointsBehindLeader: number }> {
  const leader = entries[0]?.points ?? 0;
  return entries.map((e) => ({ ...e, pointsBehindLeader: leader - e.points }));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function getDriverStandings(): Promise<
  StandingsSnapshot<DriverStanding>
> {
  const json = await get("/current/driverStandings.json?limit=100");
  const list = json.MRData.StandingsTable?.StandingsLists?.[0];
  const raw = list?.DriverStandings ?? [];

  return {
    season: list?.season ?? "",
    round: list?.round ?? "",
    entries: withPointsBehind(
      raw.map((s) => ({
        position: Number(s.position),
        points: Number(s.points),
        wins: Number(s.wins),
        driver: toDriver(s.Driver),
        constructors: s.Constructors.map(toConstructor),
      })),
    ),
  };
}

export async function getConstructorStandings(): Promise<
  StandingsSnapshot<ConstructorStanding>
> {
  const json = await get("/current/constructorStandings.json?limit=100");
  const list = json.MRData.StandingsTable?.StandingsLists?.[0];
  const raw = list?.ConstructorStandings ?? [];

  return {
    season: list?.season ?? "",
    round: list?.round ?? "",
    entries: withPointsBehind(
      raw.map((s) => ({
        position: Number(s.position),
        points: Number(s.points),
        wins: Number(s.wins),
        constructor: toConstructor(s.Constructor),
      })),
    ),
  };
}

export async function getSeasonSchedule(
  season: string = SEPANG.season,
): Promise<RaceWeekend[]> {
  const json = await get(`/${season}.json?limit=100`);
  return (json.MRData.RaceTable?.Races ?? []).map(toRaceWeekend);
}

export async function getRaceWeekend(
  season: string = SEPANG.season,
  round: string = SEPANG.round,
  /**
   * Defaults to the standard window, which suits a weekend in progress. A page
   * asking about a weekend that is weeks away should pass something longer:
   * the session times were published months ago and will not move, and the
   * shortest fetch on a page sets that whole page's revalidate.
   */
  revalidate: number = REVALIDATE_SECONDS,
): Promise<RaceWeekend> {
  const json = await get(`/${season}/${round}.json`, revalidate);
  const race = json.MRData.RaceTable?.Races?.[0];
  if (!race) {
    throw new JolpicaError(`No race found for ${season} round ${round}`, 404);
  }
  return toRaceWeekend(race);
}

export async function getRaceResult(
  season: string,
  round: string,
  /**
   * Defaults to the live window, because the common caller is a race that has
   * just finished and may still be reclassified. A historical result should
   * pass HISTORY_REVALIDATE_SECONDS — otherwise a nine-year-old race drags
   * the whole page's revalidate down to a minute.
   */
  revalidate: number = LIVE_REVALIDATE_SECONDS,
): Promise<RaceResult | null> {
  const json = await get(
    `/${season}/${round}/results.json?limit=100`,
    revalidate,
  );
  const race = json.MRData.RaceTable?.Races?.[0];
  if (!race?.Results?.length) return null;

  // The winner's lap count is the reference every other car is measured against.
  const leaderLaps = Number(race.Results[0]?.laps ?? 0);

  const rows: RaceResultRow[] = race.Results.map((r) => ({
    position: Number.isFinite(Number(r.position)) ? Number(r.position) : null,
    positionText: r.positionText,
    points: Number(r.points),
    gridPosition: Number(r.grid),
    laps: Number(r.laps),
    lapsDown: Math.max(0, leaderLaps - Number(r.laps)),
    status: r.status,
    driver: toDriver(r.Driver),
    constructor: toConstructor(r.Constructor),
    time: r.Time?.time ?? null,
    fastestLap: r.FastestLap?.Time?.time ?? null,
  }));

  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuitName: race.Circuit.circuitName,
    dateIso: toIso({ date: race.date, time: race.time }) ?? race.date,
    rows,
  };
}

export async function getSprintResult(
  season: string,
  round: string,
): Promise<RaceResult | null> {
  const json = await get(
    `/${season}/${round}/sprint.json?limit=100`,
    LIVE_REVALIDATE_SECONDS,
  );
  const race = json.MRData.RaceTable?.Races?.[0];
  if (!race?.SprintResults?.length) return null;

  const leaderLaps = Number(race.SprintResults[0]?.laps ?? 0);
  const rows: RaceResultRow[] = race.SprintResults.map((r) => ({
    position: Number.isFinite(Number(r.position)) ? Number(r.position) : null,
    positionText: r.positionText,
    points: Number(r.points),
    gridPosition: Number(r.grid),
    laps: Number(r.laps),
    lapsDown: Math.max(0, leaderLaps - Number(r.laps)),
    status: r.status,
    driver: toDriver(r.Driver),
    constructor: toConstructor(r.Constructor),
    time: r.Time?.time ?? null,
    fastestLap: r.FastestLap?.Time?.time ?? null,
  }));

  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuitName: race.Circuit.circuitName,
    dateIso: toIso({ date: race.date, time: race.time }) ?? race.date,
    rows,
  };
}

export async function getQualifyingResult(
  season: string,
  round: string,
): Promise<QualifyingResult | null> {
  const json = await get(
    `/${season}/${round}/qualifying.json?limit=100`,
    LIVE_REVALIDATE_SECONDS,
  );
  const race = json.MRData.RaceTable?.Races?.[0];
  if (!race?.QualifyingResults?.length) return null;

  const rows: QualifyingRow[] = race.QualifyingResults.map((q) => ({
    position: Number(q.position),
    driver: toDriver(q.Driver),
    constructor: toConstructor(q.Constructor),
    q1: q.Q1 || null,
    q2: q.Q2 || null,
    q3: q.Q3 || null,
  })).sort((a, b) => a.position - b.position);

  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    rows,
  };
}

/**
 * Every classified and unclassified finish for one driver this season.
 *
 * One request per driver, not one per round — the season endpoint filtered by
 * driver returns all of them at once, which keeps /compare at two requests
 * regardless of how far into the season it is.
 */
export async function getDriverSeasonResults(
  season: string,
  driverId: string,
): Promise<DriverRaceEntry[]> {
  const json = await get(`/${season}/drivers/${driverId}/results.json?limit=100`);
  const races = json.MRData.RaceTable?.Races ?? [];

  return races.flatMap((race) => {
    const result = race.Results?.[0];
    if (!result) return [];
    const classified = /^\d+$/.test(result.positionText);
    return [
      {
        round: race.round,
        raceName: race.raceName,
        position: classified ? Number(result.position) : null,
        positionText: result.positionText,
        points: Number(result.points),
        gridPosition: Number(result.grid),
        status: result.status,
        classified,
      },
    ];
  });
}

const mean = (values: number[]): number | null =>
  values.length === 0
    ? null
    : values.reduce((sum, v) => sum + v, 0) / values.length;

export function summariseDriverSeason(
  driver: Driver,
  constructorNames: string[],
  entries: DriverRaceEntry[],
): DriverSeasonStats {
  const finishes = entries
    .filter((e) => e.classified && e.position !== null)
    .map((e) => e.position as number);

  // Grid position 0 means a pit lane start in Ergast, which is not a grid slot.
  const grids = entries.map((e) => e.gridPosition).filter((g) => g > 0);

  return {
    driver,
    constructorNames,
    racesEntered: entries.length,
    points: entries.reduce((sum, e) => sum + e.points, 0),
    wins: finishes.filter((p) => p === 1).length,
    podiums: finishes.filter((p) => p <= 3).length,
    pointsFinishes: entries.filter((e) => e.points > 0).length,
    dnfs: entries.filter((e) => !e.classified).length,
    bestFinish: finishes.length ? Math.min(...finishes) : null,
    averageFinish: mean(finishes),
    averageGrid: mean(grids),
  };
}

/* ------------------------------------------------------------------ */
/* Circuit history                                                     */
/* ------------------------------------------------------------------ */

/**
 * One historical running of a race at a circuit.
 *
 * `driverId` and `constructorId` are carried deliberately: tallies must be
 * keyed on them, never on family name. Sepang has been won by both Michael
 * and Ralf Schumacher, and counting by name merges them into one four-time
 * winner who does not exist.
 */
export interface CircuitRaceEntry {
  season: string;
  round: string;
  raceName: string;
  driverId: string;
  driverName: string;
  constructorId: string;
  constructorName: string;
  /** Pole lap, or the race's fastest lap, depending on the query. */
  time: string | null;
}

function toCircuitEntry(
  race: WireRace,
  driver: WireDriver,
  constructor: WireConstructor,
  time: string | null,
): CircuitRaceEntry {
  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    driverId: driver.driverId,
    driverName: `${driver.givenName} ${driver.familyName}`,
    constructorId: constructor.constructorId,
    constructorName: constructor.name,
    time,
  };
}

/** Every winner at a circuit, oldest first. */
export async function getCircuitWinners(
  circuitId: string,
): Promise<CircuitRaceEntry[]> {
  const json = await get(
    `/circuits/${circuitId}/results/1.json?limit=100`,
    HISTORY_REVALIDATE_SECONDS,
  );
  return (json.MRData.RaceTable?.Races ?? []).flatMap((race) => {
    const r = race.Results?.[0];
    return r ? [toCircuitEntry(race, r.Driver, r.Constructor, r.Time?.time ?? null)] : [];
  });
}

/**
 * Every pole sitter at a circuit. Ergast has no qualifying data before 2002,
 * so this is shorter than the winners list and callers must not assume the
 * two line up.
 */
export async function getCircuitPoles(
  circuitId: string,
): Promise<CircuitRaceEntry[]> {
  const json = await get(
    `/circuits/${circuitId}/qualifying/1.json?limit=100`,
    HISTORY_REVALIDATE_SECONDS,
  );
  return (json.MRData.RaceTable?.Races ?? []).flatMap((race) => {
    const q = race.QualifyingResults?.[0];
    if (!q) return [];
    return [toCircuitEntry(race, q.Driver, q.Constructor, q.Q3 || q.Q2 || q.Q1 || null)];
  });
}

/** The fastest lap of each race at a circuit. Sparser still than poles. */
export async function getCircuitFastestLaps(
  circuitId: string,
): Promise<CircuitRaceEntry[]> {
  const json = await get(
    `/circuits/${circuitId}/fastest/1/results.json?limit=100`,
    HISTORY_REVALIDATE_SECONDS,
  );
  return (json.MRData.RaceTable?.Races ?? []).flatMap((race) => {
    const r = race.Results?.[0];
    const time = r?.FastestLap?.Time?.time ?? null;
    return r && time ? [toCircuitEntry(race, r.Driver, r.Constructor, time)] : [];
  });
}

/**
 * Pit stops for a race.
 *
 * Ergast has always carried these; the live page previously claimed they
 * required OpenF1, which was simply wrong. Durations arrive as "12.338" or
 * "26:11.504" — the long ones are real, and mean the field sat in the pit
 * lane under a red flag.
 */
export async function getPitStops(
  season: string,
  round: string,
): Promise<PitStop[]> {
  const json = await get(
    `/${season}/${round}/pitstops.json?limit=100`,
    LIVE_REVALIDATE_SECONDS,
  );
  const stops = json.MRData.RaceTable?.Races?.[0]?.PitStops ?? [];

  return stops.map((p) => ({
    driverId: p.driverId,
    lap: Number(p.lap),
    durationSeconds: lapTimeToSeconds(p.duration),
    atIso: null,
  }));
}

/**
 * The most recent result rows at a circuit.
 *
 * Deliberately not the full history. Averaging a circuit's character over
 * 1950-2026 measures the history of the sport rather than the track: Monaco's
 * 44% all-time attrition shuffles finishing order so much that it came out as
 * *easier* to overtake at than Sepang, which is plainly wrong. Restricted to
 * roughly the last twenty races the numbers behave, and Monaco lands where it
 * should.
 *
 * Ergast returns oldest first, so the recent races sit at the highest offsets
 * and only the tail needs fetching — five requests instead of fifteen, which
 * also keeps this inside Jolpica's rate limit.
 */
export async function getCircuitResults(
  circuitId: string,
  wantRows = 400,
): Promise<CircuitResultRow[]> {
  const head = await get(
    `/circuits/${circuitId}/results.json?limit=1&offset=0`,
    HISTORY_REVALIDATE_SECONDS,
  );
  const total = Number(head.MRData.total ?? 0);
  if (total === 0) return [];

  const rows: CircuitResultRow[] = [];
  let offset = Math.max(0, total - wantRows);

  // Bounded: a paging bug upstream must not become an unbounded request loop
  // against someone else's free API.
  for (let page = 0; page < 8 && offset < total; page += 1) {
    const json = await get(
      `/circuits/${circuitId}/results.json?limit=100&offset=${offset}`,
      HISTORY_REVALIDATE_SECONDS,
    );
    for (const race of json.MRData.RaceTable?.Races ?? []) {
      for (const r of race.Results ?? []) {
        rows.push({
          season: race.season,
          round: race.round,
          position: Number(r.position),
          positionText: r.positionText,
          gridPosition: Number(r.grid),
          status: r.status,
          classified: /^\d+$/.test(r.positionText),
          driverId: r.Driver.driverId,
          constructorId: r.Constructor.constructorId,
        });
      }
    }
    offset += 100;
  }

  return rows;
}

export interface CircuitResultRow {
  season: string;
  round: string;
  position: number;
  positionText: string;
  gridPosition: number;
  status: string;
  classified: boolean;
  driverId: string;
  constructorId: string;
}
