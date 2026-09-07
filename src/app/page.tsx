import Image from "next/image";
import { Countdown } from "@/components/Countdown";
import { StatusNotice } from "@/components/StatusNotice";
import { TeamStripe } from "@/components/team/TeamStripe";
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
import type { F1Session, RaceWeekend } from "@/lib/f1/types";
import { type SepangOutlook, getSepangOutlook } from "@/lib/f1/weather";
import { getActiveWeekend } from "@/lib/f1/weekend";
import { SessionCommandCenter } from "@/components/weekend/SessionCommandCenter";
import { VerifiedVenueGuide } from "@/components/weekend/VerifiedVenueGuide";
import { AddToCalendarButton } from "@/components/schedule/AddToCalendarButton";
import { WhatToWatch } from "@/components/editorial/WhatToWatch";
import { buildWhatToWatch } from "@/lib/f1/editorial";
import { FavouriteHighlights } from "@/components/preferences/FavouriteHighlights";

/*
 * Live Hub (PRD 7.1).
 *
 * Sepang leads while it is still to come, and the rest of the season follows
 * underneath it.
 *
 * This page used to open on whichever race was next, which is the right
 * default for a general F1 companion and the wrong one for this app: for most
 * of the season a reader arriving at a site called Sepang Box Box was met by
 * Monza. The two blocks below are the same two that were always here, with
 * their emphasis swapped — the running weekend keeps its live badge and its
 * countdown, so the app still works as a companion on every other round.
 *
 * Once Sepang has run, the swap reverses on its own and the page goes back to
 * following the next race, because a countdown to a race that has finished is
 * worse than no countdown at all.
 */

/**
 * The Sepang hero.
 *
 * The weather line is the one fact here a general F1 site would not carry, so
 * it earns its place next to the countdown: this is a tropical circuit whose
 * race starts at three in the afternoon, and the number comes from the
 * archive rather than from the reputation.
 */
