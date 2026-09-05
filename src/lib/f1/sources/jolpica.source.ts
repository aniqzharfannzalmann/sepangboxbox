import "server-only";

import { getQualifyingResult, getRaceResult, getRaceWeekend } from "../jolpica";
import { getWeekendState } from "../session-windows";
import type {
  LiveSessionState,
  PitStop,
  RaceControlMessage,
  Stint,
  TimingRow,
  Weather,
} from "../types";
import { getSepangWeekend } from "../weekend";
import type { LiveTimingSource, SourceCapabilities } from "./types";

/**
 * The free source: official classifications, published after each session.
 *
 * It cannot show a car moving. What it can show is correct, which during a
 * live session is a real distinction the UI is required to make plain rather
 * than paper over.
 *
 * Practice sessions have no Ergast endpoint at all, so those return null and
 * the page says so.
 */

const CAPABILITIES: SourceCapabilities = {
  timing: true,
  gapToAhead: false,
  lastLap: false,
  tyres: false,
  pitLog: false,
  raceControl: false,
  weather: false,
};

/**
 * How long after the flag a classification stays labelled provisional.
 * Stewards' decisions and post-race checks routinely land inside this window
 * (PRD 10.2), and a table that silently claims to be final while a penalty is
 * pending is worse than one that admits it is still settling.
 */
const PROVISIONAL_MINUTES = 60;

/** "1:11.163" or "58.221" to seconds. Null if it is not a lap time. */
function lapTimeToSeconds(time: string | null): number | null {
  if (!time) return null;
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(time.trim());
  if (!m) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
}

/**
 * Points the source at a weekend other than Sepang, and/or at a pretend clock.
 *
 * This exists so the timing table can be exercised before Sepang has run.
 * Round 16 has no results yet, so in normal operation getTimingRows() always
 * returns null and the table, the provisional badge and the retired-driver
 * styling never render at all — they would be seen working for the first time
 * on race day. Pinning the source to a completed round renders them now,
 * against real classifications.
 */
export interface SourcePin {
  season: string;
  round: string;
  /** Pretend "now" reads this, to land inside or just after a given session. */
  nowMs?: number;
}

export class JolpicaTimingSource implements LiveTimingSource {
  readonly id = "jolpica" as const;
  readonly fidelity = "post-session" as const;
  readonly capabilities = CAPABILITIES;
  readonly description =
    "Official classifications from Jolpica-F1, published after each session. " +
    "Second-by-second timing needs OpenF1 live access.";

  constructor(private readonly pin?: SourcePin) {}

  async getSessionState(): Promise<LiveSessionState> {
    // Unpinned, this is the Sepang weekend with its committed fallback.
    // Pinned, it is whichever round the preview asked for.
    const weekend = this.pin
      ? {
          data: await getRaceWeekend(this.pin.season, this.pin.round),
          fetchedAtMs: this.pin.nowMs ?? Date.now(),
        }
      : await getSepangWeekend();

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
    const state = await this.getSessionState();
    const session = state.session;
    if (!session) return null;

    const { season, round } = state.weekend;

    if (session.kind === "race" || session.kind === "sprint") {
      return this.raceRows(season, round);
    }
    if (session.kind === "quali" || session.kind === "sprint-quali") {
      return this.qualifyingRows(season, round);
    }
    // Practice: Ergast has no endpoint for it.
    return null;
  }

  private async raceRows(
    season: string,
    round: string,
  ): Promise<TimingRow[] | null> {
    let result;
    try {
      result = await getRaceResult(season, round);
    } catch {
      return null;
    }
    if (!result) return null;

    return result.rows.map((row) => ({
      position: row.position,
      positionText: row.positionText,
      driver: row.driver,
      constructor: row.constructor,
      gapToLeader: row.time,
      gapToAhead: null,
      lastLap: null,
      bestLap: row.fastestLap,
      lapsCompleted: row.laps,
      lapsDown: row.lapsDown,
      tyre: null,
      stintLaps: null,
      inPit: false,
      status: row.status,
      // Ergast marks non-finishers with a non-numeric positionText.
      retired: row.position === null || !/^\d+$/.test(row.positionText),
    }));
  }

  private async qualifyingRows(
    season: string,
    round: string,
  ): Promise<TimingRow[] | null> {
    let result;
    try {
      result = await getQualifyingResult(season, round);
    } catch {
      return null;
    }
    if (!result) return null;

    // Pole time is the reference for everyone else's gap. Showing each
    // driver's own lap in the Gap column just repeats the Best column.
    const poleSeconds = lapTimeToSeconds(
      result.rows[0]?.q3 ?? result.rows[0]?.q2 ?? result.rows[0]?.q1 ?? null,
    );

    return result.rows.map((row) => {
      // Best time is the last segment the driver actually set a lap in.
      const best = row.q3 ?? row.q2 ?? row.q1;
      const seconds = lapTimeToSeconds(best);
      const gap =
        row.position === 1 || poleSeconds === null || seconds === null
          ? best
          : `+${(seconds - poleSeconds).toFixed(3)}`;

      return {
        position: row.position,
        positionText: String(row.position),
        driver: row.driver,
        constructor: row.constructor,
        gapToLeader: gap,
        gapToAhead: null,
        lastLap: null,
        bestLap: best,
        lapsCompleted: null,
        lapsDown: 0,
        tyre: null,
        stintLaps: null,
        inPit: false,
        status: row.q3 ? "Q3" : row.q2 ? "Q2" : "Q1",
        retired: false,
      };
    });
  }

  // Jolpica publishes none of the following. Returning null rather than an
  // empty array matters: the UI distinguishes "no data yet" from "this source
  // cannot provide it", and only the latter earns an explanatory panel.
  async getStints(): Promise<Stint[] | null> {
    return null;
  }

  async getPitLog(): Promise<PitStop[] | null> {
    return null;
  }

  async getRaceControl(): Promise<RaceControlMessage[] | null> {
    return null;
  }

  async getWeather(): Promise<Weather | null> {
    return null;
  }
}
