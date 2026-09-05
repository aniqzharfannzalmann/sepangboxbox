#!/usr/bin/env node
/**
 * Import circuit outlines and metadata from F1DB.
 *
 *   npm run maps:circuits
 *
 * Two sources, each for what it is best at:
 *   - F1DB (https://github.com/f1db/f1db, CC-BY-4.0) for metadata — length,
 *     turns, direction, type, and which layout is currently in use.
 *   - julesr0y/f1-circuits-svg (CC-BY-4.0) for the artwork, whose `detailed`
 *     set draws the start line and marker as well as the outline.
 *
 * Together they replaced an earlier pipeline that traced outlines from
 * OpenStreetMap, which reached only fifteen of the twenty-three circuits —
 * street circuits are tagged as ordinary roads there, and Silverstone and COTA
 * are split into eighty-odd ways named per corner that would not reassemble.
 *
 * Run by hand, output committed. Nothing fetches F1DB at request time: an
 * outline does not change between releases.
 *
 * The mapping is the dangerous part — see ERGAST_TO_F1DB below.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const OUT = fileURLToPath(new URL("../src/lib/f1/circuit-maps.json", import.meta.url));
const UA = "sepang-box-box/1.0 (circuit map importer)";

/**
 * Outline artwork comes from julesr0y/f1-circuits-svg (CC BY 4.0), not from
 * F1DB's own assets.
 *
 * Both are the same lineage — the track path is byte-for-byte the same shape —
 * but this repository also publishes a `detailed` set that adds the start line
 * and start marker on top of the outline. It covers 25 layouts, which happens
 * to include all 23 on the 2026 calendar.
 *
 * Metadata (length, turns, direction, type, layout selection) still comes from
 * F1DB below; this is artwork only.
 */
const SVG_BASE =
  "https://raw.githubusercontent.com/julesr0y/f1-circuits-svg/main/circuits/detailed/white";

/**
 * Ergast/Jolpica circuit id to F1DB circuit id.
 *
 * Written out rather than matched automatically, because automatic matching
 * fails silently and badly here. Matching on coordinates pairs `vegas` with
 * `caesars-palace` — the 1981-82 car park circuit, 3.65 km — instead of
 * `las-vegas`, the 6.201 km Strip circuit, because both sit in Las Vegas and
 * the wrong one happens to be nearer to the published coordinate. That would
 * have put a 1981 layout on the 2026 Las Vegas page with nothing to flag it.
 *
 * Every entry is checked below against coordinates and race count anyway.
 */
