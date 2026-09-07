import "server-only";

import normals from "./sepang-weather.json";
import type { F1Session, SessionKind, Weather } from "./types";

/**
 * Weather at Sepang, from Open-Meteo.
 *
 * Chosen because it is free, keyless and needs no account — this project has a
 * hard zero-cost constraint, and Open-Meteo is the only source that meets it
 * without a card on file.
 *
 * Two things are on offer here and they are not the same claim, so the type
 * makes a caller say which one it got:
 *
 *   - A forecast, once the weekend is close enough for one to exist.
 *   - Otherwise the historical record for these dates, which is a description
 *     of Octobers past and not a prediction of this one.
 *
 * The distinction is the whole point. Sepang's afternoon storms are the most
 * Sepang-specific thing about this weekend — 36% of early-October afternoon
 * hours here have rain in them, measured across 270 of them — and it would be
 * easy and wrong to render that as though it were a forecast for 4 October.
 */

const ARCHIVE = normals;

/** Sepang International Circuit. */
const LATITUDE = ARCHIVE.latitude;
const LONGITUDE = ARCHIVE.longitude;
const TZ = ARCHIVE.timezone;

/**
 * How far ahead Open-Meteo will forecast.
 *
 * Sixteen days is the documented limit of the free forecast endpoint, and it
 * is why this module has two branches at all: at the time of writing the race
 * is 27 days out, so there is no forecast to be had and will not be until
 * roughly 17 September. Kept a day short of the limit because the last day of
 * a 16-day forecast is thin, and a session that falls on it is better served
 * by the historical record than by a number that is barely modelled.
 */
const FORECAST_DAYS = 15;

const MS_PER_DAY = 86_400_000;

export interface SessionOutlook {
  /**
   * Per session, not per weekend. As the race approaches the forecast reaches
   * Friday before it reaches Sunday, so a weekend is mixed for several days
   * and a single label on the whole set would be false for part of it.
   */
  origin: "forecast" | "historical";
  kind: SessionKind;
  label: string;
  startsAtIso: string;
  /** Nominal length, so a wet-session rate says what window it covers. */
  minutes: number;
  airTempC: number | null;
  humidityPct: number | null;
  /** Forecast only — the archive records what fell, not what was likely. */
  rainChancePct: number | null;
  /** Historical only — years with rain worth the name, out of yearsSampled. */
  wetYears: number | null;
  yearsSampled: number | null;
}

export interface SepangOutlook {
  /** True once any session is close enough to carry a real forecast. */
  hasForecast: boolean;
  fromYear: number;
  toYear: number;
  /** Share of early-October afternoon hours at Sepang with rain in them. */
  wetHourPct: number;
  hoursSampled: number;
  sessions: SessionOutlook[];
}

interface HourlyResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
}

/**
 * Local wall-clock hour key at the circuit, matching Open-Meteo's `time`
 * entries when it is asked for a timezone.
 *
 * Built with Intl rather than by adding eight hours, so the offset comes from
 * the timezone database instead of from an assumption about Malaysia.
 */
function circuitHourKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const at = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Intl renders midnight as "24" in some engines; Open-Meteo always uses 00.
  const hour = at("hour") === "24" ? "00" : at("hour");
  return `${at("year")}-${at("month")}-${at("day")}T${hour}`;
}

