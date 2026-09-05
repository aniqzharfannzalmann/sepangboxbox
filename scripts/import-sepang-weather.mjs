#!/usr/bin/env node
/**
 * Regenerate src/lib/f1/sepang-weather.json from the Open-Meteo archive.
 *
 *   npm run import:weather
 *
 * What early-October weather at Sepang actually looks like, measured rather
 * than asserted. Sepang's reputation for afternoon storms is the single most
 * Sepang-specific thing about this race weekend, and 2026 puts three of the
 * five sessions — FP2 and Qualifying at 16:00, the race at 15:00 MYT — right
 * in the window when they arrive.
 *
 * This is committed rather than fetched at runtime for the same reason
 * season.static.json and team-stats.json are: it is history, so it cannot
 * change, and a page should not make fifteen network requests to render a
 * number that was settled years ago. The forecast is the part that has to be
 * live, and that is one request, made only once the race is close enough for a
 * forecast to exist at all.
 *
 * Open-Meteo's archive is free, keyless and has no account. That matters here:
 * the project is a zero-cost build and this is the only weather source that
 * fits without a card on file.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(
  new URL("../src/lib/f1/sepang-weather.json", import.meta.url),
);

/** Sepang International Circuit. */
const LATITUDE = 2.7603;
const LONGITUDE = 101.7382;
const TZ = "Asia/Kuala_Lumpur";

/**
 * Years sampled, most recent first when reported.
 *
 * Fifteen is a compromise. Too few and one freak storm dominates the rate;
 * too many and the sample reaches back into a measurably different climate.
 * ERA5 covers all of it.
 */
const FROM_YEAR = 2011;
const TO_YEAR = 2025;

/**
 * The 2026 Sepang sessions, in local Malaysian time, with nominal durations.
 *
 * Mirrored from season.static.json and SESSION_MINUTES in jolpica.ts — keep
 * them in step. Held here as local wall-clock rather than as instants because
 * that is the question being asked: what is it like at Sepang at 4pm in early
 * October, in any year.
 */
const SESSIONS = [
  { kind: "fp1", label: "Practice 1", monthDay: "10-02", hour: 12, minutes: 60 },
  { kind: "fp2", label: "Practice 2", monthDay: "10-02", hour: 16, minutes: 60 },
  { kind: "fp3", label: "Practice 3", monthDay: "10-03", hour: 12, minutes: 60 },
  { kind: "quali", label: "Qualifying", monthDay: "10-03", hour: 16, minutes: 60 },
  { kind: "race", label: "Race", monthDay: "10-04", hour: 15, minutes: 150 },
];

/**
 * Rain that would actually change a session, in millimetres over its length.
 *
 * ERA5 records drizzle far below what a car notices. 0.5mm across a session is
 * the point where a dry line stops being a dry line; a 0.05mm trace is not a
 * wet race and should not be counted as one.
 */
const WET_MM = 0.5;

const hoursCovered = (hour, minutes) => {
  const span = [];
  for (let h = hour; h < hour + Math.ceil(minutes / 60); h++) span.push(h);
  return span;
};