const ERGAST_TO_F1DB = {
  albert_park: "melbourne",
  americas: "austin",
  baku: "baku",
  catalunya: "catalunya",
  hungaroring: "hungaroring",
  interlagos: "interlagos",
  losail: "lusail",
  madring: "madring",
  marina_bay: "marina-bay",
  miami: "miami",
  monaco: "monaco",
  monza: "monza",
  red_bull_ring: "spielberg",
  rodriguez: "mexico-city",
  sepang: "sepang",
  shanghai: "shanghai",
  silverstone: "silverstone",
  spa: "spa-francorchamps",
  suzuka: "suzuka",
  vegas: "las-vegas",
  villeneuve: "montreal",
  yas_marina: "yas-marina",
  zandvoort: "zandvoort",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

/** Minimal reader for the stored (uncompressed) and deflated entries we need. */
function readZipEntries(buffer, wanted) {
  const out = {};
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Walk local file headers; the archive is small and flat.
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

function kmApart(a, b) {
  const k = Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((a.lon - b.lon) * k * 111.32, (a.lat - b.lat) * 111.32);
}

/**
 * Pull every path out of a circuit asset, keeping enough of each one's style
 * to redraw it.
 *
 * The detailed assets carry three: the track outline as a thick stroke, the
 * start line as a thin one, and a small filled start marker. Colours are
 * deliberately dropped — those come from the design tokens — but fill-versus-
 * stroke and the relative widths have to survive, or the marker renders as an
 * outline and the track as a blob.
 */
function extractPaths(svg) {
  const paths = [];

  for (const match of svg.matchAll(/<path\b[^>]*>/g)) {
    const tag = match[0];
    const d = /\sd="([^"]+)"/.exec(tag)?.[1];
    if (!d) continue;

    const style = /style="([^"]*)"/.exec(tag)?.[1] ?? "";
    const prop = (name) =>
      new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim();

    const fill = prop("fill");
    paths.push({
      d,
      filled: Boolean(fill && fill !== "none"),
      strokeWidth: Number(prop("stroke-width") ?? 0),
      linecap: prop("stroke-linecap") ?? "round",
      linejoin: prop("stroke-linejoin") ?? "round",
    });
  }

  if (paths.length === 0) throw new Error("no path data");

  // The assets are drawn on a square 500x500 canvas, but almost no circuit is
  // square: Madrid fills 94% of the width and 57% of the height, so nearly
  // half the frame is empty and the drawing renders small. Crop the viewBox to
  // what is actually drawn, padded by half the widest stroke so the line is
  // not clipped, and the map fills its space in both directions.
  const boxes = paths.map((p) => pathBounds(p.d));
  const pad = Math.max(...paths.map((p) => p.strokeWidth)) / 2 + 2;
  const minX = Math.min(...boxes.map((b) => b[0])) - pad;
  const minY = Math.min(...boxes.map((b) => b[1])) - pad;
  const maxX = Math.max(...boxes.map((b) => b[2])) + pad;
  const maxY = Math.max(...boxes.map((b) => b[3])) + pad;
  const round = (n) => Math.round(n * 10) / 10;

  return {
    paths,
    viewBox: `${round(minX)} ${round(minY)} ${round(maxX - minX)} ${round(maxY - minY)}`,
  };
}

/**
 * Rough bounds of a path.
 *
 * A cubic bezier is contained by its control points, so taking the extremes of
 * every coordinate gives a box that is correct and slightly generous — which
 * is the safe direction when it decides the crop.
 */
function pathBounds(d) {
  const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  // SVG packs numbers: ".114.009" is two of them, so the pattern has to be
  // able to start at a dot and stop at the next one.
  const tokens =
    d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];

  let x = 0;
  let y = 0;
  let cmd = "M";
  const xs = [];
  const ys = [];

  for (let i = 0; i < tokens.length; ) {
    if (/[A-Za-z]/.test(tokens[i])) {
      cmd = tokens[i];
      i += 1;
      if (cmd.toUpperCase() === "Z") continue;
    }
    const upper = cmd.toUpperCase();
    const relative = cmd === cmd.toLowerCase();
    const count = ARGS[upper];
    const values = tokens.slice(i, i + count).map(Number);
    if (values.length < count) break;
    i += count;

    let points;
    if (upper === "H") points = [[values[0], null]];
    else if (upper === "V") points = [[null, values[0]]];
    else if (upper === "A") points = [[values[5], values[6]]];
    else {
      points = Array.from({ length: count / 2 }, (_, k) => [
        values[k * 2],
        values[k * 2 + 1],
      ]);
    }

    // Every pair in a command is relative to the point the command started
    // from — not to the pair before it. Accumulating them makes the pen drift
    // and the bounds blow past the canvas.
    let lastX = x;
    let lastY = y;
    for (const [dx, dy] of points) {
      lastX = dx === null ? x : relative ? x + dx : dx;
      lastY = dy === null ? y : relative ? y + dy : dy;
      xs.push(lastX);
      ys.push(lastY);
    }
    x = lastX;
    y = lastY;

    // A repeated coordinate pair after M continues the subpath as L.
    if (cmd === "M") cmd = "L";
    if (cmd === "m") cmd = "l";
  }

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/* ------------------------------------------------------------------ */

console.log("Resolving latest F1DB release...");
const release = await getJson("https://api.github.com/repos/f1db/f1db/releases/latest");
const tag = release.tag_name;
const asset = release.assets.find((a) => a.name === "f1db-json-splitted.zip");
if (!asset) throw new Error("f1db-json-splitted.zip not in release");
console.log(`  ${tag}, published ${release.published_at.slice(0, 10)}`);

