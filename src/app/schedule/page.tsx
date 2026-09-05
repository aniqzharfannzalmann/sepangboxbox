import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
} from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { getWeekendState, groupSessionsByDay } from "@/lib/f1/session-windows";
import {
  MYT_LABEL,
  formatDayMonthMyt,
  formatTimeMyt,
  formatWeekdayMyt,
  mytDayKey,
} from "@/lib/f1/time";
import type { F1Session, RaceWeekend } from "@/lib/f1/types";
import { getSeasonScheduleSafe, pickActiveWeekend } from "@/lib/f1/weekend";

export const metadata = {
  title: "Schedule",
  description:
    "Every remaining Formula 1 session of the 2026 season in Malaysia and Singapore time, with a countdown to the next one.",
};

/*
 * The season schedule, in Malaysia time.
 *
 * The app used to show the Sepang weekend and a bare list of dates. It now
 * covers every round: Sepang is one of eleven still to come, and a fan wants
 * Monza this weekend as much as Sepang in October.
 *
 * The next race is expanded; the rest open on demand through <details>, which
 * costs no JavaScript and works before hydration.
 */

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
    <li className="flex items-baseline gap-xs py-xs border-b border-hairline last:border-b-0">
      <span className="text-title-sm tnum text-ink w-[5rem] shrink-0">
        {formatTimeMyt(session.startsAtIso)}
      </span>
      <span className="text-body-md text-ink flex-1">{session.label}</span>
      {isLive && <BadgePill tone="primary">Live</BadgePill>}
      {!isLive && isNext && <BadgePill>Next</BadgePill>}
    </li>
  );
}

/**
 * Sessions grouped by their Malaysian calendar day.
 *
 * `nextKey` identifies the one session that is genuinely next across the whole
 * season. Deriving it per weekend instead would badge the opening practice of
 * every future round as "Next", which is true within that weekend and wrong on
 * a page showing eleven of them.
 */