async function openMeteo(
  path: string,
  params: Record<string, string>,
  revalidate: number,
): Promise<HourlyResponse | null> {
  const query = new URLSearchParams({
    latitude: String(LATITUDE),
    longitude: String(LONGITUDE),
    timezone: TZ,
    ...params,
  });

  try {
    const response = await fetch(`${path}?${query}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    if (!json || typeof json !== "object" || !("hourly" in json)) return null;
    return json as HourlyResponse;
  } catch {
    // Weather is an enhancement on every page that shows it. A page that
    // renders without it is correct; a page that fails to render is not.
    return null;
  }
}

/** Whether a session is near enough that a forecast covers it. */
function withinForecast(iso: string, now: number): boolean {
  const ahead = (new Date(iso).getTime() - now) / MS_PER_DAY;
  return ahead >= -1 && ahead <= FORECAST_DAYS;
}

const normalsFor = (kind: SessionKind) =>
  ARCHIVE.sessions.find((s) => s.kind === kind);

/**
 * Current conditions at the circuit.
 *
 * Feeds the panel the live view already renders. `trackTempC` stays null:
 * track surface temperature is measured by sensors in the tarmac and no
 * weather model reports it, so the honest answer is the missing one rather
 * than air temperature wearing a different label.
 */
export async function getSepangWeatherNow(): Promise<Weather | null> {
  const data = await openMeteo(
    "https://api.open-meteo.com/v1/forecast",
    {
      hourly: "temperature_2m,relative_humidity_2m,precipitation",
      forecast_days: "1",
    },
    900,
  );

  const times = data?.hourly?.time;
  if (!times || times.length === 0) return null;

  const key = circuitHourKey(new Date().toISOString());
  const i = times.findIndex((t) => t.startsWith(key));
  if (i === -1) return null;

  const precipitation = data?.hourly?.precipitation?.[i] ?? null;
  return {
    airTempC: data?.hourly?.temperature_2m?.[i] ?? null,
    trackTempC: null,
    humidityPct: data?.hourly?.relative_humidity_2m?.[i] ?? null,
    rainfall: precipitation === null ? null : precipitation > 0,
    atIso: times[i],
  };
}

/**
 * The weekend outlook, forecast where one exists and history where it does not.
 *
 * Takes the sessions rather than fetching them so this stays one concern, and
 * so a caller that already loaded the weekend does not load it twice.
 */
export async function getSepangOutlook(
  sessions: F1Session[],
): Promise<SepangOutlook> {
  const base = {
    fromYear: ARCHIVE.fromYear,
    toYear: ARCHIVE.toYear,
    wetHourPct: ARCHIVE.afternoon.wetHourPct,
    hoursSampled: ARCHIVE.afternoon.hoursSampled,
  };

  const historical = (): SepangOutlook => ({
    ...base,
    hasForecast: false,
    sessions: sessions.map((session) => {
      const n = normalsFor(session.kind);
      return {
        origin: "historical" as const,
        kind: session.kind,
        label: session.label,
        startsAtIso: session.startsAtIso,
        minutes: n?.minutes ?? 60,
        airTempC: n?.meanAirTempC ?? null,
        humidityPct: n?.meanHumidityPct ?? null,
        rainChancePct: null,
        wetYears: n?.wetYears ?? null,
        yearsSampled: n?.yearsSampled ?? null,
      };
    }),
  });

  const now = Date.now();
  if (sessions.length === 0) return historical();
  if (!sessions.some((s) => withinForecast(s.startsAtIso, now))) {
    return historical();
  }

  const data = await openMeteo(
    "https://api.open-meteo.com/v1/forecast",
    {
      hourly:
        "temperature_2m,relative_humidity_2m,precipitation_probability",
      forecast_days: String(FORECAST_DAYS + 1),
    },
    3600,
  );

  const times = data?.hourly?.time;
  if (!times || times.length === 0) return historical();

  // A forecast that reaches some sessions and not others is normal as the
  // weekend approaches; each session takes whichever answer it can have, and
  // says which one that is.
  const fallback = historical();
  const resolved = sessions.map((session, index) => {
    const key = circuitHourKey(session.startsAtIso);
    const i = times.findIndex((t) => t.startsWith(key));
    if (i === -1) return fallback.sessions[index];

    return {
      ...fallback.sessions[index],
      origin: "forecast" as const,
      airTempC: data?.hourly?.temperature_2m?.[i] ?? null,
      humidityPct: data?.hourly?.relative_humidity_2m?.[i] ?? null,
      rainChancePct: data?.hourly?.precipitation_probability?.[i] ?? null,
      wetYears: null,
      yearsSampled: null,
    };
  });

  return {
    ...base,
    hasForecast: resolved.some((s) => s.origin === "forecast"),
    sessions: resolved,
  };
}