function SepangHero({
  weekend,
  race,
  outlook,
}: {
  weekend: RaceWeekend;
  race: F1Session;
  outlook: SepangOutlook;
}) {
  const raceOutlook = outlook.sessions.find((s) => s.kind === "race");

  return (
    /*
     * Full-bleed hero photograph, which design.md calls the brand's strongest
     * visual signature and the page chrome — so it deliberately escapes the
     * 1280px content band the rest of the page sits in.
     *
     * `isolate` gives the image and its scrim a stacking context of their own,
     * so the content below only needs `relative` to sit above them.
     */
    <section className="relative isolate overflow-hidden border-b border-hairline">
      <Image
        src="/sepang-hero.webp"
        // Decorative: the heading beside it already names the race and the
        // circuit, so describing it again would just be read out twice.
        alt=""
        fill
        // The hero image is the largest thing above the fold and therefore the
        // LCP; without this it queues behind the rest.
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/*
        Two scrims, because the right one depends on how the photo is cropped.
        Wide: the content sits in the left half, so the cover is left-biased —
        the headline gets its contrast while the car, which is the reason to
        use this photograph at all, stays visible bottom-right. The second
        gradient sinks the bottom edge into the canvas so the section border
        reads as a seam rather than a cut.
      */}
      <div
        aria-hidden
        className="absolute inset-0 hidden sm:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(24,24,24,0.97) 0%, rgba(24,24,24,0.9) 34%, rgba(24,24,24,0.55) 66%, rgba(24,24,24,0.3) 100%)," +
            "linear-gradient(180deg, rgba(24,24,24,0.5) 0%, rgba(24,24,24,0.1) 40%, rgba(24,24,24,0.8) 100%)",
        }}
      />

      {/*
        Narrow: object-cover crops to the middle of the frame, which is the
        brightest part of the flag, and the text runs the full width — so a
        left-biased gradient covers the wrong half and leaves grey body copy
        sitting on white and red stripes. An even cover instead.
      */}
      <div
        aria-hidden
        className="absolute inset-0 sm:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(24,24,24,0.88) 0%, rgba(24,24,24,0.78) 45%, rgba(24,24,24,0.93) 100%)",
        }}
      />

      <Container className="relative py-xxl">
        <div className="flex flex-wrap items-center gap-xxs">
          <BadgePill tone="primary">Round {weekend.round}</BadgePill>
          <SectionLabel>Formula 1 returns to Sepang</SectionLabel>
        </div>

        <h1 className="text-display-mega text-ink mt-sm max-w-[14ch] text-balance">
          {weekend.raceName}
        </h1>

        <p className="text-body-md text-body mt-sm max-w-[54ch]">
          {weekend.circuitName}, {weekend.locality} · Race{" "}
          {formatFullMyt(race.startsAtIso)} {MYT_LABEL} · first visit since 2017
        </p>

        <div className="mt-xl">
          <SectionLabel>Lights out</SectionLabel>
          <Countdown targetIso={race.startsAtIso} className="mt-xs" />
        </div>

        <p className="text-body-md text-body mt-lg max-w-[60ch]">
          {raceOutlook?.origin === "forecast" &&
          raceOutlook.rainChancePct !== null ? (
            <>
              <span className="text-ink">
                {raceOutlook.rainChancePct}% chance of rain
              </span>{" "}
              at the start, forecast for {formatFullMyt(race.startsAtIso)}.
            </>
          ) : (
            <>
              <span className="text-ink">
                Rain falls in {outlook.wetHourPct}% of early-October afternoons
                here
              </span>{" "}
              — measured across {outlook.hoursSampled} of them since{" "}
              {outlook.fromYear}. Sepang runs in the monsoon transition, and the
              race starts at three in the afternoon.
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-xs mt-xl">
          <Button href="/sepang">Sepang history</Button>
          <Button href="/circuits/sepang" variant="outline-on-dark">
            Circuit guide
          </Button>
          <Button href="/schedule" variant="outline-on-dark">
            Full schedule
          </Button>
        </div>
      </Container>
    </section>
  );
}

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
            This weekend is complete. Full classification is on the results
            page.
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
  /**
   * `constructorId` is separate from `key` on purpose: on the drivers card the
   * key is the driver's id, so there is no team id to reuse. Rows without one
   * simply render no stripe.
   */
  rows: Array<{
    key: string;
    position: number;
    name: string;
    sub: string;
    points: number;
    constructorId?: string;
  }>;
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
              {/* An inner stretch context, so the stripe can take the height
                  of the two lines without disturbing the baseline alignment
                  of the position and points either side of it. */}
              <div className="flex-1 min-w-0 flex items-stretch gap-xs">
                {row.constructorId && (
                  <TeamStripe constructorId={row.constructorId} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-body-md text-ink truncate">{row.name}</p>
                  <p className="text-caption text-muted truncate">{row.sub}</p>
                </div>
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
  const [active, drivers, constructors] = await Promise.all([
    getActiveWeekend(),
    getDriverStandingsSafe(),
    getConstructorStandingsSafe(),
  ]);

  const weekend = active.data.weekend;
  // The clock reading comes from the data layer, not from here — components
  // must stay pure, and this way every section agrees on "now".
  const state = getWeekendState(weekend, active.fetchedAtMs);

  const sepang = active.data.sepang;
  const sepangIsActive = sepang?.round === weekend.round;
  const sepangRace = sepang?.sessions.find((s) => s.kind === "race") ?? null;
  const sepangToCome =
    sepangRace !== null &&
    new Date(sepangRace.endsAtIso).getTime() > active.fetchedAtMs;

  // Sepang leads until it has run. Once it is the active weekend the ordinary
  // hero already is Sepang, so leading with it twice would just be repetition.
  const leadWithSepang =
    sepang !== null && sepangRace !== null && sepangToCome && !sepangIsActive;

  const outlook = leadWithSepang
    ? await getSepangOutlook(sepang.sessions)
    : null;

  return (
    <>
      {leadWithSepang && outlook ? (
        <SepangHero weekend={sepang} race={sepangRace} outlook={outlook} />
      ) : (
        <Hero weekend={weekend} state={state} />
      )}

      <Container className="py-xxl">
        {active.origin === "fallback" && (
          <StatusNotice tone="warning" className="mb-lg">
            {active.reason}
          </StatusNotice>
        )}

        {/*
          The rest of the season, demoted but not dropped. During any other
          round this is the part a reader actually came for, so it keeps the
          live badge and the countdown it had when it was the hero.
        */}
        {leadWithSepang && (
          <section className="mb-xxl border border-hairline p-md">
            <div className="flex flex-wrap items-center gap-xxs">
              <BadgePill tone="primary">Round {weekend.round}</BadgePill>
              {state.status === "live" && state.current ? (
                <BadgePill tone="warning">{state.current.label} live</BadgePill>
              ) : (
                <SectionLabel>
                  {state.status === "finished" ? "Last round" : "Up next"}
                </SectionLabel>
              )}
            </div>
            <p className="text-body-md text-ink mt-xs">
              {weekend.raceName} · {weekend.circuitName}
            </p>
            {state.next && (
              <Countdown targetIso={state.next.startsAtIso} className="mt-md" />
            )}
            <div className="flex flex-wrap gap-xs mt-md">
              <Button href="/live" variant="outline-on-dark">
                Session timing
              </Button>
              <Button href="/standings" variant="outline-on-dark">
                Standings
              </Button>
            </div>
          </section>
        )}

        {state.status === "live" && (
          <StatusNotice className="mb-lg">
            A session is running now. This is a free, unofficial project, so
            positions appear once the session is classified rather than lap by
            lap — the standings below are current as of the last completed
            round.
          </StatusNotice>
        )}

        {state.next && (
          <div className="mb-lg">
            <WhatToWatch data={buildWhatToWatch({
              weekend,
              session: state.next,
              drivers: drivers.data?.entries ?? null,
              constructors: constructors.data?.entries ?? null,
            })} />
          </div>
        )}

        <SessionCommandCenter weekend={weekend} nowMs={active.fetchedAtMs} compact />
        {state.next && (
          <div className="mt-xs">
            <AddToCalendarButton
              title={`${weekend.raceName} · ${state.next.label}`}
              startsAtIso={state.next.startsAtIso}
              endsAtIso={state.next.endsAtIso}
            />
          </div>
        )}

        {sepangIsActive && <div className="mt-lg"><VerifiedVenueGuide /></div>}

        {(drivers.data || constructors.data) && (
          <div className="my-lg">
            <FavouriteHighlights
              drivers={drivers.data?.entries ?? []}
              constructors={constructors.data?.entries ?? []}
            />
          </div>
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
              constructorId: e.constructor.id,
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
          Jolpica-F1 and weather from Open-Meteo. Neither is an official
          Formula 1 or FIA source.
        </p>
      </Container>
    </>
  );
}
