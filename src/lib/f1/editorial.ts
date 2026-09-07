import type {
  ConstructorStanding,
  DriverStanding,
  F1Session,
  QualifyingResult,
  RaceResult,
  RaceWeekend,
  SessionKind,
  Weather,
} from "./types";

export interface WatchItem {
  key: string;
  title: string;
  body: string;
  source: "standings" | "results" | "circuit" | "weather" | "schedule";
}

export interface WhatToWatch {
  sessionLabel: string;
  headline: string;
  items: WatchItem[];
  weatherNote: string | null;
  sprintNote: string | null;
  warnings: string[];
}

export interface DriverMovement {
  driverId: string;
  name: string;
  constructorName: string;
  gridPosition: number;
  finishPosition: number;
  placesGained: number;
  positionText: string;
}

export interface SessionRecap {
  sessionLabel: string;
  status: "provisional" | "official" | "unavailable";
  winner: { name: string; constructorName: string; position: number } | null;
  poleSitter: { name: string; constructorName: string; position: number } | null;
  biggestMovers: DriverMovement[];
  retirements: Array<{ name: string; constructorName: string; positionText: string }>;
  pointsImpact: string | null;
  nextSession: F1Session | null;
  warnings: string[];
}

function gapText(a: number, b: number) {
  return `${Math.abs(a - b)} point${Math.abs(a - b) === 1 ? "" : "s"}`;
}

export function buildWhatToWatch({
  weekend,
  session,
  drivers,
  constructors,
  weather,
}: {
  weekend: RaceWeekend;
  session: F1Session;
  drivers: DriverStanding[] | null;
  constructors: ConstructorStanding[] | null;
  weather?: { raceRainChancePct?: number | null; historicalRainPct?: number } | null;
}): WhatToWatch {
  const warnings: string[] = [];
  const items: WatchItem[] = [];
  const leader = drivers?.[0];
  const challenger = drivers?.[1];

  if (leader && challenger) {
    items.push({
      key: "driver-battle",
      title: "Championship battle",
      body: `${challenger.driver.fullName} trails ${leader.driver.fullName} by ${gapText(leader.points, challenger.points)}. Every result can change the shape of the fight.`,
      source: "standings",
    });
  } else {
    warnings.push("Driver standings are unavailable.");
  }

  const constructorLeader = constructors?.[0];
  const constructorChallenger = constructors?.[1];
  if (constructorLeader && constructorChallenger) {
    items.push({
      key: "constructor-battle",
      title: "Constructor battle",
      body: `${constructorLeader.constructor.name} leads ${constructorChallenger.constructor.name} by ${gapText(constructorLeader.points, constructorChallenger.points)}. Watch whether both cars stay in the fight.`,
      source: "standings",
    });
  }

  const isSprintWeekend = weekend.sessions.some((item) => item.kind === "sprint");
  const sprintNote = isSprintWeekend
    ? "This is a sprint weekend, so there is an additional points opportunity before the Grand Prix."
    : null;

  const weatherNote = weather?.raceRainChancePct != null
    ? `${weather.raceRainChancePct}% rain chance is currently forecast for the race window.`
    : weather?.historicalRainPct != null
      ? `The race sits inside Sepang's historical afternoon rain window (${weather.historicalRainPct}% of the sampled hours). This is historical context, not a prediction.`
      : null;
  if (!weatherNote) warnings.push("Weather context is unavailable.");

  items.push({
    key: "session-format",
    title: session.kind === "race" ? "Race watch" : `${session.label} watch`,
    body: session.kind === "race"
      ? "The race is where strategy, weather and championship pressure meet."
      : `Use ${session.label.toLowerCase()} to watch track evolution, team confidence and the order before the next classification.`,
    source: "schedule",
  });

  return {
    sessionLabel: session.label,
    headline: `${session.label} is where the weekend starts to take shape.`,
    items: items.slice(0, 3),
    weatherNote,
    sprintNote,
    warnings,
  };
}

function isClassified(position: number | null, positionText: string) {
  return position !== null && /^\d+$/.test(positionText);
}

export function calculateMovers(result: RaceResult): DriverMovement[] {
  return result.rows
    .filter((row) => Number.isFinite(row.gridPosition) && row.gridPosition > 0 && isClassified(row.position, row.positionText))
    .map((row) => ({
      driverId: row.driver.id,
      name: row.driver.fullName,
      constructorName: row.constructor.name,
      gridPosition: row.gridPosition,
      finishPosition: row.position as number,
      placesGained: row.gridPosition - (row.position as number),
      positionText: row.positionText,
    }))
    .sort((a, b) => b.placesGained - a.placesGained || a.finishPosition - b.finishPosition)
    .filter((row) => row.placesGained > 0)
    .slice(0, 3);
}

export function buildRaceRecap({
  result,
  session,
  nextSession,
  provisional,
}: {
  result: RaceResult | null;
  session: F1Session;
  nextSession: F1Session | null;
  provisional: boolean;
}): SessionRecap {
  if (!result || result.rows.length === 0) {
    return {
      sessionLabel: session.label,
      status: "unavailable",
      winner: null,
      poleSitter: null,
      biggestMovers: [],
      retirements: [],
      pointsImpact: null,
      nextSession,
      warnings: ["The official classification has not been published yet."],
    };
  }

  const winner = result.rows.find((row) => row.position === 1 && isClassified(row.position, row.positionText));
  const retirements = result.rows
    .filter((row) => !isClassified(row.position, row.positionText))
    .slice(0, 3)
    .map((row) => ({ name: row.driver.fullName, constructorName: row.constructor.name, positionText: row.positionText }));

  return {
    sessionLabel: session.label,
    status: provisional ? "provisional" : "official",
    winner: winner
      ? { name: winner.driver.fullName, constructorName: winner.constructor.name, position: winner.position as number }
      : null,
    poleSitter: null,
    biggestMovers: calculateMovers(result),
    retirements,
    pointsImpact: winner ? `${winner.driver.fullName} scored ${winner.points} championship point${winner.points === 1 ? "" : "s"} in this classification.` : null,
    nextSession,
    warnings: [],
  };
}

export function buildQualifyingRecap({
  result,
  session,
  nextSession,
}: {
  result: QualifyingResult | null;
  session: F1Session;
  nextSession: F1Session | null;
}): SessionRecap {
  const pole = result?.rows.find((row) => row.position === 1);
  return {
    sessionLabel: session.label,
    status: pole ? "official" : "unavailable",
    winner: null,
    poleSitter: pole ? { name: pole.driver.fullName, constructorName: pole.constructor.name, position: pole.position } : null,
    biggestMovers: [],
    retirements: [],
    pointsImpact: null,
    nextSession,
    warnings: pole ? [] : ["Qualifying classification has not been published yet."],
  };
}

export function weatherContext(weather: Weather | null, historicalRainPct: number) {
  if (weather?.rainfall === true) return { raceRainChancePct: null, historicalRainPct };
  return { raceRainChancePct: null, historicalRainPct };
}

export type EditorialSessionKind = SessionKind;
