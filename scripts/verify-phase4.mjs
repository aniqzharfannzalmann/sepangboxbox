#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const checks = [
  ["src/lib/f1/editorial.ts", "buildWhatToWatch"],
  ["src/lib/f1/editorial.ts", "buildRaceRecap"],
  ["src/components/editorial/WhatToWatch.tsx", "WhatToWatch"],
  ["src/components/editorial/SessionRecap.tsx", "SessionRecap"],
  ["src/app/results/[round]/page.tsx", "buildQualifyingRecap"],
  ["docs/phase4-editorial.md", "provisional"],
];
for (const [path, expected] of checks) {
  if (!existsSync(`${root}/${path}`) || !read(path).includes(expected)) {
    console.error(`Phase 4 verification failed: ${path} is missing ${expected}`);
    process.exit(1);
  }
}
console.log(`Phase 4 verification passed: ${checks.length} editorial invariants.`);
