#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const checks = [
  ["src/lib/f1/gateway/types.ts", "GatewayResult"],
  ["src/lib/f1/gateway/index.ts", "GATEWAY_SOURCE"],
  ["src/lib/f1/weekend.ts", "gatewaySeasonSchedule"],
  ["src/lib/f1/standings.ts", "gatewayDriverStandings"],
  ["src/lib/f1/sources/jolpica.source.ts", "gatewayRaceResult"],
  ["docs/phase3-operations.md", "Provider Outage"],
];

for (const [path, expected] of checks) {
  if (!existsSync(`${root}/${path}`) || !read(path).includes(expected)) {
    console.error(`Phase 3 verification failed: ${path} is missing ${expected}`);
    process.exit(1);
  }
}

console.log(`Phase 3 verification passed: ${checks.length} gateway and operational invariants.`);