function SessionDays({
  weekend,
  nowMs,
  nextKey,
}: {
  weekend: RaceWeekend;
  nowMs: number;
  nextKey: string | null;
}) {
  const state = getWeekendState(weekend, nowMs);
  const days = groupSessionsByDay(weekend.sessions, mytDayKey);

  return (
    <div className="flex flex-col gap-md">
      {days.map(({ day, sessions }) => (
        <section key={day}>
          <h4 className="label-caps text-muted">
            {formatWeekdayMyt(sessions[0].startsAtIso)} ·{" "}
            {formatDayMonthMyt(sessions[0].startsAtIso)}
          </h4>
          <ul className="mt-xxs">
            {sessions.map((s) => (
              <SessionRow
                key={s.kind}
                session={s}
                isNext={`${weekend.round}-${s.kind}` === nextKey}
                isLive={state.current?.kind === s.kind}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RoundHeading({ race }: { race: RaceWeekend }) {
  const raceSession = race.sessions.find((s) => s.kind === "race");
  const isSepang = race.circuitId === "sepang";
  const hasSprint = race.sessions.some((s) => s.kind === "sprint");

  return (
    <>
      <span className="text-caption tnum text-muted w-8 shrink-0">
        {race.round}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-body-md",
            isSepang ? "text-primary" : "text-ink",
          )}
        >
          {race.raceName}
        </p>
        <p className="text-caption text-muted truncate">
          {race.circuitName}
          {hasSprint ? " · Sprint weekend" : ""}
        </p>
      </div>
      <span className="text-caption tnum text-muted shrink-0">
        {raceSession ? formatDayMonthMyt(raceSession.startsAtIso) : "TBC"}
      </span>
    </>
  );
}

export default async function SchedulePage() {
  const season = await getSeasonScheduleSafe();
  // The clock reading comes from the data layer, not from here — components
  // must stay pure, and this way every row on the page agrees on "now".
  const nowMs = season.fetchedAtMs;
  const active = pickActiveWeekend(season.data, nowMs);

  const next = active.weekend;
  const later = active.upcoming.slice(1);
  const done = season.data.filter((r) => !active.upcoming.includes(r));
  const nextState = getWeekendState(next, nowMs);
  // The single next session in the season, as "round-kind".
  const nextKey = nextState.next ? `${next.round}-${nextState.next.kind}` : null;

  return (
    <Container className="py-xxl">
      <SectionLabel>
        All times in {MYT_LABEL} · Malaysia and Singapore, UTC+8
      </SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">2026 schedule</h1>

      {season.origin === "fallback" && (
        <StatusNotice tone="warning" className="mt-md">
          {season.reason}
        </StatusNotice>
      )}

      {active.seasonOver ? (
        <StatusNotice className="mt-lg">
          The 2026 season is complete.
        </StatusNotice>
      ) : (
        <section className="mt-xl">
          <div className="flex flex-wrap items-center gap-xxs">
            <BadgePill tone="primary">Round {next.round}</BadgePill>
            {next.circuitId === "sepang" && <BadgePill>Sepang</BadgePill>}
            {nextState.status === "live" && (
              <BadgePill tone="warning">Under way</BadgePill>
            )}
          </div>

          <h2 className="text-display-md text-ink mt-xs">{next.raceName}</h2>
          <p className="text-body-md text-body mt-xxs">
            <Link
              href={`/circuits/${next.circuitId}`}
              className="hover:text-ink transition-colors underline underline-offset-4 decoration-1"
            >
              {next.circuitName}
            </Link>
            , {next.locality}
          </p>

          {nextState.next && (
            <div className="mt-lg">
              <SectionLabel>Next · {nextState.next.label}</SectionLabel>
              <Countdown targetIso={nextState.next.startsAtIso} className="mt-xs" />
            </div>
          )}

          <div className="mt-lg">
            <SessionDays weekend={next} nowMs={nowMs} nextKey={nextKey} />
          </div>
        </section>
      )}

      {later.length > 0 && (
        <>
          <Hairline className="my-xxl" />
          <SectionLabel>Still to come</SectionLabel>
          <h2 className="text-display-md text-ink mt-xxs">
            {later.length} more {later.length === 1 ? "round" : "rounds"}
          </h2>
          <ul className="mt-md">
            {later.map((race) => (
              <li key={race.round} className="border-b border-hairline">
                {/*
                  <details> rather than React state: the sessions are already
                  on the page, so opening one needs no JavaScript and works
                  before hydration.
                */}
                <details className="group">
                  <summary className="flex items-baseline gap-xs py-sm cursor-pointer list-none hover:bg-canvas-elevated transition-colors">
                    <RoundHeading race={race} />
                    <span
                      aria-hidden
                      className="text-caption text-muted shrink-0 w-4 text-right group-open:hidden"
                    >
                      +
                    </span>
                    <span
                      aria-hidden
                      className="text-caption text-muted shrink-0 w-4 text-right hidden group-open:inline"
                    >
                      −
                    </span>
                  </summary>
                  <div className="pb-md pl-8">
                    <SessionDays weekend={race} nowMs={nowMs} nextKey={nextKey} />
                    <Button
                      href={`/circuits/${race.circuitId}`}
                      variant="tertiary-text"
                      className="mt-sm"
                    >
                      Circuit stats
                    </Button>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <>
          <Hairline className="my-xxl" />
          <SectionLabel>Completed</SectionLabel>
          <h2 className="text-display-md text-ink mt-xxs">
            {done.length} {done.length === 1 ? "round" : "rounds"} run
          </h2>
          {/*
            Two links per row, side by side rather than nested — a completed
            round has two things worth reaching and an anchor cannot contain
            another. The results stay the primary destination, which is what
            someone clicking a finished race almost always wants; the circuit
            used to be reachable only while the race was still to come, so it
            fell out of the app the moment it had been run.
          */}
          <ul className="mt-md">
            {done.map((race) => (
              <li
                key={race.round}
                className="flex items-baseline gap-xs border-b border-hairline opacity-70 hover:opacity-100 transition-opacity"
              >
                <Link
                  href={`/results/${race.round}`}
                  className="flex flex-1 min-w-0 items-baseline gap-xs py-sm hover:bg-canvas-elevated transition-colors"
                >
                  <RoundHeading race={race} />
                </Link>
                <Link
                  href={`/circuits/${race.circuitId}`}
                  className="text-caption text-muted hover:text-ink shrink-0 py-sm px-xxs transition-colors"
                >
                  Circuit
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
