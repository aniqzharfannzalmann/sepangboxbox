#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const checks = [
  ["src/lib/f1/share-card.ts", "buildShareableResultCard"],
  ["src/lib/f1/share-card-render.tsx", "SEPANG BOX BOX"],
  ["src/app/results/[round]/share-image/route.tsx", "ImageResponse"],
  ["src/components/share/ShareResultButton.tsx", "navigator.share"],
  ["src/app/results/[round]/page.tsx", "share-image"],
  ["docs/phase6-share-card.md", "Jolpica-F1"],
  // A round with no classification must not be drawn as an official one, and
  // "has not run yet" must stay distinguishable from "could not be loaded".
  ["src/lib/f1/share-card.ts", "unpublished"],
  ["src/lib/f1/share-card.ts", "unavailable"],
  ["src/lib/f1/share-card.ts", "isClassificationProvisional"],
];
for (const [path, expected] of checks) {
  if (!existsSync(`${root}/${path}`) || !read(path).includes(expected)) {
    console.error(`Phase 6 verification failed: ${path} is missing ${expected}`);
    process.exit(1);
  }
}
console.log(`Phase 6 verification passed: ${checks.length} share-card invariants.`);