async function archiveYear(year) {
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
    `&start_date=${year}-10-01&end_date=${year}-10-05` +
    "&hourly=temperature_2m,relative_humidity_2m,precipitation" +
    `&timezone=${encodeURIComponent(TZ)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${year}: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (json.error) throw new Error(`${year}: ${json.reason}`);

  // Index by local "YYYY-MM-DDTHH" so a session can look its hours up directly.
  const byHour = new Map();
  json.hourly.time.forEach((stamp, i) => {
    byHour.set(stamp.slice(0, 13), {
      airTempC: json.hourly.temperature_2m[i],
      humidityPct: json.hourly.relative_humidity_2m[i],
      precipitationMm: json.hourly.precipitation[i],
    });
  });
  return byHour;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * The afternoon window the sessions sit inside, sampled hour by hour.
 *
 * The per-session rates below cannot be compared with each other: the race
 * covers 150 minutes and Practice 2 covers 60, so the race samples three times
 * the hours and will look stormier whatever the weather does. Fifteen single
 * hours is also a thin sample — Practice 1 and Practice 3 are both at noon and
 * come out 3/15 and 0/15, which is sampling noise, not a fact about Fridays.
 *
 * This is the honest headline instead: every afternoon hour across the three
 * days, fifteen years deep, which is 315 samples rather than 15.
 */
const AFTERNOON = { fromHour: 12, toHour: 18 };
const WET_HOUR_MM = 0.2;

console.log(`Sepang, ${FROM_YEAR}–${TO_YEAR}, from the Open-Meteo archive\n`);

const years = new Map();
for (let year = FROM_YEAR; year <= TO_YEAR; year++) {
  years.set(year, await archiveYear(year));
  process.stdout.write(`  ${year}`);
}
console.log("\n");

const sessions = SESSIONS.map((session) => {
  const temps = [];
  const humidities = [];
  const totals = [];
  const wet = [];

  for (const [year, byHour] of years) {
    const readings = hoursCovered(session.hour, session.minutes)
      .map((h) =>
        byHour.get(
          `${year}-${session.monthDay}T${String(h).padStart(2, "0")}`,
        ),
      )
      .filter(Boolean);

    // A year missing hours would quietly bias the mean, so drop it whole.
    if (readings.length === 0) continue;

    temps.push(mean(readings.map((r) => r.airTempC)));
    humidities.push(mean(readings.map((r) => r.humidityPct)));
    const total = readings.reduce((a, r) => a + r.precipitationMm, 0);
    totals.push(total);
    if (total >= WET_MM) wet.push(year);
  }

  return {
    kind: session.kind,
    label: session.label,
    localHour: session.hour,
    /** Carried so the UI can say what window a wet-year count covers. */
    minutes: session.minutes,
    yearsSampled: temps.length,
    meanAirTempC: round1(mean(temps)),
    meanHumidityPct: Math.round(mean(humidities)),
    /** Rain heavy enough to matter, in years out of yearsSampled. */
    wetYears: wet.length,
    wettestMm: round1(Math.max(...totals)),
  };
});

// Every afternoon hour of the race weekend's dates, across every year sampled.
let hoursSampled = 0;
let wetHours = 0;
for (const [year, byHour] of years) {
  for (const monthDay of ["10-02", "10-03", "10-04"]) {
    for (let h = AFTERNOON.fromHour; h < AFTERNOON.toHour; h++) {
      const reading = byHour.get(
        `${year}-${monthDay}T${String(h).padStart(2, "0")}`,
      );
      if (!reading) continue;
      hoursSampled++;
      if (reading.precipitationMm >= WET_HOUR_MM) wetHours++;
    }
  }
}

const afternoon = {
  fromHour: AFTERNOON.fromHour,
  toHour: AFTERNOON.toHour,
  hoursSampled,
  wetHours,
  wetHourPct: Math.round((wetHours / hoursSampled) * 100),
};

console.log("session         mean temp  humidity   wet years   over    wettest");
for (const s of sessions) {
  console.log(
    `${s.label.padEnd(16)}${`${s.meanAirTempC}°C`.padEnd(11)}` +
      `${`${s.meanHumidityPct}%`.padEnd(11)}` +
      `${`${s.wetYears}/${s.yearsSampled}`.padEnd(12)}` +
      `${`${s.minutes}min`.padEnd(8)}${s.wettestMm}mm`,
  );
}

console.log(
  `\nafternoon hours (${afternoon.fromHour}:00–${afternoon.toHour}:00, all three days): ` +
    `${afternoon.wetHours} of ${afternoon.hoursSampled} wet — ${afternoon.wetHourPct}%`,
);

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      $comment:
        "Generated by npm run import:weather. Do not edit by hand — see scripts/import-sepang-weather.mjs.",
      circuit: "sepang",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      timezone: TZ,
      fromYear: FROM_YEAR,
      toYear: TO_YEAR,
      wetThresholdMm: WET_MM,
      wetHourThresholdMm: WET_HOUR_MM,
      afternoon,
      sessions,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`\nWrote ${sessions.length} sessions to ${OUT}`);
