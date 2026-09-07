import "server-only";

import {
  getPitStops,
  getRaceWeekend,
} from "../jolpica";
import { getWeekendState } from "../session-windows";
import { lapTimeToSeconds } from "../time";
import type {
  LiveSessionState,
  RaceWeekend,
  PitStop,
  RaceControlMessage,
  Stint,
  TimingRow,
  Weather,
} from "../types";
import { getActiveWeekend } from "../weekend";
import { gatewayRaceResult, gatewaySprintResult, gatewayQualifyingResult, gatewayWeather } from "../gateway";
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
  // Ergast has carried pit stops all along.
  pitLog: true,
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

/**
 * Points the source at a specific round, and/or at a pretend clock.
 *
 * Unpinned, the source follows whichever weekend is running or next — which
 * has no classification yet, so getTimingRows() returns null and the table,
 * the provisional badge and the retired-driver styling never render. Without
 * this they would be seen working for the first time on a race day. Pinning to
 * a completed round exercises them now, against real classifications.
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
    "Official classifications from Jolpica-F1, published after each session.";

  constructor(private readonly pin?: SourcePin) {}

  async getSessionState(): Promise<LiveSessionState> {
    // Unpinned, this is whichever weekend is running or next, with the
    // committed calendar behind it. Pinned, it is the round the preview asked
    // for.
    let weekend: { data: RaceWeekend; fetchedAtMs: number };
    if (this.pin) {
      weekend = {
        data: await getRaceWeekend(this.pin.season, this.pin.round),
        fetchedAtMs: this.pin.nowMs ?? Date.now(),
      };
    } else {
      const active = await getActiveWeekend();
      weekend = { data: active.data.weekend, fetchedAtMs: active.fetchedAtMs };
    }

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
       return session.kind === "sprint"
         ? this.sprintRows(season, round)
         : this.raceRows(season, round);
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
      result = (await gatewayRaceResult(season, round)).data;
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

  private async sprintRows(
    season: string,
    round: string,
  ): Promise<TimingRow[] | null> {
    let result;
    try {
      result = (await gatewaySprintResult(season, round)).data;
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
      retired: row.position === null || !/^\d+$/.test(row.positionText),
    }));
  }

  private async qualifyingRows(
    season: string,
    round: string,
  ): Promise<TimingRow[] | null> {
    let result;
    try {
      result = (await gatewayQualifyingResult(season, round)).data;
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

  /**
   * Pit stops, for race sessions only. Ergast records none for practice or
   * qualifying, so those return an empty array rather than null — "none for
   * this session" is a different statement from "this source cannot supply
   * them", and the UI says each differently.
   */
  async getPitLog(): Promise<PitStop[] | null> {
    const state = await this.getSessionState();
    const session = state.session;
    if (!session) return null;
    if (session.kind !== "race") return [];

    try {
      return await getPitStops(state.weekend.season, state.weekend.round);
    } catch {
      return null;
    }
  }

  async getRaceControl(): Promise<RaceControlMessage[] | null> {
    return null;
  }

  /**
   * Conditions at the circuit, from Open-Meteo rather than from Jolpica.
   *
   * Not timing data, and not pretending to be: this is ambient weather, which
   * a free weather model can give and a results feed cannot. Track surface
   * temperature stays null, because that comes from sensors in the tarmac and
   * no forecast reports it.
   *
   * Sepang only. This view follows whichever race is active, and the weather
   * module is built around one set of coordinates — so returning its numbers
   * during a race at Monza would label Malaysian weather as Italian. Null is
   * the honest answer everywhere else, and the panel simply does not render.
   */
  async getWeather(): Promise<Weather | null> {
    const { weekend } = await this.getSessionState();
    if (weekend.circuitId !== "sepang") return null;
    return (await gatewayWeather()).data;
  }
}
