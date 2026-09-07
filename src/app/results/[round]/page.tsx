import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusNotice } from "@/components/StatusNotice";
import {
  CircuitOutline,
  getCircuitMap,
} from "@/components/circuit/CircuitMap";
import { TeamStripe } from "@/components/team/TeamStripe";
import { Button } from "@/components/ui/Button";
import { Container, Hairline, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { SEPANG, getQualifyingResult, getRaceResult } from "@/lib/f1/jolpica";
import type { QualifyingResult, RaceResult } from "@/lib/f1/types";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";
import { SessionRecap } from "@/components/editorial/SessionRecap";
import { buildQualifyingRecap, buildRaceRecap } from "@/lib/f1/editorial";
import { getWeekendState } from "@/lib/f1/session-windows";

export const revalidate = 300;

const TH = "label-caps text-muted font-normal text-left py-xs";
const TD = "py-sm align-baseline";

async function load(round: string): Promise<{
  race: RaceResult | null;
  qualifying: QualifyingResult | null;
  failed: boolean;
}> {
  // A round with a race but no published qualifying (or vice versa) is normal,
  // so the two are settled independently rather than failing together.
  const [race, qualifying] = await Promise.allSettled([
    getRaceResult(SEPANG.season, round),
    getQualifyingResult(SEPANG.season, round),
  ]);

  return {
    race: race.status === "fulfilled" ? race.value : null,
    qualifying: qualifying.status === "fulfilled" ? qualifying.value : null,
    failed: race.status === "rejected" && qualifying.status === "rejected",
  };
}

function RaceTable({ result }: { result: RaceResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-cards w-full min-w-0 sm:min-w-[34rem] border-collapse">
        <caption className="sr-only">{result.raceName} race result</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className={cn(TH, "w-10")}>
              Pos
            </th>
            <th scope="col" className={TH}>
              Driver
            </th>
            <th scope="col" className={cn(TH, "text-right w-16")}>
              Grid
            </th>
            <th scope="col" className={cn(TH, "text-right w-32")}>
              Time
            </th>
            <th scope="col" className={cn(TH, "text-right w-14")}>
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => {
            const retired = row.position === null || !/^\d+$/.test(row.positionText);
            return (
              <tr
                key={row.driver.id}
                className={cn(
                  "border-b border-hairline last:border-b-0",
                  retired && "opacity-60",
                )}
              >
                <td className={cn(TD, "w-10")}>
                  <span
                    className={cn(
                      "text-title-md tnum",
                      retired
                        ? "text-muted"
                        : row.position === 1
                          ? "text-primary"
                          : "text-ink",
                    )}
                  >
                    {retired ? row.positionText : row.position}
                  </span>
                </td>
                <td className={TD}>
                  {/* The stripe sits inside the row's opacity, so a retired
                      car dims its livery along with its name. */}
                  <span className="flex items-stretch gap-xs">
                    <TeamStripe constructorId={row.constructor.id} />
                    <span className="block">
                      <span className="text-body-md text-ink">
                        {row.driver.fullName}
                      </span>
                      <span className="block text-caption text-muted">
                        {row.constructor.name} · {row.status}
                      </span>
                    </span>
                  </span>
                </td>
                <td data-label="Grid" className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {row.gridPosition || "—"}
                </td>
                <td data-label="Time" className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {/* Lapped cars report a line gap, not a gap to the leader. */}
                  {retired
                    ? "—"
                    : row.lapsDown > 0
                      ? `+${row.lapsDown} lap${row.lapsDown > 1 ? "s" : ""}`
                      : (row.time ?? "—")}
                </td>
                <td data-label="Points" className={cn(TD, "text-right tnum text-body-md text-ink")}>
                  {row.points || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QualifyingTable({ result }: { result: QualifyingResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-cards w-full min-w-0 sm:min-w-[32rem] border-collapse">
        <caption className="sr-only">{result.raceName} qualifying result</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className={cn(TH, "w-10")}>
              Pos
            </th>
            <th scope="col" className={TH}>
              Driver
            </th>
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Q1
            </th>
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Q2
            </th>
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Q3
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr
              key={row.driver.id}
              className="border-b border-hairline last:border-b-0"
            >
              <td className={cn(TD, "w-10")}>
                <span
                  className={cn(
                    "text-title-md tnum",
                    row.position === 1 ? "text-primary" : "text-ink",
                  )}
                >
                  {row.position}
                </span>
              </td>
              <td className={TD}>
                <span className="flex items-stretch gap-xs">
                  <TeamStripe constructorId={row.constructor.id} />
                  <span className="block">
                    <span className="text-body-md text-ink">
                      {row.driver.fullName}
                    </span>
                    <span className="block text-caption text-muted">
                      {row.constructor.name}
                    </span>
                  </span>
                </span>
              </td>
              <td data-label="Q1" className={cn(TD, "text-right tnum text-body-md text-body")}>
                {row.q1 ?? "—"}
              </td>
              <td data-label="Q2" className={cn(TD, "text-right tnum text-body-md text-body")}>
                {row.q2 ?? "—"}
              </td>
              <td data-label="Q3" className={cn(TD, "text-right tnum text-body-md text-ink")}>
                {row.q3 ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RoundResultPage({
  params,
}: PageProps<"/results/[round]">) {
  const { round } = await params;
  if (!/^\d{1,2}$/.test(round)) notFound();

  const season = await getSeasonScheduleSafe();
  const weekend = season.data.find((r) => r.round === round) ?? null;
  if (!weekend) notFound();

  const { race, qualifying, failed } = await load(round);

  /*
   * Which circuit this round was held at.
   *
   * Taken from the schedule rather than from the results, because the results
   * do not carry it: RaceResult has a circuitName but no id, and
   * QualifyingResult has neither. Resolving it here means one mechanism that
   * works whether the race, the qualifying, or both have been published — and
   * getSeasonScheduleSafe is already cached and shared with the pages that
   * loaded it first.
   */
  if (failed) {
    return (
      <Container className="py-xxl">
        <h1 className="text-display-lg text-ink">Round {round}</h1>
        <StatusNotice tone="warning" className="mt-md">
          Results are temporarily unavailable. Please try again shortly.
        </StatusNotice>
        <Button href="/results" variant="outline-on-dark" className="mt-lg">
          All results
        </Button>
      </Container>
    );
  }

  if (!race && !qualifying) {
    return (
      <Container className="py-xxl">
        <h1 className="text-display-lg text-ink">{weekend.raceName}</h1>
        <StatusNotice tone="warning" className="mt-md">
          Results have not been published for this round yet.
        </StatusNotice>
        <Button href="/results" variant="outline-on-dark" className="mt-lg">
          All results
        </Button>
      </Container>
    );
  }

  const title = race?.raceName ?? qualifying?.raceName ?? `Round ${round}`;
  const state = getWeekendState(weekend, season.fetchedAtMs);
  const session = race ? weekend.sessions.find((item) => item.kind === "race") : weekend.sessions.find((item) => item.kind === "quali");
  const recap = session
    ? race
      ? buildRaceRecap({ result: race, session, nextSession: state.next, provisional: false })
      : buildQualifyingRecap({ result: qualifying, session, nextSession: state.next })
    : null;

  return (
    <Container className="py-xxl">
      <SectionLabel>2026 · Round {round}</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">{title}</h1>
      {race && (
        <p className="text-body-md text-body mt-xs">{race.circuitName}</p>
      )}

      {/*
        The track this happened on. A completed round used to dead-end in its
        classification with no way back to the circuit at all, which is the
        one piece of context that makes a result mean something — a 19-turn
        street circuit and a 4.3km permanent one produce different races.
      */}
      {weekend && getCircuitMap(weekend.circuitId) && (
        <Link
          href={`/circuits/${weekend.circuitId}`}
          /*
           * Stacked on a phone, side by side from sm up.
           *
           * This was a flex-wrap row whose text column carried `min-w-0`, and
           * the two fight: min-w-0 lets the column shrink below its content
           * rather than pushing itself onto the next line, so at 390px it
           * collapsed to about 55px and set the circuit name one word per
           * line. Choosing the direction explicitly is unambiguous where
           * relying on wrap was not.
           */
          className="flex flex-col sm:flex-row sm:items-center gap-md mt-lg border border-hairline p-md hover:bg-canvas-elevated transition-colors"
        >
          <CircuitOutline
            circuitId={weekend.circuitId}
            name={weekend.circuitName}
            className="max-h-[120px] w-auto max-w-[240px] shrink-0"
            strokePx={3}
          />
          <span className="min-w-0">
            <SectionLabel>The circuit</SectionLabel>
            <span className="block text-body-md text-ink mt-xxs">
              {weekend.circuitName}
            </span>
            <span className="block text-caption text-muted mt-xxxs">
              {weekend.locality}, {weekend.country}
            </span>
            <span className="block text-caption text-primary mt-xs">
              Circuit guide →
            </span>
          </span>
        </Link>
      )}

      {recap && <div className="mt-xl"><SessionRecap data={recap} /></div>}

      {race ? (
        <section className="mt-xl">
          <h2 className="text-display-md text-ink">Race</h2>
          <div className="mt-xs">
            <RaceTable result={race} />
          </div>
        </section>
      ) : (
        <StatusNotice className="mt-xl">
          No race classification has been published for this round yet.
        </StatusNotice>
      )}

      {qualifying && (
        <>
          <Hairline className="my-xxl" />
          <section>
            <h2 className="text-display-md text-ink">Qualifying</h2>
            <div className="mt-xs">
              <QualifyingTable result={qualifying} />
            </div>
          </section>
        </>
      )}

      <Button href="/results" variant="outline-on-dark" className="mt-xxl">
        All results
      </Button>
    </Container>
  );
}
