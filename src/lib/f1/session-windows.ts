import type { F1Session, RaceWeekend } from "./types";

/**
 * "Is something happening right now?" — the question the home page is built
 * around. Pure and time-injected so it can run on the server for the initial
 * render and again in the browser as the clock ticks, with identical results.
 */

export type WeekendStatus =
  | "before" // nothing has started yet
  | "live" // a session is running
  | "between" // weekend under way, gap between sessions
  | "finished"; // chequered flag on the last session

export interface WeekendState {
  status: WeekendStatus;
  /** The session running right now, when status is "live". */
  current: F1Session | null;
  /** The next session that has not started, when there is one. */
  next: F1Session | null;
  /** The most recently completed session, when there is one. */
  previous: F1Session | null;
}

export function getWeekendState(
  weekend: Pick<RaceWeekend, "sessions">,
  now: number = Date.now(),
): WeekendState {
  const sessions = weekend.sessions;
  if (sessions.length === 0) {
    return { status: "finished", current: null, next: null, previous: null };
  }

  const current =
    sessions.find(
      (s) =>
        new Date(s.startsAtIso).getTime() <= now &&
        now < new Date(s.endsAtIso).getTime(),
    ) ?? null;

  const next =
    sessions.find((s) => new Date(s.startsAtIso).getTime() > now) ?? null;

  const finished = sessions.filter(
    (s) => new Date(s.endsAtIso).getTime() <= now,
  );
  const previous = finished.length ? finished[finished.length - 1] : null;

  let status: WeekendStatus;
  if (current) status = "live";
  else if (!previous) status = "before";
  else if (next) status = "between";
  else status = "finished";

  return { status, current, next, previous };
}

/**
 * The instant the page should count down to: the next session if one is
 * pending, otherwise nothing. Null means there is no countdown to show.
 */
export function countdownTargetIso(state: WeekendState): string | null {
  return state.next?.startsAtIso ?? null;
}

/** Sessions grouped into their MYT calendar days, preserving order. */
export function groupSessionsByDay(
  sessions: F1Session[],
  dayKey: (iso: string) => string,
): Array<{ day: string; sessions: F1Session[] }> {
  const groups = new Map<string, F1Session[]>();
  for (const s of sessions) {
    const key = dayKey(s.startsAtIso);
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({ day, sessions: list }));
}
