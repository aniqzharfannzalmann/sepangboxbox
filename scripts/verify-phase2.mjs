#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const checks = [
  ["src/lib/preferences/favorites.ts", "localStorage"],
  ["src/components/preferences/LowDataToggle.tsx", "aria-pressed"],
  ["src/components/share/CopyLinkButton.tsx", "clipboard"],
  ["src/components/schedule/AddToCalendarButton.tsx", "text/calendar"],
  ["src/app/compare/page.tsx", "CopyLinkButton"],
  ["src/app/schedule/page.tsx", "AddToCalendarButton"],
  ["docs/phase2-operations.md", "Privacy"],
];

for (const [path, expected] of checks) {
  if (!existsSync(`${root}/${path}`) || !read(path).includes(expected)) {
    console.error(`Phase 2 verification failed: ${path} is missing ${expected}`);
    process.exit(1);
  }
}

console.log(`Phase 2 verification passed: ${checks.length} engagement and utility invariants.`);
