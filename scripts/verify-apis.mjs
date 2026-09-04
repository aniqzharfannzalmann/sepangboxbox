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
const OPENF1 = "https://api.openf1.org/v1";

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

console.log("\nOpenF1 access tier");
try {
  const response = await fetch(`${OPENF1}/sessions?year=2024&session_name=Race`);
  if (response.status === 401) {
    console.log(
      "  note  401 — anonymous access is locked (a session is live, or the free tier changed)",
    );
    console.log("        Live timing needs OPENF1_API_KEY. Expected on the free tier.");
  } else if (response.ok) {
    const rows = await response.json();
    console.log(
      `  note  historical access open — ${Array.isArray(rows) ? rows.length : 0} sessions returned`,
    );
  } else {
    console.log(`  note  unexpected status ${response.status}`);
  }
  // Never a failure: this endpoint's availability is outside our control and
  // the app is built to work without it.
  check("OpenF1 probe completed without throwing", true);
} catch (error) {
  check("OpenF1 probe completed without throwing", false, error.message);
}

/* ---------------------------------------------------------------- */

console.log(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures > 0 ? 1 : 0);
