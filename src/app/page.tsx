import { Countdown } from "@/components/Countdown";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
} from "@/components/ui/primitives";
import { getWeekendState } from "@/lib/f1/session-windows";
import {
  getConstructorStandingsSafe,
  getDriverStandingsSafe,
} from "@/lib/f1/standings";
import { MYT_LABEL, formatFullMyt } from "@/lib/f1/time";
import type { RaceWeekend } from "@/lib/f1/types";
import { getSepangWeekend } from "@/lib/f1/weekend";

/*
 * Live Hub (PRD 7.1).
 *
 * During a session this becomes the live leaderboard. Until Phase 2 lands the
 * timing adapter, it leads with the countdown and a championship snapshot —
 * which is also exactly what it shows for the ~95% of the season when no car
 * is on track.
 */

function Hero({
  weekend,
  state,
}: {
  weekend: RaceWeekend;
  state: ReturnType<typeof getWeekendState>;
}) {
  const raceSession = weekend.sessions.find((s) => s.kind === "race");

  return (
    <section className="border-b border-hairline">
      <Container className="py-xxl">
        <div className="flex items-center gap-xxs">
          <BadgePill tone="primary">Round {weekend.round}</BadgePill>
          {state.status === "live" && state.current && (
            <BadgePill tone="warning">{state.current.label} live</BadgePill>
          )}
        </div>

        <h1 className="text-display-mega text-ink mt-sm max-w-[14ch] text-balance">
          {weekend.raceName}
        </h1>

        <p className="text-body-md text-body mt-sm max-w-[54ch]">
          {weekend.circuitName}, {weekend.locality} ·{" "}
          {raceSession
            ? `Race ${formatFullMyt(raceSession.startsAtIso)} ${MYT_LABEL}`
            : "Race time to be confirmed"}
        </p>

        {state.next && (
          <div className="mt-xl">
            <SectionLabel>Next · {state.next.label}</SectionLabel>
            <Countdown targetIso={state.next.startsAtIso} className="mt-xs" />
          </div>
        )}

        {state.status === "finished" && (
          <StatusNotice className="mt-xl">
            The Sepang weekend is complete. Full classification is on the
            results page.
          </StatusNotice>
        )}

        {/*
          Once the weekend is under way, timing is what people came for and it
          takes the primary CTA. Before that, the schedule is the useful thing.
        */}
        <div className="flex flex-wrap gap-xs mt-xl">
          {state.status === "before" ? (
            <>
              <Button href="/schedule">Full schedule</Button>
              <Button href="/live" variant="outline-on-dark">
                Live timing
              </Button>
            </>
          ) : (
            <>
              <Button href="/live">Live timing</Button>
              <Button href="/schedule" variant="outline-on-dark">
                Full schedule
              </Button>
            </>
          )}
          <Button href="/standings" variant="outline-on-dark">
            Standings
          </Button>
        </div>
      </Container>
    </section>
  );
}

function TopFive({
  title,
  rows,
  href,
  unavailable,
}: {
  title: string;
  rows: Array<{ key: string; position: number; name: string; sub: string; points: number }>;
  href: "/standings";
  unavailable: boolean;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-xs">
        <h2 className="text-display-md text-ink">{title}</h2>
        <Button href={href} variant="tertiary-text">
          All
        </Button>
      </div>

      {unavailable ? (
        <StatusNotice tone="warning" className="mt-md">
          Standings are temporarily unavailable.
        </StatusNotice>
      ) : (
        <ul className="mt-xs">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-baseline gap-xs py-sm border-b border-hairline last:border-b-0"
            >
              <span
                className={
                  row.position === 1
                    ? "text-title-md tnum text-primary w-8 shrink-0"
                    : "text-title-md tnum text-ink w-8 shrink-0"
                }
              >
                {row.position}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body-md text-ink truncate">{row.name}</p>
                <p className="text-caption text-muted truncate">{row.sub}</p>
              </div>
              <span className="text-title-sm tnum text-ink shrink-0">
                {row.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Home() {
  const [weekend, drivers, constructors] = await Promise.all([
    getSepangWeekend(),
    getDriverStandingsSafe(),
    getConstructorStandingsSafe(),
  ]);

  // The clock reading comes from the data layer, not from here — components
  // must stay pure, and this way every section agrees on "now".
  const state = getWeekendState(weekend.data, weekend.fetchedAtMs);

  return (
    <>
      <Hero weekend={weekend.data} state={state} />

      <Container className="py-xxl">
        {weekend.origin === "fallback" && (
          <StatusNotice tone="warning" className="mb-lg">
            {weekend.reason}
          </StatusNotice>
        )}

        {state.status === "live" && (
          <StatusNotice className="mb-lg">
            A session is running now. Live timing arrives in the next release —
            standings below are current as of the last completed round.
          </StatusNotice>
        )}

        <SectionLabel>Championship snapshot</SectionLabel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mt-md">
          <TopFive
            title="Drivers"
            href="/standings"
            unavailable={!drivers.data}
            rows={(drivers.data?.entries ?? []).slice(0, 5).map((e) => ({
              key: e.driver.id,
              position: e.position,
              name: e.driver.fullName,
              sub: e.constructors.map((c) => c.name).join(" / "),
              points: e.points,
            }))}
          />

          <TopFive
            title="Constructors"
            href="/standings"
            unavailable={!constructors.data}
            rows={(constructors.data?.entries ?? []).slice(0, 5).map((e) => ({
              key: e.constructor.id,
              position: e.position,
              name: e.constructor.name,
              sub: e.constructor.nationality,
              points: e.points,
            }))}
          />
        </div>

        <Hairline className="my-xxl" />

        <SectionLabel>Unofficial</SectionLabel>
        <p className="text-body-md text-body mt-xs max-w-[60ch]">
          Sepang Box Box is a fan project. Championship data comes from
          Jolpica-F1; live session data will come from OpenF1. Neither is an
          official Formula 1 or FIA source.
        </p>
      </Container>
    </>
  );
}
