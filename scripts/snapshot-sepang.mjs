#!/usr/bin/env node
/**
 * Regenerate src/lib/f1/sepang.static.json from the live Jolpica feed.
 *
 * The snapshot is the committed fallback the schedule page falls back to when
 * Jolpica is unreachable. Run this if the published session times ever move:
 *
 *   npm run snapshot:sepang
 *
 * Session durations are mirrored from SESSION_MINUTES in src/lib/f1/jolpica.ts.
 * Keep the two in step.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SEASON = "2026";
const ROUND = "16";
const OUT = fileURLToPath(
  new URL("../src/lib/f1/sepang.static.json", import.meta.url),
);

const MINUTES = { fp1: 60, fp2: 60, fp3: 60, quali: 60, race: 150 };
const LABEL = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  quali: "Qualifying",
  race: "Race",
};

const session = (kind, part) => {
  if (!part?.date) return null;
  const start = new Date(`${part.date}T${part.time ?? "00:00:00Z"}`);
  return {
    kind,
    label: LABEL[kind],
    startsAtIso: start.toISOString(),
    endsAtIso: new Date(start.getTime() + MINUTES[kind] * 60_000).toISOString(),
  };
};

const response = await fetch(
  `https://api.jolpi.ca/ergast/f1/${SEASON}/${ROUND}.json`,
);
if (!response.ok) {
  console.error(`Jolpica returned ${response.status}`);
  process.exit(1);
}

const race = (await response.json()).MRData?.RaceTable?.Races?.[0];
if (!race) {
  console.error(`No race found for ${SEASON} round ${ROUND}`);
  process.exit(1);
}

if (race.Circuit.circuitId !== "sepang") {
  console.error(
    `Expected circuit "sepang", got "${race.Circuit.circuitId}" — refusing to overwrite the snapshot.`,
  );
  process.exit(1);
}

const snapshot = {
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
    session("quali", race.Qualifying),
    session("race", { date: race.date, time: race.time }),
  ]
    .filter(Boolean)
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso)),
};

await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Wrote ${snapshot.sessions.length} sessions to ${OUT}`);
