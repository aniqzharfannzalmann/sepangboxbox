import type {
  Fidelity,
  LiveSessionState,
  PitStop,
  RaceControlMessage,
  Stint,
  TimingRow,
  Weather,
} from "../types";

/**
 * The seam between "what the timing screen shows" and "where the numbers came
 * from".
 *
 * OpenF1's live tier is paid, and on the free tier the whole API returns 401
 * while any session is running anywhere in the world — which is exactly when
 * this app matters. So the entire Live Timing UI is built against this
 * interface instead of against a vendor. Shipping without live access costs
 * nothing but fidelity, and adding an API key later is an env change rather
 * than a rewrite.
 */

/**
 * What a source can actually supply.
 *
 * The UI reads this to decide, per panel, between rendering data and saying
 * "this source cannot provide it". Without it a missing tyre compound and an
 * unsupported tyre column look identical on screen, and the reader is left to
 * guess whether the data is late or absent.
 */
export interface SourceCapabilities {
  /** A position list of any kind. */
  timing: boolean;
  /** Interval to the car ahead, not just to the leader. */
  gapToAhead: boolean;
  lastLap: boolean;
  tyres: boolean;
  pitLog: boolean;
  raceControl: boolean;
  weather: boolean;
}

export interface LiveTimingSource {
  readonly id: "jolpica" | "openf1";
  readonly fidelity: Fidelity;
  readonly capabilities: SourceCapabilities;
  /** Shown to the reader, verbatim, under the timing table. */
  readonly description: string;

  getSessionState(): Promise<LiveSessionState>;
  /** Null when this source has nothing for the current session. */
  getTimingRows(): Promise<TimingRow[] | null>;
  getStints(): Promise<Stint[] | null>;
  getPitLog(): Promise<PitStop[] | null>;
  getRaceControl(): Promise<RaceControlMessage[] | null>;
  getWeather(): Promise<Weather | null>;
}

export const NO_CAPABILITIES: SourceCapabilities = {
  timing: false,
  gapToAhead: false,
  lastLap: false,
  tyres: false,
  pitLog: false,
  raceControl: false,
  weather: false,
};
