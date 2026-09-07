#!/usr/bin/env node
/**
 * Snapshot Sepang's race history to src/lib/f1/sepang-history.static.json.
 *
 *   npm run snapshot:sepang
 *
 * The committed fallback for /sepang, and the reason that page stopped going
 * blank.
 *
 * It used to make four Jolpica calls at build time and throw the whole page
 * away if the winners query was the one that failed — not degrade it, throw it
 * away, including the weather outlook, which does not depend on this data at
 * all. A single transient failure during a Vercel build got the error state
 * prerendered into a static page and served from cache for the life of that
 * entry. That is exactly what happened on the first deploy.
 *
 * A snapshot is the right shape here rather than a workaround. Sepang held its
 * nineteenth and last Grand Prix in 2017 and its twentieth is in October 2026,
 * so for now this data is finished — the same argument that already justifies
 * season.static.json, team-stats.json and circuit-maps.json.
 *
 * Raw inputs are stored, not the assembled page data: the tallying and the lap
 * record stay in sepang-history.ts so live and fallback cannot drift apart.
 *
 * Re-run it after the 2026 race, when there will be a twentieth winner.
 */

import { writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";
const CIRCUIT = "sepang";
const LAST_RACE = { season: "2017", round: "15" };

const OUT = fileURLToPath(
  new URL("../src/lib/f1/sepang-history.static.json", import.meta.url),
);
const TMP = `${OUT}.tmp`;

async function get(path) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${response.status} for ${path}`);
  }
  return response.json();
}

/** Mirrors toCircuitEntry in jolpica.ts — keep the two in step. */
const toEntry = (race, driver, constructor, time) => ({
  season: race.season,
  round: race.round,
  raceName: race.raceName,
  driverId: driver.driverId,
  driverName: `${driver.givenName} ${driver.familyName}`,
  constructorId: constructor.constructorId,
  constructorName: constructor.name,
  time,
});

const racesOf = (json) => json.MRData.RaceTable?.Races ?? [];

console.log(`Snapshotting ${CIRCUIT} from ${BASE}\n`);

const [winnersJson, polesJson, fastestJson, lastRaceJson] = await Promise.all([
  get(`/circuits/${CIRCUIT}/results/1.json?limit=100`),
  get(`/circuits/${CIRCUIT}/qualifying/1.json?limit=100`),
  get(`/circuits/${CIRCUIT}/fastest/1/results.json?limit=100`),
  get(`/${LAST_RACE.season}/${LAST_RACE.round}/results.json?limit=100`),
]);

const winners = racesOf(winnersJson).flatMap((race) => {
  const r = race.Results?.[0];
  return r ? [toEntry(race, r.Driver, r.Constructor, r.Time?.time ?? null)] : [];
});

const poles = racesOf(polesJson).flatMap((race) => {
  const q = race.QualifyingResults?.[0];
  return q
    ? [toEntry(race, q.Driver, q.Constructor, q.Q3 ?? q.Q2 ?? q.Q1 ?? null)]
    : [];
});

const fastest = racesOf(fastestJson).flatMap((race) => {
  const r = race.Results?.[0];
  return r
    ? [toEntry(race, r.Driver, r.Constructor, r.FastestLap?.Time?.time ?? null)]
    : [];
});

const lastRaceWire = racesOf(lastRaceJson)[0] ?? null;
const lastRace = lastRaceWire
  ? {
      season: lastRaceWire.season,
      round: lastRaceWire.round,
      raceName: lastRaceWire.raceName,
      circuitName: lastRaceWire.Circuit.circuitName,
      dateIso: `${lastRaceWire.date}T${lastRaceWire.time ?? "00:00:00Z"}`,
        rows: (lastRaceWire.Results ?? []).map((r) => ({
        position: /^\d+$/.test(r.positionText) ? Number(r.position) : null,
        positionText: r.positionText,
        points: Number(r.points),
        gridPosition: Number(r.grid),
        laps: Number(r.laps),
        lapsDown: Math.max(
          0,
          Number(lastRaceWire.Results?.[0]?.laps ?? 0) - Number(r.laps),
        ),
        driver: {
          id: r.Driver.driverId,
          code: r.Driver.code ?? null,
          permanentNumber: r.Driver.permanentNumber
            ? Number(r.Driver.permanentNumber)
            : null,
          givenName: r.Driver.givenName,
          familyName: r.Driver.familyName,
          fullName: `${r.Driver.givenName} ${r.Driver.familyName}`,
          nationality: r.Driver.nationality,
          url: r.Driver.url,
        },
        constructor: {
          id: r.Constructor.constructorId,
          name: r.Constructor.name,
          nationality: r.Constructor.nationality,
          url: r.Constructor.url,
        },
        time: r.Time?.time ?? null,
        fastestLap: r.FastestLap?.Time?.time ?? null,
        status: r.status,
      })),
    }
  : null;

// A snapshot missing the winners would reintroduce the very failure it exists
// to prevent, so refuse rather than commit one.
if (winners.length === 0) {
  console.error("No winners returned — refusing to write an empty snapshot.");
  process.exit(1);
}

if (
  !lastRace ||
  lastRace.season !== LAST_RACE.season ||
  lastRace.round !== LAST_RACE.round ||
  lastRace.rows.length === 0
) {
  console.error("Last Sepang race is not the expected complete 2017 result.");
  process.exit(1);
}

writeFileSync(
  TMP,
  `${JSON.stringify(
    {
      $comment:
        "Generated by npm run snapshot:sepang. Do not edit by hand — see scripts/snapshot-sepang-history.mjs.",
      circuitId: CIRCUIT,
      winners,
      poles,
      fastest,
      lastRace,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
renameSync(TMP, OUT);

console.log(`  winners      ${winners.length}`);
console.log(`  poles        ${poles.length}`);
console.log(`  fastest laps ${fastest.length}`);
console.log(`  last race    ${lastRace ? `${lastRace.raceName}, ${lastRace.rows.length} rows` : "none"}`);
console.log(`\nWrote ${OUT}`);
