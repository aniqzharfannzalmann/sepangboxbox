#!/usr/bin/env node
/**
 * Build circuit outlines from OpenStreetMap.
 *
 *   npm run maps:circuits          all circuits
 *   npm run maps:circuits sepang   just one
 *
 * Offline on purpose. Overpass is slow and rate-limited, and a circuit
 * outline never changes, so this runs by hand and commits its output to
 * src/lib/f1/circuit-maps.json. Nothing fetches OSM at request time.
 *
 * How it works
 *   1. Ask Overpass for highway=raceway ways near the circuit's coordinates.
 *   2. Drop pit lanes, kart tracks and service roads, then walk the endpoint
 *      graph to find closed loops — OSM splits a circuit into several ways.
 *   3. Keep the loop whose perimeter is closest to the circuit's published
 *      length.
 *
 * The published length is the safety gate. A loop that disagrees by more than
 * TOLERANCE is rejected and the circuit simply gets no map, because a wrong
 * track map is worse than none: F1 fans know these circuits by shape and an
 * incorrect one would discredit everything else on the page.
 *
 * Street circuits are expected to fail. OSM tags their roads as ordinary
 * streets rather than raceway, so there is no closed raceway loop to find.
 * That is reported, not worked around.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const OUT = fileURLToPath(new URL("../src/lib/f1/circuit-maps.json", import.meta.url));

/** Accepted disagreement between the measured loop and the published length. */
const TOLERANCE = 0.04;

/**
 * Published circuit lengths in metres, used only to verify the geometry.
 * These are reference values for the check — if one is wrong the circuit
 * fails the gate and loses its map, which is the safe direction to err.
 */
