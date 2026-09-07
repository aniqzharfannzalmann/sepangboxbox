import Image from "next/image";
import { StatusNotice } from "@/components/StatusNotice";
import { SepangCircuitExplorer } from "@/components/sepang/SepangCircuitExplorer";
import { SepangGrandstandGuide } from "@/components/sepang/SepangGrandstandGuide";
import { WeatherOutlook } from "@/components/sepang/WeatherOutlook";
import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
  SpecCell,
} from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { SEPANG } from "@/lib/f1/jolpica";
import {
  LAST_SEPANG_RACE,
  type SepangHistory,
  type TallyEntry,
  getSepangHistory,
} from "@/lib/f1/sepang-history";
import { getSepangOutlook } from "@/lib/f1/weather";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";
import { VerifiedVenueGuide } from "@/components/weekend/VerifiedVenueGuide";

/*
 * An hour, not a day.
 *
 * The history on this page is settled and would happily cache for a week, but
 * the weather section is now on it, and once the race is close enough for a
 * real forecast a day-old one is worth very little. The upstream fetches carry
 * their own windows underneath this.
 */
export const revalidate = 3600;

export const metadata = {
  title: "Sepang",
  description:
    "Every Malaysian Grand Prix at Sepang International Circuit, 1999 to 2017 — winners, pole sitters and the lap record, ahead of Formula 1's return in 2026.",
};

/*
 * Sepang's history.
 *
 * Nineteen Malaysian Grands Prix between 1999 and 2017, then nine years
 * without one. This is the page a generic F1 app will not have, and the
 * reason the 2026 weekend means something locally.
 */

const YEARS_AWAY = Number(SEPANG.season) - Number(LAST_SEPANG_RACE.season);

