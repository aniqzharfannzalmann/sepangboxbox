#!/usr/bin/env node
/*
 * A loading.tsx must never sit at or above a page that can call notFound().
 *
 * A loading boundary is a Suspense boundary, and Suspense makes Next stream:
 * the status line is flushed before the page body runs, so a later notFound()
 * cannot set 404. The not-found page still renders, but with HTTP 200 — which
 * means crawlers index rounds that do not exist and uptime checks pass on
 * missing pages. Nothing in the type system catches it and the build stays
 * green, so it is asserted here instead.
 *
 * See the note in src/components/ui/Skeleton.tsx.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appDir = `${root}/src/app`;

/** Every directory under src/app, as a route-ish path relative to src/app. */
function walk(dir, prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      found.push({ dir: full, route: `${prefix}/${entry}` });
      found.push(...walk(full, `${prefix}/${entry}`));
    }
  }
  return found;
}

const segments = [{ dir: appDir, route: "" }, ...walk(appDir)];
const hasLoading = new Set(
  segments
    .filter(({ dir }) => {
      try {
        statSync(`${dir}/loading.tsx`);
        return true;
      } catch {
        return false;
      }
    })
    .map(({ route }) => route),
);

const violations = [];
for (const { dir, route } of segments) {
  let page;
  try {
    page = readFileSync(`${dir}/page.tsx`, "utf8");
  } catch {
    continue;
  }
  if (!page.includes("notFound()")) continue;

  // Walk this route and every ancestor segment looking for a boundary.
  const parts = route.split("/").filter(Boolean);
  for (let i = parts.length; i >= 0; i -= 1) {
    const ancestor = i === 0 ? "" : `/${parts.slice(0, i).join("/")}`;
    if (hasLoading.has(ancestor)) {
      violations.push({ page: `src/app${route}/page.tsx`, boundary: `src/app${ancestor}/loading.tsx` });
    }
  }
}

if (violations.length > 0) {
  console.error("Routing verification failed: a loading boundary would turn notFound() into HTTP 200.\n");
  for (const { page, boundary } of violations) {
    console.error(`  ${boundary}`);
    console.error(`    covers ${page}, which calls notFound()`);
  }
  console.error("\nMove the boundary down to routes that only ever render, or delete it.");
  console.error("See the note in src/components/ui/Skeleton.tsx.");
  process.exit(1);
}

const guarded = segments.filter(({ dir }) => {
  try {
    return readFileSync(`${dir}/page.tsx`, "utf8").includes("notFound()");
  } catch {
    return false;
  }
}).length;

console.log(`Routing verification passed: ${guarded} notFound() routes, none behind a loading boundary.`);