const OFFICIAL_METRES = {
  albert_park: 5278,
  shanghai: 5451,
  suzuka: 5807,
  miami: 5412,
  villeneuve: 4361,
  monaco: 3337,
  catalunya: 4657,
  red_bull_ring: 4318,
  silverstone: 5891,
  spa: 7004,
  hungaroring: 4381,
  zandvoort: 4259,
  monza: 5793,
  madring: 5474,
  baku: 6003,
  sepang: 5543,
  marina_bay: 4940,
  americas: 5513,
  rodriguez: 4304,
  interlagos: 4309,
  vegas: 6201,
  losail: 5419,
  yas_marina: 5281,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function circuits() {
  const res = await fetch("https://api.jolpi.ca/ergast/f1/2026.json?limit=100");
  const data = await res.json();
  return (data.MRData.RaceTable?.Races ?? []).map((r) => ({
    id: r.Circuit.circuitId,
    name: r.Circuit.circuitName,
    lat: Number(r.Circuit.Location.lat),
    lon: Number(r.Circuit.Location.long),
  }));
}

async function overpass(lat, lon) {
  const query = `[out:json][timeout:90];(way(around:3000,${lat},${lon})[highway=raceway];);out geom;`;
  // Overpass answers 406 to requests with no User-Agent, which is what Node's
  // fetch sends by default. Identifying the tool is the right thing to do
  // against a free public API in any case.
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "User-Agent": "sepang-box-box/1.0 (circuit outline builder)",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return res.json();
}

const key = (p) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;

function metres(a, b) {
  const k = Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((b.lon - a.lon) * k * 111320, (b.lat - a.lat) * 111320);
}

const perimeter = (pts) =>
  pts.reduce((sum, p, i) => (i ? sum + metres(pts[i - 1], p) : 0), 0);

/** Ways that could plausibly be part of the racing line. */
function raceLineWays(elements) {
  return elements.filter((e) => {
    const t = e.tags ?? {};
    if (t.sport !== "motor") return false; // excludes karting
    const name = (t.name ?? "").toLowerCase();
    if (/pit|handling|service|access|paddock/.test(name)) return false;
    return (e.geometry ?? []).length > 1;
  });
}

/** Depth-first walk over way endpoints, collecting closed rings. */
function closedLoops(ways, budget = Number(process.env.LOOP_BUDGET ?? 20000)) {
  const loops = [];
  let steps = 0;

  const walk = (start, at, used, pts) => {
    if (steps++ > budget) return;
    if (pts.length > 1 && at === start) {
      loops.push([...pts]);
      return;
    }
    for (const way of ways) {
      if (used.has(way.id)) continue;
      const g = way.geometry;
      const head = key(g[0]);
      const tail = key(g[g.length - 1]);
      let next = null;
      if (head === at) next = { pts: g.slice(1), end: tail };
      else if (tail === at) next = { pts: g.slice(0, -1).reverse(), end: head };
      if (!next) continue;
      used.add(way.id);
      walk(start, next.end, used, [...pts, ...next.pts]);
      used.delete(way.id);
    }
  };

  for (const way of ways) {
    const g = way.geometry;
    walk(key(g[0]), key(g[g.length - 1]), new Set([way.id]), [...g]);
  }

  return loops
    .map((pts) => ({ pts, m: perimeter(pts) }))
    .filter((l, i, all) => all.findIndex((o) => Math.abs(o.m - l.m) < 1) === i);
}

/**
 * Trace a loop the way a car drives it: at each junction, keep going straight.
 *
 * Exhaustive search does not scale here. OSM splits Silverstone into eighty-odd
 * ways named for individual corners (Copse, Maggotts, Hangar Straight) and COTA
 * into one per numbered turn, so trying every permutation of forty segments
 * never terminates. A racing line, though, runs straight through junctions
 * while slip roads and alternative layouts branch away at an angle — so
 * following the smallest change of heading traces it in one pass.
 *
 * Started from every way in turn; the caller keeps whichever result matches the
 * published length.
 */
function greedyLoops(ways) {
  const heading = (a, b) => {
    const k = Math.cos((a.lat * Math.PI) / 180);
    return Math.atan2(b.lat - a.lat, (b.lon - a.lon) * k);
  };
  const turn = (from, to) => {
    let d = Math.abs(to - from) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d;
  };

  const results = [];

  for (const seed of ways) {
    const used = new Set([seed.id]);
    let pts = [...seed.geometry];
    const startKey = key(pts[0]);

    for (let step = 0; step < ways.length + 2; step += 1) {
      const at = key(pts[pts.length - 1]);
      if (at === startKey && pts.length > 2) break;

      const inHeading = heading(pts[pts.length - 2], pts[pts.length - 1]);
      let best = null;

      for (const way of ways) {
        if (used.has(way.id)) continue;
        const g = way.geometry;
        let candidate = null;
        if (key(g[0]) === at) candidate = g;
        else if (key(g[g.length - 1]) === at) candidate = [...g].reverse();
        if (!candidate) continue;

        const delta = turn(inHeading, heading(candidate[0], candidate[1]));
        if (!best || delta < best.delta) best = { way, pts: candidate, delta };
      }

      if (!best) break;
      used.add(best.way.id);
      pts = [...pts, ...best.pts.slice(1)];
    }

    if (key(pts[pts.length - 1]) === startKey && pts.length > 2) {
      results.push({ pts, m: perimeter(pts) });
    }
  }

  return results.filter(
    (l, i, all) => all.findIndex((o) => Math.abs(o.m - l.m) < 1) === i,
  );
}

/** Ramer-Douglas-Peucker, to keep the committed JSON small. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  let index = 0;
  let maxDist = 0;
  const [first, last] = [points[0], points[points.length - 1]];

  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicular(points[i], first, last);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist <= epsilon) return [first, last];
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ];
}

function perpendicular(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/** Project to a 1000-wide box, preserving aspect and flipping to screen y. */
function toSvg(points) {
  const k = Math.cos((points[0].lat * Math.PI) / 180);
  const raw = points.map((p) => ({ x: p.lon * k, y: -p.lat }));
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const [mnx, mxx] = [Math.min(...xs), Math.max(...xs)];
  const [mny, mxy] = [Math.min(...ys), Math.max(...ys)];
  const scale = 1000 / (mxx - mnx);
  const height = Math.round((mxy - mny) * scale);

  const projected = raw.map((p) => ({
    x: (p.x - mnx) * scale,
    y: (p.y - mny) * scale,
  }));

  // 2 units of a 1000-wide box is well under a stroke width.
  const thinned = simplify(projected, 2);
  const round = (n) => Math.round(n * 10) / 10;
  const d =
    thinned.map((p, i) => `${i ? "L" : "M"}${round(p.x)} ${round(p.y)}`).join(" ") +
    " Z";

  return { d, viewBox: `0 0 1000 ${height}`, points: thinned.length };
}

/* ------------------------------------------------------------------ */

const only = process.argv.slice(2);
const all = await circuits();
const targets = only.length ? all.filter((c) => only.includes(c.id)) : all;

let existing = {};
try {
  existing = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
  // First run.
}

const report = [];

for (const circuit of targets) {
  const official = OFFICIAL_METRES[circuit.id];
  process.stdout.write(`${circuit.id.padEnd(15)}`);

  if (!official) {
    console.log("skipped - no published length to verify against");
    report.push({ id: circuit.id, status: "no-reference" });
    continue;
  }

  let loops = [];
  try {
    const data = await overpass(circuit.lat, circuit.lon);
    const ways = raceLineWays(data.elements ?? []);
    // Exhaustive search is exact on simple circuits; the greedy trace handles
    // the heavily-subdivided ones. Both feed the same length gate.
    loops = [...closedLoops(ways), ...greedyLoops(ways)];
  } catch (error) {
    console.log(`failed - ${error.message}`);
    report.push({ id: circuit.id, status: "fetch-failed" });
    await sleep(4000);
    continue;
  }

  const best = loops
    .map((l) => ({ ...l, error: Math.abs(l.m - official) / official }))
    .sort((a, b) => a.error - b.error)[0];

  if (!best || best.error > TOLERANCE) {
    const got = best ? `${(best.m / 1000).toFixed(3)} km` : "no closed loop";
    console.log(`rejected - ${got} vs ${(official / 1000).toFixed(3)} km published`);
    report.push({ id: circuit.id, status: "rejected", measured: best?.m ?? null });
    delete existing[circuit.id];
    await sleep(4000);
    continue;
  }

  const svg = toSvg(best.pts);
  existing[circuit.id] = {
    d: svg.d,
    viewBox: svg.viewBox,
    measuredMetres: Math.round(best.m),
    officialMetres: official,
    source: "OpenStreetMap contributors, ODbL",
  };
  console.log(
    `ok - ${(best.m / 1000).toFixed(3)} km vs ${(official / 1000).toFixed(3)} published ` +
      `(${(best.error * 100).toFixed(1)}% off, ${svg.points} points)`,
  );
  report.push({ id: circuit.id, status: "ok" });
  await sleep(4000);
}

writeFileSync(OUT, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

const ok = report.filter((r) => r.status === "ok").length;
console.log(`\n${ok}/${report.length} circuits verified. Wrote ${OUT}`);
for (const r of report.filter((x) => x.status !== "ok")) {
  console.log(`  no map: ${r.id} (${r.status})`);
}