function TallyList({
  title,
  entries,
  suffix,
  note,
}: {
  title: string;
  entries: TallyEntry[];
  suffix: string;
  note?: string;
}) {
  if (entries.length === 0) return null;

  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-xs">
        {entries.slice(0, 4).map((entry, i) => (
          <li
            key={entry.id}
            className="flex items-baseline gap-xs py-xs border-b border-hairline last:border-b-0"
          >
            <span
              className={cn(
                "text-title-md tnum w-6 shrink-0",
                // Rosso Corsa marks the record holder only — design.md keeps
                // the accent scarce.
                i === 0 ? "text-primary" : "text-ink",
              )}
            >
              {entry.count}
            </span>
            <span className="text-body-md text-body flex-1 min-w-0 truncate">
              {entry.name}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted mt-xxs">
        {suffix}
        {note ? ` · ${note}` : ""}
      </p>
    </section>
  );
}

function RollOfHonour({ history }: { history: SepangHistory }) {
  // Newest first: 2017 is the race people actually remember.
  const races = [...history.winners].reverse();
  // Keyed on season *and* round: a circuit can hold two Grands Prix in one
  // season (the Red Bull Ring did in 2020 and 2021), and keying on the year
  // alone would silently drop one pole and show the other against the wrong
  // race. Sepang has never doubled up, but the shape of the bug does not
  // depend on that.
  const poleByRace = new Map(
    history.poles.map((p) => [`${p.season}-${p.round}`, p]),
  );

  return (
    <ul className="mt-md">
      {races.map((race) => {
        const pole = poleByRace.get(`${race.season}-${race.round}`);
        return (
          <li
            key={`${race.season}-${race.round}`}
            className="flex items-baseline gap-xs py-sm border-b border-hairline last:border-b-0"
          >
            <span className="text-title-sm tnum text-muted w-12 shrink-0">
              {race.season}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-body-md text-ink">{race.driverName}</p>
              <p className="text-caption text-muted truncate">
                {race.constructorName}
                {/* Ergast has no qualifying data before 2002. Say so, rather
                    than leaving a blank that reads as "no pole was set". */}
                {pole ? ` · Pole: ${pole.driverName}` : " · Pole not recorded"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function SepangPage() {
  // The weather is an enhancement: if the weekend cannot be loaded, the page
  // is still a complete history of the circuit and should render as one.
  const [history, season] = await Promise.all([
    getSepangHistory(),
    /*
     * The whole schedule, not a single-round fetch.
     *
     * All this needs is Sepang's session times, and they are already in the
     * committed season snapshot that getSeasonScheduleSafe falls back to — so
     * asking this way means the weather still renders when Jolpica is down,
     * where a bare getRaceWeekend would have taken it out too. It also reuses
     * a request the rest of the app has already made.
     */
    getSeasonScheduleSafe(),
  ]);
  const weekend =
    season.data.find((r) => r.round === SEPANG.round) ?? null;
  const h = history.data;
  const outlook = weekend ? await getSepangOutlook(weekend.sessions) : null;

  /*
   * No early return on a failed live query.
   *
   * This used to replace the entire page with an error and a button, which
   * threw away the hero, the links and the weather outlook — none of which
   * come from this data. Combined with prerendering, one transient Jolpica
   * failure during a Vercel build baked that empty page into the static output
   * and served it from cache. getSepangHistory now falls back to the committed
   * snapshot, so the page renders in full and only says where the numbers came
   * from.
   */
  const lastWinner = h.winners.at(-1);

  return (
    <>
      {/*
       * Full-bleed hero photograph, the treatment design.md calls the page
       * chrome — and here it is the 2010 opening lap, the whole field piling
       * into Turn 1 at this circuit. A page about nineteen races deserves one
       * of them behind it.
       */}
      <section className="relative isolate overflow-hidden border-b border-hairline">
        <Image
          src="/sepang-2010-opening-lap.webp"
          // Decorative: the heading names the circuit and the years, so
          // describing the photograph would only repeat it.
          alt=""
          fill
          // Above the fold on this page, so it is the LCP.
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/*
          Heavier cover than the home hero, because this photograph is busy
          everywhere. That one had a dark hillside for the type to sit on; this
          is twenty-four cars, red and white kerbs and bright grass edge to
          edge, with no quiet corner to exploit. Wide, it still leans left
          where the content is, so the leading cars stay legible on the right.
        */}
        <div
          aria-hidden
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(24,24,24,0.97) 0%, rgba(24,24,24,0.93) 38%, rgba(24,24,24,0.68) 70%, rgba(24,24,24,0.45) 100%)," +
              "linear-gradient(180deg, rgba(24,24,24,0.55) 0%, rgba(24,24,24,0.25) 40%, rgba(24,24,24,0.85) 100%)",
          }}
        />

        {/*
          Narrow: object-cover crops a 2.09:1 photograph hard, so what is left
          is the middle of the pack rather than any margin, and the text runs
          full width. An even cover, and a firm one.
        */}
        <div
          aria-hidden
          className="absolute inset-0 sm:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(24,24,24,0.92) 0%, rgba(24,24,24,0.85) 45%, rgba(24,24,24,0.95) 100%)",
          }}
        />

        <Container className="relative py-xxl">
          <BadgePill tone="primary">1999 – 2017</BadgePill>
          <h1 className="text-display-mega text-ink mt-sm max-w-[16ch] text-balance">
            Formula 1 returns to Sepang
          </h1>
          <p className="text-body-md text-body mt-sm max-w-[56ch]">
            Sepang International Circuit held {h.coverage.races} Malaysian
            Grands Prix before Formula 1 left after {LAST_SEPANG_RACE.season}.
            {lastWinner ? ` ${lastWinner.driverName} won the last one.` : ""}{" "}
            The cars come back in October.
          </p>

          <div className="grid grid-cols-2 gap-lg sm:flex sm:flex-wrap sm:gap-xl mt-xl">
            <SpecCell value={YEARS_AWAY} label="Years away" accent />
            <SpecCell value={h.coverage.races} label="Races held" />
            {h.lapRecord && (
              <SpecCell
                value={h.lapRecord.time}
                label="Lap record"
                /* A lap time at 48px is about 200px wide and cannot break, so
                   in a two-column grid it overflows its track. Given the whole
                   row it fits; the counts beside it are narrow and pair fine. */
                className="col-span-2 sm:col-span-1"
              />
            )}
          </div>

          {/* Said quietly and in place, rather than instead of the page: the
              figures are still right, they just did not come off the wire. */}
          {history.origin === "fallback" && (
            <StatusNotice className="mt-lg">{history.reason}</StatusNotice>
          )}

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-xs mt-xl w-full sm:w-auto">
            <Button
              href="/schedule"
              className="w-full sm:w-auto text-center justify-center"
            >
              2026 weekend
            </Button>
            <Button
              href="#track-explorer"
              variant="outline-on-dark"
              className="w-full sm:w-auto text-center justify-center"
            >
              Track explorer
            </Button>
            <Button
              href="#grandstand-guide"
              variant="outline-on-dark"
              className="w-full sm:w-auto text-center justify-center"
            >
              Grandstand guide
            </Button>
            <Button
              href="/circuits/sepang"
              variant="outline-on-dark"
              className="w-full sm:w-auto text-center justify-center"
            >
              Circuit stats
            </Button>
          </div>
        </Container>
      </section>

      {outlook && (
        <Container className="pt-lg sm:pt-xxl">
          <WeatherOutlook outlook={outlook} />
        </Container>
      )}

      <Container id="track-explorer" className="pt-lg sm:pt-xxl">
        <SepangCircuitExplorer />
      </Container>

      <Container className="pt-lg sm:pt-xxl">
        <SepangGrandstandGuide />
      </Container>

      <Container className="pt-lg sm:pt-xxl">
        <VerifiedVenueGuide />
      </Container>

      <Container className="py-lg sm:py-xxl">
        <SectionLabel>Records at Sepang</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-xl mt-md">
          <TallyList
            title="Most wins"
            entries={h.driverWins}
            suffix={`Across ${h.coverage.races} races`}
          />
          <TallyList
            title="Most poles"
            entries={h.driverPoles}
            suffix={`From ${h.coverage.poles} races with qualifying data`}
            note="none recorded before 2002"
          />
          <TallyList
            title="Constructors"
            entries={h.constructorWins}
            suffix={`Across ${h.coverage.races} races`}
          />
        </div>

        {h.lapRecord && (
          <p className="text-body-sm text-muted mt-lg max-w-[62ch]">
            Fastest race lap: {h.lapRecord.time} by {h.lapRecord.driverName} in{" "}
            {h.lapRecord.season}, from the {h.coverage.fastestLaps} races with
            fastest-lap data on record.
          </p>
        )}

        <Hairline className="my-xxl" />

        <SectionLabel>Roll of honour</SectionLabel>
        <h2 className="text-display-md text-ink mt-xxs">Every winner</h2>
        <RollOfHonour history={h} />

        {h.lastRace && (
          <>
            <Hairline className="my-xxl" />
            <SectionLabel>The last one · {LAST_SEPANG_RACE.season}</SectionLabel>
            <h2 className="text-display-md text-ink mt-xxs">
              {h.lastRace.raceName}
            </h2>
            <p className="text-body-md text-body mt-xs max-w-[56ch]">
              The final Malaysian Grand Prix before the sport left. This is how
              it finished.
            </p>
            <ul className="mt-md">
              {h.lastRace.rows.slice(0, 3).map((row) => (
                <li
                  key={row.driver.id}
                  className="flex items-baseline gap-xs py-sm border-b border-hairline last:border-b-0"
                >
                  <span
                    className={cn(
                      "text-title-md tnum w-8 shrink-0",
                      row.position === 1 ? "text-primary" : "text-ink",
                    )}
                  >
                    {row.position}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md text-ink">
                      {row.driver.fullName}
                    </p>
                    <p className="text-caption text-muted truncate">
                      {row.constructor.name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </>
  );
}
