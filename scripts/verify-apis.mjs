#!/usr/bin/env node
/**
 * Contract test against the real upstream APIs.
 *
 *   npm run verify:apis
 *
 * This is not a unit test — it deliberately hits the network, because the
 * failure mode it guards against is upstream changing under us: Jolpica
 * renaming a field, the Sepang round moving, a sprint being added to the
 * weekend, or OpenF1 tightening access again. Run it before every deploy and
 * on race morning.
 *
 * Exits non-zero on any failed assertion.
 */

const JOLPICA = "https://api.jolpi.ca/ergast/f1";
const OPEN_METEO = "https://api.open-meteo.com/v1";

let failures = 0;
let checks = 0;

function check(label, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function json(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.json();
}

/* ---------------------------------------------------------------- */

console.log("\nSepang round (2026/16)");
try {
  const race = (await json(`${JOLPICA}/2026/16.json`)).MRData?.RaceTable
    ?.Races?.[0];

  check("round resolves", Boolean(race));
  check(
    "circuit is Sepang",
    race?.Circuit?.circuitId === "sepang",
    `got ${race?.Circuit?.circuitId}`,
  );
  check(
    "race starts 2026-10-04T07:00:00Z",
    race?.date === "2026-10-04" && race?.time === "07:00:00Z",
    `got ${race?.date}T${race?.time}`,
  );
  check("has FP1, FP2, FP3 and Qualifying", [
    race?.FirstPractice,
    race?.SecondPractice,
    race?.ThirdPractice,
    race?.Qualifying,
  ].every(Boolean));

  // A sprint would add two sessions the schedule page does not currently
  // expect to see at Sepang. Fail loudly rather than silently omitting them.
  check(
    "weekend has no sprint",
    !race?.Sprint && !race?.SprintQualifying && !race?.SprintShootout,
    "a sprint appeared — session list needs updating",
  );

  // Race start must land on 15:00 in Malaysia. This is the conversion the
  // whole schedule page depends on.
  const mytRace = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(`${race.date}T${race.time}`));
  check("race reads 15:00 MYT", mytRace === "15:00", `got ${mytRace}`);
} catch (error) {
  check("Sepang round request", false, error.message);
}

/* ---------------------------------------------------------------- */

console.log("\nStandings");
try {
  const table = (await json(`${JOLPICA}/current/driverStandings.json?limit=100`))
    .MRData?.StandingsTable?.StandingsLists?.[0];
  const drivers = table?.DriverStandings ?? [];

  check("driver standings are non-empty", drivers.length > 0);
  check(
    "leader has the expected shape",
    Boolean(
      drivers[0]?.position &&
        drivers[0]?.points !== undefined &&
        drivers[0]?.Driver?.familyName &&
        Array.isArray(drivers[0]?.Constructors),
    ),
  );
  check(
    "points are numeric strings",
    drivers.every((d) => !Number.isNaN(Number(d.points))),
  );
} catch (error) {
  check("driver standings request", false, error.message);
}

try {
  const table = (
    await json(`${JOLPICA}/current/constructorStandings.json?limit=100`)
  ).MRData?.StandingsTable?.StandingsLists?.[0];
  const teams = table?.ConstructorStandings ?? [];

  check("constructor standings are non-empty", teams.length > 0);
  check(
    "leader has the expected shape",
    Boolean(teams[0]?.Constructor?.name && teams[0]?.points !== undefined),
  );
} catch (error) {
  check("constructor standings request", false, error.message);
}

/* ---------------------------------------------------------------- */

