import "server-only";

import { getWeekendState } from "../session-windows";
import type {
  Constructor,
  Driver,
  LiveSessionState,
  PitStop,
  RaceControlMessage,
  Stint,
  TimingRow,
  TyreCompound,
  Weather,
} from "../types";
import { getSepangWeekend } from "../weekend";
import type { LiveTimingSource, SourceCapabilities } from "./types";

/**
 * Live timing from OpenF1.
 *
 * UNVERIFIED. Written ahead of buying access so that the decision in race week
 * is "add the key and confirm" rather than "build an integration under time
 * pressure". It has never run against the live API, because the free tier
 * returns 401 for every endpoint while any session is in progress anywhere in
 * the world — there is no way to exercise it without paying.
 *
 * Confirm before trusting it on a race weekend:
 *   1. The auth header. AUTH_HEADER below is a guess at Bearer; check the
 *      OpenF1 docs once the key exists.
 *   2. Field names on /position, /intervals, /laps, /stints, /pit,
 *      /race_control and /weather.
 *   3. That the polling budget below actually holds. The sponsor tier allows
 *      60 requests/minute and this class issues up to 8 per render, so the
 *      revalidate windows are what keep it inside the limit — not politeness.
 *
 * Run `npm run verify:apis` with the key set before relying on any of it.
 */

const BASE = process.env.OPENF1_BASE_URL ?? "https://api.openf1.org/v1";

/*
 * Per-endpoint cache windows.
 *
 * The sponsor tier allows 60 req/min. Polling all seven timing endpoints every
 * 5s would be 84 req/min and would be throttled mid-race, so the endpoints are
 * tiered by how fast they actually change. Positions move constantly; tyre
 * compounds change a handful of times an hour.
 */
const REVALIDATE = {
  session: 60,
  drivers: 300,
  position: 5,
  intervals: 5,
  laps: 10,
  pit: 15,
  raceControl: 15,
  stints: 30,
  weather: 60,
} as const;

const CAPABILITIES: SourceCapabilities = {
  timing: true,
  gapToAhead: true,
  lastLap: true,
  tyres: true,
  pitLog: true,
  raceControl: true,
  weather: true,
};

const PROVISIONAL_MINUTES = 60;

/* ------------------------------------------------------------------ */
/* Wire types                                                          */
/* ------------------------------------------------------------------ */

interface WireSession {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
}

interface WireDriver {
  driver_number: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name_acronym?: string;
  team_name?: string;
  country_code?: string;
}

interface WirePosition {
  driver_number: number;
  position: number;
  date: string;
}

interface WireInterval {
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  date: string;
}

interface WireLap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  date_start?: string;
}

interface WireStint {
  driver_number: number;
  compound: string | null;
  lap_start: number;
  lap_end: number | null;
  stint_number: number;
}

interface WirePit {
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  date: string;
}

interface WireRaceControl {
  date: string;
  category: string | null;
  flag: string | null;
  scope: string | null;
  message: string;
}

interface WireWeather {
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  date: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Records arrive as an append-only log; only the newest per car matters. */
function latestByDriver<T extends { driver_number: number; date: string }>(
  rows: T[],
): Map<number, T> {
  const latest = new Map<number, T>();
  for (const row of rows) {
    const held = latest.get(row.driver_number);
    if (!held || row.date > held.date) latest.set(row.driver_number, row);
  }
  return latest;
}

function toCompound(raw: string | null): TyreCompound {
  switch (raw?.toUpperCase()) {
    case "SOFT":
      return "SOFT";
    case "MEDIUM":
      return "MEDIUM";
    case "HARD":
      return "HARD";
    case "INTERMEDIATE":
      return "INTERMEDIATE";
    case "WET":
      return "WET";
    default:
      return "UNKNOWN";
  }
}

/** OpenF1 reports gaps as seconds, or as "+1 LAP" once a car is lapped. */
function formatGap(raw: number | string | null): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") return raw;
  return `+${raw.toFixed(3)}`;
}

/** Lap durations are seconds; drivers read them as m:ss.mmm. */
function formatLapTime(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return minutes > 0
    ? `${minutes}:${rest.toFixed(3).padStart(6, "0")}`
    : rest.toFixed(3);
}

/* ------------------------------------------------------------------ */

export class OpenF1TimingSource implements LiveTimingSource {
  readonly id = "openf1" as const;
  readonly fidelity = "live" as const;
  readonly capabilities = CAPABILITIES;
  readonly description =
    "Live session data from OpenF1, roughly three seconds behind the track.";

  constructor(private readonly apiKey: string) {}

