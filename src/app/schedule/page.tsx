import { Countdown } from "@/components/Countdown";
import { StatusNotice } from "@/components/StatusNotice";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
} from "@/components/ui/primitives";
import {
  getWeekendState,
  groupSessionsByDay,
  type WeekendState,
} from "@/lib/f1/session-windows";
import {
  MYT_LABEL,
  formatDayMonthMyt,
  formatTimeMyt,
  formatWeekdayMyt,
  mytDayKey,
} from "@/lib/f1/time";
import type { F1Session, RaceWeekend } from "@/lib/f1/types";
import { getSeasonScheduleSafe, getSepangWeekend } from "@/lib/f1/weekend";

export const metadata = {
  title: "Schedule",
  description:
    "Every session of the 2026 Bahrain Grand Prix in Malaysia at Sepang, in Malaysia Time, with a live countdown.",
};

function SessionRow({
  session,
  isNext,
  isLive,
}: {
  session: F1Session;
  isNext: boolean;
  isLive: boolean;
}) {
  return (
    <li className="flex items-baseline gap-xs py-sm border-b border-hairline last:border-b-0">
      <span className="text-title-sm tnum text-ink w-[5.5rem] shrink-0">
        {formatTimeMyt(session.startsAtIso)}
      </span>
      <span className="text-body-md text-ink flex-1">{session.label}</span>
      {isLive && <BadgePill tone="primary">Live</BadgePill>}
      {!isLive && isNext && <BadgePill>Next</BadgePill>}
    </li>
  );
}

function WeekendSchedule({
  weekend,
  state,
}: {
  weekend: RaceWeekend;
  state: WeekendState;
}) {
  const days = groupSessionsByDay(weekend.sessions, mytDayKey);

  return (
    <div className="mt-lg flex flex-col gap-lg">
      {days.map(({ day, sessions }) => (
        <section key={day}>
          <h3 className="label-caps text-muted">
            {formatWeekdayMyt(sessions[0].startsAtIso)} ·{" "}
            {formatDayMonthMyt(sessions[0].startsAtIso)}
          </h3>
          <ul className="mt-xs">
            {sessions.map((s) => (
              <SessionRow
                key={s.kind}
                session={s}
                isNext={state.next?.kind === s.kind}
                isLive={state.current?.kind === s.kind}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SeasonCalendar({
  races,
  nowMs,
}: {
  races: RaceWeekend[];
  nowMs: number;
}) {
  return (
    <ul className="mt-md">
      {races.map((race) => {
        const raceSession =
          race.sessions.find((s) => s.kind === "race") ?? race.sessions.at(-1);
        const done = raceSession
          ? new Date(raceSession.endsAtIso).getTime() < nowMs
          : false;
        const isSepang = race.circuitId === "sepang";

        return (
          <li
            key={race.round}
            className="flex items-baseline gap-xs py-sm border-b border-hairline"
          >
            <span className="text-caption tnum text-muted w-8 shrink-0">
              {race.round}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={
                  isSepang ? "text-body-md text-ink" : "text-body-md text-body"
                }
              >
                {race.raceName}
              </p>
              <p className="text-caption text-muted truncate">
                {race.circuitName}
              </p>
            </div>
            <span className="text-caption tnum text-muted shrink-0">
              {raceSession ? formatDayMonthMyt(raceSession.startsAtIso) : "TBC"}
            </span>
            {isSepang && <BadgePill tone="primary">Sepang</BadgePill>}
            {!isSepang && done && <BadgePill>Done</BadgePill>}
          </li>
        );
      })}
    </ul>
  );
}

export default async function SchedulePage() {
  const [weekend, season] = await Promise.all([
    getSepangWeekend(),
    getSeasonScheduleSafe(),
  ]);

  // The clock reading comes from the data layer, not from here — components
  // must stay pure, and this way every row on the page agrees on "now".
  const nowMs = weekend.fetchedAtMs;
  const state = getWeekendState(weekend.data, nowMs);

  return (
    <Container className="py-xxl">
      <SectionLabel>All times in {MYT_LABEL} · UTC+8</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Race weekend</h1>
      <p className="text-body-md text-body mt-xs">
        {weekend.data.raceName} · {weekend.data.circuitName},{" "}
        {weekend.data.locality}
      </p>

      {weekend.origin === "fallback" && (
        <StatusNotice tone="warning" className="mt-md">
          {weekend.reason}
        </StatusNotice>
      )}

      {state.next && (
        <div className="mt-lg">
          <SectionLabel>
            {state.status === "live" ? "Next session" : `Next · ${state.next.label}`}
          </SectionLabel>
          <Countdown targetIso={state.next.startsAtIso} className="mt-xs" />
        </div>
      )}

      {state.status === "finished" && (
        <StatusNotice className="mt-lg">
          The Sepang weekend is complete.
        </StatusNotice>
      )}

      <WeekendSchedule weekend={weekend.data} state={state} />

      <Hairline className="my-xxl" />

      <SectionLabel>2026 season</SectionLabel>
      <h2 className="text-display-md text-ink mt-xxs">Full calendar</h2>
      {season.origin === "fallback" ? (
        <StatusNotice tone="warning" className="mt-md">
          {season.reason}
        </StatusNotice>
      ) : (
        <SeasonCalendar races={season.data} nowMs={nowMs} />
      )}
    </Container>
  );
}
