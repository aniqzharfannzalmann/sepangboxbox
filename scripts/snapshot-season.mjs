#!/usr/bin/env node
/**
 * Regenerate src/lib/f1/season.static.json from the live Jolpica feed.
 *
 *   npm run snapshot:season
 *
 * The committed fallback the schedule falls back to when Jolpica is
 * unreachable. It used to cover Sepang alone, back when that was the only
 * weekend the app showed; now that every round is a first-class page, the
 * whole calendar is race-critical and all of it is snapshotted.
 *
 * Session durations are mirrored from SESSION_MINUTES in src/lib/f1/jolpica.ts.
 * Keep the two in step.
 */

import { writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEASON = "2026";
const OUT = fileURLToPath(new URL("../src/lib/f1/season.static.json", import.meta.url));
const TMP = `${OUT}.tmp`;

const MINUTES = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  "sprint-quali": 45,
  sprint: 60,
  quali: 60,
  race: 150,
};

const LABEL = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  "sprint-quali": "Sprint Qualifying",
  sprint: "Sprint",
  quali: "Qualifying",
  race: "Race",
};

const session = (kind, part) => {
  if (!part?.date) return null;
  const start = new Date(`${part.date}T${part.time ?? "00:00:00Z"}`);
  if (Number.isNaN(start.getTime())) return null;
  return {
    kind,
    label: LABEL[kind],
    startsAtIso: start.toISOString(),
    endsAtIso: new Date(start.getTime() + MINUTES[kind] * 60_000).toISOString(),
  };
};

const response = await fetch(
  `https://api.jolpi.ca/ergast/f1/${SEASON}.json?limit=100`,
);
if (!response.ok) {
  console.error(`Jolpica returned ${response.status}`);
  process.exit(1);
}

const races = (await response.json()).MRData?.RaceTable?.Races ?? [];
if (races.length === 0) {
  console.error(`No races found for ${SEASON}`);
  process.exit(1);
}

const snapshot = races.map((race) => ({
  season: race.season,
  round: race.round,
  raceName: race.raceName,
  circuitId: race.Circuit.circuitId,
  circuitName: race.Circuit.circuitName,
  locality: race.Circuit.Location.locality,
  country: race.Circuit.Location.country,
  url: race.url,
  sessions: [
    session("fp1", race.FirstPractice),
    session("fp2", race.SecondPractice),
    session("fp3", race.ThirdPractice),
    session("sprint-quali", race.SprintQualifying ?? race.SprintShootout),
    session("sprint", race.Sprint),
    session("quali", race.Qualifying),
    session("race", { date: race.date, time: race.time }),
  ]
    .filter(Boolean)
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso)),
}));

// Sanity: the round this app is named for must be in there, at Sepang.
const sepang = snapshot.find((r) => r.circuitId === "sepang");
if (!sepang) {
  console.error("Sepang is not in the calendar — refusing to overwrite.");
  process.exit(1);
}

const thin = snapshot.filter((r) => r.sessions.length < 4);
if (thin.length > 0) {
  console.error(
    `Incomplete session data for round(s) ${thin.map((r) => r.round).join(", ")} — refusing to overwrite.`,
  );
  process.exit(1);
}

const rounds = snapshot.map((race) => Number(race.round));
if (
  snapshot.some((race) => race.season !== SEASON) ||
  new Set(snapshot.map((race) => race.round)).size !== snapshot.length ||
  rounds.some((round) => !Number.isInteger(round) || round < 1) ||
  snapshot.some((race) => !race.sessions.some((s) => s.kind === "race"))
) {
  console.error("Schedule has invalid seasons, rounds, or race sessions — refusing to overwrite.");
  process.exit(1);
}

writeFileSync(TMP, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
renameSync(TMP, OUT);
console.log(
  `Wrote ${snapshot.length} rounds (${snapshot.reduce((n, r) => n + r.sessions.length, 0)} sessions) to ${OUT}`,
);
console.log(`  Sepang is round ${sepang.round}, ${sepang.sessions.length} sessions`);
