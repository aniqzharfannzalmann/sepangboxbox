#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const checks = [
  ["src/lib/preferences/favorites.ts", "subscribeToFavorites"],
  ["src/components/preferences/FavoriteButton.tsx", "toggleFavorite"],
  ["src/components/preferences/FavouriteHighlights.tsx", "getServerFavorites"],
  ["src/app/page.tsx", "FavouriteHighlights"],
  ["docs/phase5-favourites.md", "localStorage"],
];
for (const [path, expected] of checks) {
  if (!existsSync(`${root}/${path}`) || !read(path).includes(expected)) {
    console.error(`Phase 5 verification failed: ${path} is missing ${expected}`);
    process.exit(1);
  }
}
console.log(`Phase 5 verification passed: ${checks.length} favourites invariants.`);
