#!/usr/bin/env node
/**
 * Lightweight race-weekend release gate.
 *
 * This intentionally uses only Node so it can run in CI before a test runner
 * is introduced. It validates the committed data and the route invariants that
 * keep the race-weekend experience honest.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const fail = (message) => {
  console.error(`Phase 1 verification failed: ${message}`);
  process.exit(1);
};

const season = JSON.parse(read("src/lib/f1/season.static.json"));
if (!Array.isArray(season) || season.length === 0) fail("season snapshot is empty");

const rounds = new Set();
for (const race of season) {
  if (race.season !== "2026") fail(`unexpected season on round ${race.round}`);
  if (rounds.has(race.round)) fail(`duplicate round ${race.round}`);
  rounds.add(race.round);
  if (!race.sessions?.some((session) => session.kind === "race")) {
    fail(`round ${race.round} has no race session`);
  }
  for (const session of race.sessions) {
    const starts = Date.parse(session.startsAtIso);
    const ends = Date.parse(session.endsAtIso);
    if (!Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts) {
      fail(`invalid session window on round ${race.round}`);
    }
  }
}

const sepang = season.find((race) => race.circuitId === "sepang");
if (!sepang || sepang.round !== "16") fail("Sepang is not round 16");

const routeChecks = [
  ["src/app/results/[round]/page.tsx", "const weekend = season.data.find"],
  ["src/app/live/preview/[round]/page.tsx", "season.data.some"],
  ["src/components/weekend/SessionCommandCenter.tsx", "SessionCommandCenter"],
  ["src/components/weekend/VerifiedVenueGuide.tsx", "official venue information"],
];
for (const [path, text] of routeChecks) {
  if (!existsSync(`${root}/${path}`) || !read(path).includes(text)) {
    fail(`missing Phase 1 route invariant in ${path}`);
  }
}

console.log(`Phase 1 verification passed: ${season.length} rounds, ${rounds.size} unique rounds, Sepang round ${sepang.round}.`);
