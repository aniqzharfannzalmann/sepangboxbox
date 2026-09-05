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
 * Second-by-second timing is only sold, and this project is deliberately
 * zero-cost, so the whole Live Timing UI is built against this interface
 * rather than against a vendor. Today there is exactly one implementation and
 * shipping without live access costs nothing but fidelity — which the UI
 * states plainly instead of hiding. If a free source ever appears, it arrives
 * as a second implementation and no component changes.
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
  readonly id: "jolpica";
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
