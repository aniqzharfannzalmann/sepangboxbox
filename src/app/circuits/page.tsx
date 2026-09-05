import Link from "next/link";
import { StatusNotice } from "@/components/StatusNotice";
import {
  CircuitOutline,
  getCircuitMap,
  humanType,
} from "@/components/circuit/CircuitMap";
import { BadgePill, Container, SectionLabel } from "@/components/ui/primitives";
import { SEPANG } from "@/lib/f1/jolpica";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";

/*
 * Five minutes, which is more often than this page needs and is the right
 * number anyway.
 *
 * Nothing here changes between deploys — committed artwork and a calendar
 * fixed months ago — so a day would be defensible. But the schedule fetch is
 * shared with the home page and /schedule, which do want a short window, and
 * Next caches by URL and options: asking for a longer one here would create a
 * second cache entry for the same request rather than reusing theirs, and cost
 * an extra call to Jolpica instead of saving one. Re-rendering a static page
 * from a warm cache is free; fetching the same schedule twice is not.
 */
export const revalidate = 300;

export const metadata = {
  title: "Circuits",
  description:
    "All 23 circuits of the 2026 Formula 1 season, with track outlines, length and turn counts — including Sepang International Circuit.",
};

/*
 * Every circuit on the calendar, as a drawing.
 *
 * These pages existed before this one did, and were nearly unreachable: the
 * schedule linked a circuit only while its race was still to come, so each one
 * fell out of the app the moment it had been raced. By the end of a season
 * that would have been 22 of 23 with no way in.
 *
 * Deliberately cheap. getCircuitProfile makes several Jolpica requests per
 * circuit — winners, poles, fastest laps — and 23 of those would be dozens of
 * requests against a 500/hour budget to render a page of outlines. Everything
 * here comes from the committed map file and one schedule fetch that other
 * pages have already warmed.
 */

export default async function CircuitsPage() {
  const season = await getSeasonScheduleSafe();

  return (
    <Container className="py-xxl">
      <SectionLabel>2026 calendar</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Circuits</h1>
      <p className="text-body-md text-body mt-xs max-w-[56ch]">
        Twenty-three rounds, and the shape of every one of them. Sepang is round{" "}
        {SEPANG.round}.
      </p>

      {season.origin === "fallback" && (
        <StatusNotice tone="warning" className="mt-lg">
          {season.reason}
        </StatusNotice>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-xs mt-lg">
        {season.data.map((race) => {
          const map = getCircuitMap(race.circuitId);
          const isSepang = race.circuitId === SEPANG.circuitId;

          return (
            <li key={race.round}>
              <Link
                href={`/circuits/${race.circuitId}`}
                className="flex flex-col h-full border border-hairline p-md hover:bg-canvas-elevated transition-colors"
              >
                <div className="flex flex-wrap items-center gap-xxs">
                  <BadgePill tone={isSepang ? "primary" : "neutral"}>
                    Round {race.round}
                  </BadgePill>
                  {isSepang && <SectionLabel>The one this is for</SectionLabel>}
                </div>

                {/*
                  A fixed height rather than a fixed box: aspect ratios run from
                  0.39 to 2.52 across these, so letting each keep its own shape
                  inside a common height is what makes the grid read as one set
                  instead of 23 differently-scaled drawings.
                */}
                <div className="flex items-center justify-center h-[140px] my-md">
                  <CircuitOutline
                    circuitId={race.circuitId}
                    name={race.circuitName}
                    className="max-h-[140px]"
                    strokePx={3}
                  />
                </div>

                <div className="mt-auto">
                  <span className="block text-body-md text-ink">
                    {race.circuitName}
                  </span>
                  <span className="block text-caption text-muted mt-xxxs">
                    {race.locality}, {race.country}
                  </span>
                  {map && (
                    <span className="block text-caption text-muted mt-xxs tnum">
                      {map.lengthKm} km · {map.turns} turns ·{" "}
                      {humanType(map.type).toLowerCase()}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
