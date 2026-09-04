/**
 * Malaysia Time formatting.
 *
 * PRD section 8 makes MYT the default timezone for every schedule display.
 * Jolpica publishes UTC instants, so every user-facing time goes through here
 * rather than through the viewer's local clock — a fan reading this from
 * Singapore or London must still see the Sepang wall-clock time.
 *
 * Intl carries the tz database, so there is no date library and no hardcoded
 * +8 offset to drift.
 */

export const MYT_TIME_ZONE = "Asia/Kuala_Lumpur";
export const MYT_LABEL = "MYT";

const time = new Intl.DateTimeFormat("en-GB", {
  timeZone: MYT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekday = new Intl.DateTimeFormat("en-GB", {
  timeZone: MYT_TIME_ZONE,
  weekday: "short",
});

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: MYT_TIME_ZONE,
  day: "numeric",
  month: "short",
});

const full = new Intl.DateTimeFormat("en-GB", {
  timeZone: MYT_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "15:00" */
export function formatTimeMyt(iso: string): string {
  return time.format(new Date(iso));
}

/** "Sun" */
export function formatWeekdayMyt(iso: string): string {
  return weekday.format(new Date(iso));
}

/** "4 Oct" */
export function formatDayMonthMyt(iso: string): string {
  return dayMonth.format(new Date(iso));
}

/** "Sunday 4 October, 15:00" */
export function formatFullMyt(iso: string): string {
  return full.format(new Date(iso));
}

/** Stable YYYY-MM-DD key in MYT, for grouping sessions by local day. */
export function mytDayKey(iso: string): string {
  // en-CA gives ISO-shaped dates, which sort correctly as strings.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MYT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target instant has passed. */
  elapsed: boolean;
}

export function countdownFrom(targetIso: string, now: number): Countdown {
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    elapsed: false,
  };
}

export const pad2 = (n: number): string => String(n).padStart(2, "0");