const zipRes = await fetch(asset.browser_download_url, { headers: { "User-Agent": UA } });
const zip = Buffer.from(await zipRes.arrayBuffer());
const entries = readZipEntries(zip, ["f1db-circuits.json", "f1db-circuits-layouts.json"]);

const circuits = new Map(
  JSON.parse(entries["f1db-circuits.json"].toString("utf8")).map((c) => [c.id, c]),
);
const effective = new Map();
for (const layout of JSON.parse(entries["f1db-circuits-layouts.json"].toString("utf8"))) {
  if (layout.effective) effective.set(layout.circuitId, layout);
}
console.log(`  ${circuits.size} circuits, ${effective.size} effective layouts\n`);

const calendar = await getJson("https://api.jolpi.ca/ergast/f1/2026.json?limit=100");
const races = calendar.MRData.RaceTable.Races;

const maps = {};
const failures = [];

for (const race of races) {
  const ergastId = race.Circuit.circuitId;
  const f1dbId = ERGAST_TO_F1DB[ergastId];
  process.stdout.write(`${ergastId.padEnd(15)}`);

  const fail = (why) => {
    console.log(`REJECTED - ${why}`);
    failures.push({ ergastId, why });
  };

  if (!f1dbId) {
    fail("no mapping entry");
    continue;
  }
  const circuit = circuits.get(f1dbId);
  const layout = effective.get(f1dbId);
  if (!circuit || !layout) {
    fail(`F1DB has no ${!circuit ? "circuit" : "effective layout"} for ${f1dbId}`);
    continue;
  }

  // Gate 1: the two sources must at least agree on the city.
  //
  // Deliberately loose. Sources pick different reference points on the same
  // circuit — Jolpica puts Las Vegas at the south end of the Strip and F1DB
  // 7.5 km north — so a tight radius rejects correct pairings. This only
  // catches a mapping that landed in the wrong place entirely; telling two
  // circuits in the same city apart is gate 2's job.
  const apart = kmApart(
    { lat: Number(race.Circuit.Location.lat), lon: Number(race.Circuit.Location.long) },
    { lat: circuit.latitude, lon: circuit.longitude },
  );
  if (apart > 25) {
    fail(`${apart.toFixed(1)} km from the Jolpica coordinate`);
    continue;
  }

  // Gate 2: and on how many races have been held there. This is what catches
  // a plausible-but-wrong pairing: Caesars Palace held 2, the Strip circuit 3,
  // and Jolpica counts 4 including the scheduled 2026 round. A correct match
  // differs by 0 or 1; the wrong one differs by 2.
  await sleep(400);
  const held = await getJson(
    `https://api.jolpi.ca/ergast/f1/circuits/${ergastId}/races.json?limit=1`,
  );
  const jolpicaRaces = Number(held.MRData.total ?? 0);
  const diff = jolpicaRaces - circuit.totalRacesHeld;
  if (diff < 0 || diff > 1) {
    fail(
      `race counts disagree - F1DB ${circuit.totalRacesHeld}, Jolpica ${jolpicaRaces}`,
    );
    continue;
  }

  const svg = await getText(`${SVG_BASE}/${layout.id}.svg`);
  const art = extractPaths(svg);

  maps[ergastId] = {
    f1dbCircuitId: f1dbId,
    layoutId: layout.id,
    // Colour is deliberately not carried over: it comes from the design
    // tokens so the outline follows the palette like everything else.
    paths: art.paths,
    viewBox: art.viewBox,
    lengthKm: layout.length,
    turns: layout.turns,
    type: circuit.type,
    direction: circuit.direction,
    racesHeld: circuit.totalRacesHeld,
  };

  console.log(
    `ok - ${layout.id.padEnd(20)} ${String(layout.length).padStart(5)} km  ` +
      `${String(layout.turns).padStart(2)} turns  ${String(art.paths.length)} paths  ${circuit.type}`,
  );
  await sleep(200);
}

const ordered = Object.fromEntries(Object.entries(maps).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");

console.log(`\n${Object.keys(maps).length}/${races.length} circuits imported from F1DB ${tag}`);
for (const f of failures) console.log(`  no map: ${f.ergastId} (${f.why})`);
if (failures.length) process.exitCode = 1;
