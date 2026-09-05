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
  StandingsSnapshot,
} from "./types";

/**
 * Overridable so the fallback paths can be exercised for real — point it at a
 * dead host and every page must still render from its snapshot or its
 * unavailable state:
 *
 *   JOLPICA_BASE_URL=http://127.0.0.1:9 npm run build
 *
 * Also the escape hatch if Jolpica ever moves or a mirror is needed.
 */
const BASE = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";

/**
 * Jolpica allows 4 req/s and 500 req/hour unauthenticated. With ISR at five
 * minutes, a deployed instance makes ~12 requests/hour per cached route
 * regardless of traffic, which leaves the budget almost untouched.
 */
const REVALIDATE_SECONDS = 300;

/** The race this app is built around. */
export const SEPANG = { season: "2026", round: "16" } as const;

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
  QualifyingResults?: WireQualifyingResult[];
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

async function get(path: string): Promise<MRData> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
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

  return (await response.json()) as MRData;
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
): Promise<RaceWeekend> {
  const json = await get(`/${season}/${round}.json`);
  const race = json.MRData.RaceTable?.Races?.[0];
  if (!race) {
    throw new JolpicaError(`No race found for ${season} round ${round}`, 404);
  }
  return toRaceWeekend(race);
}

export async function getRaceResult(
  season: string,
  round: string,
): Promise<RaceResult | null> {
  const json = await get(`/${season}/${round}/results.json?limit=100`);
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

export async function getQualifyingResult(
  season: string,
  round: string,
): Promise<QualifyingResult | null> {
  const json = await get(`/${season}/${round}/qualifying.json?limit=100`);
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