console.log("\nSepang history");
try {
  const winners =
    (await json(`${JOLPICA}/circuits/sepang/results/1.json?limit=100`)).MRData
      ?.RaceTable?.Races ?? [];

  check(
    "nineteen completed Malaysian GPs",
    winners.length === 19,
    `got ${winners.length}`,
  );

  // The 2026 running has no result yet and must never count as a win.
  check(
    "2026 is not in the winners list",
    !winners.some((r) => r.season === "2026"),
  );

  // The trap: Sepang was won by Michael Schumacher three times and by his
  // brother Ralf once. Tallying by family name invents a four-time winner.
  const ralf = winners.find((r) => r.season === "2002");
  check(
    "2002 was won by Ralf Schumacher",
    ralf?.Results?.[0]?.Driver?.driverId === "ralf_schumacher",
    `got ${ralf?.Results?.[0]?.Driver?.driverId}`,
  );

  const byId = {};
  for (const r of winners) {
    const id = r.Results[0].Driver.driverId;
    byId[id] = (byId[id] ?? 0) + 1;
  }
  check("Vettel leads with 4 wins", byId.vettel === 4, `got ${byId.vettel}`);
  check(
    "Michael Schumacher has 3, not 4",
    byId.michael_schumacher === 3,
    `got ${byId.michael_schumacher}`,
  );

  const poles =
    (await json(`${JOLPICA}/circuits/sepang/qualifying/1.json?limit=100`))
      .MRData?.RaceTable?.Races ?? [];
  check(
    "pole data covers 16 of the 19 races",
    poles.length === 16,
    `got ${poles.length} - the page says none were recorded before 2002`,
  );

  const fastest =
    (await json(`${JOLPICA}/circuits/sepang/fastest/1/results.json?limit=100`))
      .MRData?.RaceTable?.Races ?? [];
  const times = fastest
    .map((r) => r.Results?.[0]?.FastestLap?.Time?.time)
    .filter(Boolean)
    .map((t) => {
      const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(t);
      return m ? { t, s: (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.s - b.s);
  check("lap record is 1:34.080", times[0]?.t === "1:34.080", `got ${times[0]?.t}`);
} catch (error) {
  check("Sepang history requests", false, error.message);
}

console.log("\nPit stops");
try {
  const stops =
    (await json(`${JOLPICA}/2026/12/pitstops.json?limit=100`)).MRData?.RaceTable
      ?.Races?.[0]?.PitStops ?? [];
  // Ergast has always carried these; the live page once wrongly said they
  // needed OpenF1. If this ever empties, that panel silently goes quiet.
  check(
    "Jolpica serves pit stops for a race",
    stops.length > 0,
    `got ${stops.length}`,
  );
  check(
    "stops carry driver, lap and duration",
    Boolean(stops[0]?.driverId && stops[0]?.lap && stops[0]?.duration),
  );
} catch (error) {
  check("pit stop request", false, error.message);
}

console.log("\nOpen-Meteo (weather at Sepang)");
try {
  // The whole reason this source was chosen: no key, no account, no card. If
  // that ever changes, it will change here first.
  const response = await fetch(
    `${OPEN_METEO}/forecast?latitude=2.7603&longitude=101.7382` +
      "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability" +
      "&timezone=Asia%2FKuala_Lumpur&forecast_days=1",
  );
  check("forecast responds without an API key", response.ok, `status ${response.status}`);

  const json = await response.json();
  const hourly = json.hourly ?? {};
  check(
    "carries the fields the weather panel reads",
    Array.isArray(hourly.time) &&
      Array.isArray(hourly.temperature_2m) &&
      Array.isArray(hourly.relative_humidity_2m) &&
      Array.isArray(hourly.precipitation_probability),
  );
  check(
    "returns local Malaysian time, not UTC",
    json.utc_offset_seconds === 28800,
    `offset ${json.utc_offset_seconds}s`,
  );

  // How far ahead a forecast reaches decides whether the Sepang page shows a
  // forecast or the historical record, so it is worth reporting rather than
  // assuming. 16 days is the documented limit.
  const far = await fetch(
    `${OPEN_METEO}/forecast?latitude=2.7603&longitude=101.7382` +
      "&daily=temperature_2m_max&timezone=Asia%2FKuala_Lumpur&forecast_days=16",
  );
  const days = (await far.json()).daily?.time ?? [];
  const race = "2026-10-04";
  console.log(
    `  note  forecast reaches ${days.at(-1) ?? "?"}; race day ${race} is ` +
      `${days.includes(race) ? "inside" : "beyond"} the window`,
  );
} catch (error) {
  check("Open-Meteo probe completed without throwing", false, error.message);
}

/* ---------------------------------------------------------------- */

console.log("\nCircuit maps (committed from F1DB)");
try {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const maps = JSON.parse(
    readFileSync(
      fileURLToPath(new URL("../src/lib/f1/circuit-maps.json", import.meta.url)),
      "utf8",
    ),
  );

  const calendar = await json(`${JOLPICA}/2026.json?limit=100`);
  const circuitIds = (calendar.MRData?.RaceTable?.Races ?? []).map(
    (r) => r.Circuit.circuitId,
  );
  const missing = circuitIds.filter((id) => !maps[id]);
  check(
    "every 2026 circuit has an outline",
    circuitIds.length === 23 && missing.length === 0,
    missing.length ? `missing ${missing.join(", ")}` : `${circuitIds.length} rounds`,
  );

  // The trap this guards: Caesars Palace and the Strip circuit are both in Las
  // Vegas, and matching on coordinates picks the 1981 car park layout. Getting
  // this wrong puts a 3.65 km circuit on the 2026 Las Vegas page.
  check(
    "Las Vegas maps to the Strip circuit, not Caesars Palace",
    maps.vegas?.f1dbCircuitId === "las-vegas",
    `got ${maps.vegas?.f1dbCircuitId}`,
  );
  check(
    "Las Vegas reads 6.201 km, not 3.65",
    maps.vegas?.lengthKm === 6.201,
    `got ${maps.vegas?.lengthKm}`,
  );

  // Silverstone has eight layouts on record; only the current one is right.
  check(
    "Silverstone uses the current layout",
    maps.silverstone?.layoutId === "silverstone-8" &&
      maps.silverstone?.lengthKm === 5.891,
    `got ${maps.silverstone?.layoutId} at ${maps.silverstone?.lengthKm} km`,
  );

  check(
    "Sepang reads 5.543 km and 15 turns",
    maps.sepang?.lengthKm === 5.543 && maps.sepang?.turns === 15,
    `got ${maps.sepang?.lengthKm} km, ${maps.sepang?.turns} turns`,
  );

  check(
    "every outline carries path data and a viewBox",
    Object.values(maps).every(
      (m) => m.viewBox && m.paths?.length > 0 && m.paths[0].d?.length > 50,
    ),
  );

  // The detailed artwork draws the track plus a start line and marker. If a
  // circuit drops to one path it has quietly fallen back to a bare outline.
  const bare = Object.entries(maps)
    .filter(([, m]) => (m.paths?.length ?? 0) < 3)
    .map(([id]) => id);
  check(
    "every circuit has the detailed artwork, not just an outline",
    bare.length === 0,
    bare.length ? `only an outline for ${bare.join(", ")}` : "3 paths each",
  );

  // The viewBox is cropped to the drawing by a path parser at import time. A
  // bug in it once produced boxes 750 units wide on a 500-unit canvas, which
  // renders as a tiny circuit adrift in empty space. Bounds that escape the
  // canvas mean the parser is wrong again.
  const escaped = Object.entries(maps).filter(([, m]) => {
    const [x, y, w, h] = m.viewBox.split(" ").map(Number);
    return x < -30 || y < -30 || w > 540 || h > 540 || w <= 0 || h <= 0;
  });
  check(
    "every viewBox stays inside the source canvas",
    escaped.length === 0,
    escaped.length ? escaped.map(([id, m]) => `${id}: ${m.viewBox}`).join("; ") : "",
  );

  // Cropping is the whole point — an uncropped square box wastes up to half
  // the frame on circuits like Madrid, which is 94% wide but 57% tall.
  const uncropped = Object.entries(maps)
    .filter(([, m]) => m.viewBox === "0 0 500 500")
    .map(([id]) => id);
  check(
    "viewBoxes are cropped to the drawing",
    uncropped.length === 0,
    uncropped.length ? `still square: ${uncropped.join(", ")}` : "",
  );
} catch (error) {
  check("circuit map data", false, error.message);
}

console.log("\nTeams");
try {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const read = (rel) =>
    JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

  const teamStats = read("../src/lib/f1/team-stats.json");
  const colourSource = readFileSync(
    fileURLToPath(new URL("../src/lib/f1/team-colours.ts", import.meta.url)),
    "utf8",
  );

  const standings = await json(
    `${JOLPICA}/current/constructorStandings.json?limit=100`,
  );
  const grid = (
    standings.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  ).map((s) => s.Constructor.constructorId);

  check("eleven constructors on the 2026 grid", grid.length === 11, `got ${grid.length}`);

  // A team joining or leaving must surface here rather than as a row with no
  // colour and no history.
  const noStats = grid.filter((id) => !teamStats[id]);
  check(
    "every team on the grid has a career record",
    noStats.length === 0,
    noStats.length ? `missing ${noStats.join(", ")}` : "",
  );

  const noColour = grid.filter((id) => !new RegExp(`^\\s*${id}:`, "m").test(colourSource));
  check(
    "every team on the grid has a livery colour",
    noColour.length === 0,
    noColour.length ? `missing ${noColour.join(", ")}` : "",
  );

  // Lineage is the reason these pages do not read "Aston Martin, 0 wins".
  check(
    "Aston Martin carries its predecessors",
    teamStats.aston_martin?.own.wins === 0 &&
      teamStats.aston_martin?.combined.wins > 0,
    `own ${teamStats.aston_martin?.own.wins}, combined ${teamStats.aston_martin?.combined.wins}`,
  );
  check(
    "Ferrari's record is its own",
    teamStats.ferrari?.own.wins === teamStats.ferrari?.combined.wins &&
      teamStats.ferrari?.own.wins > 200,
    `${teamStats.ferrari?.own.wins} wins`,
  );
} catch (error) {
  check("team data", false, error.message);
}

console.log(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures > 0 ? 1 : 0);
