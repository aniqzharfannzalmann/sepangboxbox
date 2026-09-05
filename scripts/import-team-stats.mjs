#!/usr/bin/env node
/**
 * Import constructor career records from F1DB.
 *
 *   npm run import:teams
 *
 * Jolpica gives the current championship; it gives no history. F1DB (CC-BY-4.0)
 * carries every constructor's career back to 1950, plus a chronology of which
 * entries succeeded which — so Aston Martin can be shown both as itself and as
 * the continuation of Force India and Jordan.
 *
 * That distinction is the point. F1DB records Aston Martin with zero wins,
 * which is true of the entity that has raced since 2021 and misleading on its
 * own, because the entry it continued won at Spa in 1998 and again in 2020.
 * Both figures are imported and the page labels each.
 *
 * Run by hand, output committed to src/lib/f1/team-stats.json.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const OUT = fileURLToPath(new URL("../src/lib/f1/team-stats.json", import.meta.url));
const UA = "sepang-box-box/1.0 (team stats importer)";

/**
 * Ergast/Jolpica constructor id to F1DB id.
 *
 * Written out rather than matched, for the same reason as the circuits: an
 * automatic match that lands on the wrong entity fails silently. Most ids agree
 * and only the underscores differ.
 */
const ERGAST_TO_F1DB = {
  mercedes: "mercedes",
  ferrari: "ferrari",
  mclaren: "mclaren",
  red_bull: "red-bull",
  rb: "rb",
  alpine: "alpine",
  haas: "haas",
  audi: "audi",
  williams: "williams",
  aston_martin: "aston-martin",
  cadillac: "cadillac",
};

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

/** Minimal reader for the entries we need out of the release zip. */
function readZipEntries(buffer, wanted) {
  const out = {};
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  for (let i = 0; i < buffer.length - 4; i += 1) {
    if (view.getUint32(i, true) !== 0x04034b50) continue;
    const method = view.getUint16(i + 8, true);
    const compressedSize = view.getUint32(i + 18, true);
    const nameLength = view.getUint16(i + 26, true);
    const extraLength = view.getUint16(i + 28, true);
    const nameStart = i + 30;
    const name = buffer.toString("utf8", nameStart, nameStart + nameLength);
    if (!wanted.includes(name)) continue;

    const dataStart = nameStart + nameLength + extraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    // Method 0 is stored, 8 is raw deflate — zip entries carry no zlib header.
    out[name] = method === 0 ? raw : inflateRawSync(raw);
  }
  return out;
}

const RECORD = (c) => ({
  entries: c.totalRaceEntries ?? 0,
  starts: c.totalRaceStarts ?? 0,
  wins: c.totalRaceWins ?? 0,
  podiums: c.totalPodiums ?? 0,
  poles: c.totalPolePositions ?? 0,
  fastestLaps: c.totalFastestLaps ?? 0,
  titles: c.totalChampionshipWins ?? 0,
  points: Math.round(c.totalChampionshipPoints ?? 0),
});

const sumRecords = (records) =>
  records.reduce(
    (acc, r) => {
      for (const key of Object.keys(acc)) acc[key] += r[key];
      return acc;
    },
    {
      entries: 0,
      starts: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
      fastestLaps: 0,
      titles: 0,
      points: 0,
    },
  );

/* ------------------------------------------------------------------ */

console.log("Resolving latest F1DB release...");
const release = await getJson("https://api.github.com/repos/f1db/f1db/releases/latest");
const asset = release.assets.find((a) => a.name === "f1db-json-splitted.zip");
if (!asset) throw new Error("f1db-json-splitted.zip not in release");
console.log(`  ${release.tag_name}, published ${release.published_at.slice(0, 10)}`);

const zipRes = await fetch(asset.browser_download_url, { headers: { "User-Agent": UA } });
const zip = Buffer.from(await zipRes.arrayBuffer());
const entries = readZipEntries(zip, [
  "f1db-constructors.json",
  "f1db-constructors-chronology.json",
]);

const constructors = new Map(
  JSON.parse(entries["f1db-constructors.json"].toString("utf8")).map((c) => [c.id, c]),
);
const chronology = JSON.parse(
  entries["f1db-constructors-chronology.json"].toString("utf8"),
);
console.log(`  ${constructors.size} constructors, ${chronology.length} chronology rows\n`);

// Cross-check the mapping against the grid Jolpica actually reports, so a team
// that leaves or arrives shows up as a failure rather than a quiet omission.
const standings = await getJson(
  "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json?limit=100",
);
const grid = (
  standings.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
).map((s) => ({ id: s.Constructor.constructorId, name: s.Constructor.name }));

const teams = {};
const failures = [];

for (const { id, name } of grid) {
  const f1dbId = ERGAST_TO_F1DB[id];
  process.stdout.write(`${id.padEnd(14)}`);

  const own = f1dbId ? constructors.get(f1dbId) : null;
  if (!own) {
    console.log(`REJECTED - no F1DB entry for ${f1dbId ?? "(unmapped)"}`);
    failures.push(id);
    continue;
  }

  // Predecessors this entry continues, newest first, excluding itself.
  const parents = chronology
    .filter((row) => row.constructorId === f1dbId && row.parentConstructorId !== f1dbId)
    .map((row) => constructors.get(row.parentConstructorId))
    .filter(Boolean);

  const seen = new Set();
  const lineage = parents
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .map((p) => ({ id: p.id, name: p.fullName, record: RECORD(p) }))
    .sort((a, b) => b.record.entries - a.record.entries);

  teams[id] = {
    f1dbId,
    name,
    fullName: own.fullName,
    own: RECORD(own),
    lineage,
    // The entry's whole history, current entity plus everything it continued.
    combined: sumRecords([RECORD(own), ...lineage.map((l) => l.record)]),
  };

  const o = teams[id].own;
  const c = teams[id].combined;
  console.log(
    `ok - ${own.fullName.slice(0, 30).padEnd(32)}` +
      `${String(o.wins).padStart(3)} wins` +
      (c.wins !== o.wins ? ` (${c.wins} with lineage)` : "") +
      `  ${lineage.length} predecessor${lineage.length === 1 ? "" : "s"}`,
  );
}

const ordered = Object.fromEntries(
  Object.entries(teams).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(OUT, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");

console.log(`\n${Object.keys(teams).length}/${grid.length} teams imported`);
for (const id of failures) console.log(`  missing: ${id}`);
if (failures.length) process.exitCode = 1;