  private async get<T>(
    path: string,
    revalidate: number,
  ): Promise<T[] | null> {
    try {
      const response = await fetch(`${BASE}${path}`, {
        headers: {
          Accept: "application/json",
          // Unverified — see the note at the top of this file.
          Authorization: `Bearer ${this.apiKey}`,
        },
        next: { revalidate },
      });
      if (!response.ok) {
        console.error(`[openf1] ${response.status} for ${path}`);
        return null;
      }
      return (await response.json()) as T[];
    } catch (error) {
      console.error(`[openf1] request failed for ${path}:`, error);
      return null;
    }
  }

  /**
   * The session key for whatever is running now.
   *
   * Null outside a session window, which is the normal case — the caller then
   * has nothing to poll and the page falls back to schedule and standings.
   */
  private async currentSessionKey(): Promise<number | null> {
    const sessions = await this.get<WireSession>(
      "/sessions?meeting_key=latest",
      REVALIDATE.session,
    );
    if (!sessions?.length) return null;

    const now = Date.now();
    const running = sessions.find(
      (s) =>
        Date.parse(s.date_start) <= now && now < Date.parse(s.date_end),
    );
    if (running) return running.session_key;

    // Otherwise the most recent one that has already started.
    const started = sessions
      .filter((s) => Date.parse(s.date_start) <= now)
      .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start));
    return started[0]?.session_key ?? null;
  }

  private async drivers(
    sessionKey: number,
  ): Promise<Map<number, { driver: Driver; constructor: Constructor }>> {
    const rows =
      (await this.get<WireDriver>(
        `/drivers?session_key=${sessionKey}`,
        REVALIDATE.drivers,
      )) ?? [];

    const map = new Map<number, { driver: Driver; constructor: Constructor }>();
    for (const row of rows) {
      const given = row.first_name ?? "";
      const family = row.last_name ?? row.full_name ?? String(row.driver_number);
      map.set(row.driver_number, {
        driver: {
          id: String(row.driver_number),
          code: row.name_acronym ?? null,
          permanentNumber: row.driver_number,
          givenName: given,
          familyName: family,
          fullName: row.full_name ?? `${given} ${family}`.trim(),
          nationality: row.country_code ?? "",
          url: "",
        },
        constructor: {
          id: (row.team_name ?? "unknown").toLowerCase().replace(/\s+/g, "-"),
          name: row.team_name ?? "Unknown",
          nationality: "",
          url: "",
        },
      });
    }
    return map;
  }

  async getSessionState(): Promise<LiveSessionState> {
    // The weekend structure still comes from Jolpica: it is the schedule of
    // record, it is cheap, and it works before OpenF1 has any session at all.
    const weekend = await getSepangWeekend();
    const state = getWeekendState(weekend.data, weekend.fetchedAtMs);
    const session = state.current ?? state.previous;

    const endedMsAgo = session
      ? weekend.fetchedAtMs - new Date(session.endsAtIso).getTime()
      : Number.POSITIVE_INFINITY;

    return {
      weekend: weekend.data,
      session,
      next: state.next,
      status: state.status,
      provisional:
        state.status === "live" ||
        (endedMsAgo >= 0 && endedMsAgo < PROVISIONAL_MINUTES * 60_000),
    };
  }

  async getTimingRows(): Promise<TimingRow[] | null> {
    const sessionKey = await this.currentSessionKey();
    if (sessionKey === null) return null;

    const [positions, intervals, laps, stints, roster] = await Promise.all([
      this.get<WirePosition>(
        `/position?session_key=${sessionKey}`,
        REVALIDATE.position,
      ),
      this.get<WireInterval>(
        `/intervals?session_key=${sessionKey}`,
        REVALIDATE.intervals,
      ),
      this.get<WireLap>(`/laps?session_key=${sessionKey}`, REVALIDATE.laps),
      this.get<WireStint>(
        `/stints?session_key=${sessionKey}`,
        REVALIDATE.stints,
      ),
      this.drivers(sessionKey),
    ]);

    if (!positions?.length) return null;

    const latestPosition = latestByDriver(positions);
    const latestInterval = intervals ? latestByDriver(intervals) : new Map();

    // Best and last lap per car, in one pass over the lap log.
    const lapInfo = new Map<
      number,
      { last: number | null; best: number | null; count: number }
    >();
    for (const lap of laps ?? []) {
      const held = lapInfo.get(lap.driver_number) ?? {
        last: null,
        best: null,
        count: 0,
      };
      if (lap.lap_duration !== null) {
        held.last = lap.lap_duration;
        held.best =
          held.best === null ? lap.lap_duration : Math.min(held.best, lap.lap_duration);
      }
      held.count = Math.max(held.count, lap.lap_number);
      lapInfo.set(lap.driver_number, held);
    }

    // Current stint = highest stint_number per car.
    const currentStint = new Map<number, WireStint>();
    for (const stint of stints ?? []) {
      const held = currentStint.get(stint.driver_number);
      if (!held || stint.stint_number > held.stint_number) {
        currentStint.set(stint.driver_number, stint);
      }
    }

    const rows: TimingRow[] = [...latestPosition.values()]
      .sort((a, b) => a.position - b.position)
      .map((pos) => {
        const entry = roster.get(pos.driver_number);
        const interval = latestInterval.get(pos.driver_number);
        const lap = lapInfo.get(pos.driver_number);
        const stint = currentStint.get(pos.driver_number);

        const driver: Driver = entry?.driver ?? {
          id: String(pos.driver_number),
          code: null,
          permanentNumber: pos.driver_number,
          givenName: "",
          familyName: `#${pos.driver_number}`,
          fullName: `#${pos.driver_number}`,
          nationality: "",
          url: "",
        };

        return {
          position: pos.position,
          positionText: String(pos.position),
          driver,
          constructor: entry?.constructor ?? {
            id: "unknown",
            name: "Unknown",
            nationality: "",
            url: "",
          },
          gapToLeader: formatGap(interval?.gap_to_leader ?? null),
          gapToAhead: formatGap(interval?.interval ?? null),
          lastLap: formatLapTime(lap?.last ?? null),
          bestLap: formatLapTime(lap?.best ?? null),
          lapsCompleted: lap?.count ?? null,
          // OpenF1's interval field already expresses "+1 LAP" as a string,
          // so there is no separate deficit to compute here.
          lapsDown: 0,
          tyre: stint ? toCompound(stint.compound) : null,
          stintLaps:
            stint && lap?.count ? Math.max(0, lap.count - stint.lap_start + 1) : null,
          inPit: false,
          status: null,
          retired: false,
        };
      });

    return rows.length ? rows : null;
  }

  async getStints(): Promise<Stint[] | null> {
    const sessionKey = await this.currentSessionKey();
    if (sessionKey === null) return null;

    const rows = await this.get<WireStint>(
      `/stints?session_key=${sessionKey}`,
      REVALIDATE.stints,
    );
    if (!rows?.length) return null;

    return rows.map((row) => ({
      driverId: String(row.driver_number),
      compound: toCompound(row.compound),
      startLap: row.lap_start,
      endLap: row.lap_end,
    }));
  }

  async getPitLog(): Promise<PitStop[] | null> {
    const sessionKey = await this.currentSessionKey();
    if (sessionKey === null) return null;

    const rows = await this.get<WirePit>(
      `/pit?session_key=${sessionKey}`,
      REVALIDATE.pit,
    );
    if (!rows?.length) return null;

    return rows
      .map((row) => ({
        driverId: String(row.driver_number),
        lap: row.lap_number,
        durationSeconds: row.pit_duration,
        atIso: row.date,
      }))
      .sort((a, b) => (a.atIso < b.atIso ? 1 : -1));
  }

  async getRaceControl(): Promise<RaceControlMessage[] | null> {
    const sessionKey = await this.currentSessionKey();
    if (sessionKey === null) return null;

    const rows = await this.get<WireRaceControl>(
      `/race_control?session_key=${sessionKey}`,
      REVALIDATE.raceControl,
    );
    if (!rows?.length) return null;

    // Newest first — a ticker reads downward from the most recent call.
    return rows
      .map((row) => ({
        atIso: row.date,
        category: row.category,
        flag: row.flag,
        scope: row.scope,
        message: row.message,
      }))
      .sort((a, b) => (a.atIso < b.atIso ? 1 : -1));
  }

  async getWeather(): Promise<Weather | null> {
    const sessionKey = await this.currentSessionKey();
    if (sessionKey === null) return null;

    const rows = await this.get<WireWeather>(
      `/weather?session_key=${sessionKey}`,
      REVALIDATE.weather,
    );
    if (!rows?.length) return null;

    const latest = rows.reduce((a, b) => (a.date > b.date ? a : b));
    return {
      airTempC: latest.air_temperature,
      trackTempC: latest.track_temperature,
      humidityPct: latest.humidity,
      rainfall: latest.rainfall === null ? null : latest.rainfall > 0,
      atIso: latest.date,
    };
  }
}
