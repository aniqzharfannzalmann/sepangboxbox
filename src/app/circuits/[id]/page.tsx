import { notFound } from "next/navigation";
import { StatusNotice } from "@/components/StatusNotice";
import {
  CircuitMap,
  getCircuitMap,
  humanDirection,
  humanType,
} from "@/components/circuit/CircuitMap";
import { RatingBar } from "@/components/circuit/RatingBar";
import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
  SpecCell,
} from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { getCircuitProfile } from "@/lib/f1/circuit-stats";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";
import type { RaceWeekend } from "@/lib/f1/types";

export const revalidate = 86400;

/*
 * Circuit profile.
 *
 * The stats are measured rather than editorial — see circuit-stats.ts. The
 * page's job is to make the measurement legible and to be explicit about what
 * it covers, so a reader can weigh it rather than take it on faith.
 */

async function findCircuit(id: string): Promise<RaceWeekend | null> {
  const season = await getSeasonScheduleSafe();
  return season.data.find((r) => r.circuitId === id) ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/circuits/[id]">) {
  const { id } = await params;
  const race = await findCircuit(id);
  return {
    title: race?.circuitName ?? "Circuit",
    description: race
      ? `Race history and measured circuit characteristics for ${race.circuitName}, ${race.locality}.`
      : undefined,
  };
}

function TopList({
  title,
  entries,
}: {
  title: string;
  entries: Array<{ id: string; name: string; count: number }>;
}) {
  if (entries.length === 0) return null;
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-xs">
        {entries.slice(0, 4).map((e, i) => (
          <li
            key={e.id}
            className="flex items-baseline gap-xs py-xs border-b border-hairline last:border-b-0"
          >
            <span
              className={cn(
                "text-title-md tnum w-6 shrink-0",
                i === 0 ? "text-primary" : "text-ink",
              )}
            >
              {e.count}
            </span>
            <span className="text-body-md text-body flex-1 min-w-0 truncate">
              {e.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CircuitPage({
  params,
}: PageProps<"/circuits/[id]">) {
  const { id } = await params;
  if (!/^[a-z0-9_]{2,40}$/.test(id)) notFound();

  const race = await findCircuit(id);
  if (!race) notFound();

  const profile = await getCircuitProfile(id);

  if (profile.origin === "fallback" || !profile.data) {
    return (
      <Container className="py-xxl">
        <SectionLabel>{race.locality}, {race.country}</SectionLabel>
        <h1 className="text-display-lg text-ink mt-xs">{race.circuitName}</h1>
        <StatusNotice tone="warning" className="mt-md">
          {profile.reason ?? "Circuit history is temporarily unavailable."}
        </StatusNotice>
        <Button href="/schedule" variant="outline-on-dark" className="mt-lg">
          Schedule
        </Button>
      </Container>
    );
  }

  const p = profile.data;
  const isSepang = id === "sepang";
  const map = getCircuitMap(id);

  const recent = [...p.winners].reverse().slice(0, 10);
  // A circuit can hold two Grands Prix in one season, so the year is neither a
  // unique key nor, on its own, an unambiguous label.
  const seasonCounts = new Map<string, number>();
  for (const w of p.winners) {
    seasonCounts.set(w.season, (seasonCounts.get(w.season) ?? 0) + 1);
  }
  const doubledSeasons = new Set(
    [...seasonCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s),
  );

  return (
    <>
      <section className="border-b border-hairline">
        <Container className="py-xxl">
          <div className="flex flex-wrap items-center gap-xxs">
            <BadgePill tone="primary">Round {race.round}</BadgePill>
            {isSepang && <BadgePill>This year&rsquo;s race</BadgePill>}
            {map && <BadgePill>{humanType(map.type)}</BadgePill>}
          </div>

          <h1 className="text-display-xl text-ink mt-sm max-w-[18ch] text-balance">
            {race.circuitName}
          </h1>
          <p className="text-body-md text-body mt-xs">
            {race.locality}, {race.country}
          </p>

          <div className="flex flex-wrap gap-xl mt-xl">
            {/* Length and turns are authoritative from F1DB rather than
                derived, so they lead. */}
            {map && <SpecCell value={`${map.lengthKm}`} label="Kilometres" accent />}
            {map && <SpecCell value={map.turns} label="Turns" />}
            <SpecCell value={p.racesHeld} label="Races held" />
            {p.lapRecord && (
              <SpecCell value={p.lapRecord.time} label="Lap record" />
            )}
          </div>

          <p className="text-body-sm text-muted mt-md">
            {map ? `${humanDirection(map.direction)}.` : ""}
            {p.firstSeason ? ` First held ${p.firstSeason}.` : ""}
            {p.lapRecord
              ? ` Fastest race lap by ${p.lapRecord.driverName}, ${p.lapRecord.season}.`
              : ""}
          </p>

          {/* Renders nothing when the circuit has no verified outline. */}
          <CircuitMap circuitId={id} name={race.circuitName} />
        </Container>
      </section>

      <Container className="py-xxl">
        {p.racesHeld === 0 ? (
          <StatusNotice className="mb-lg">
            This circuit has not hosted a Formula 1 race before, so there is no
            history to measure yet.
          </StatusNotice>
        ) : (
          <>
            <SectionLabel>What the results say</SectionLabel>
            <h2 className="text-display-md text-ink mt-xxs">
              Circuit character
            </h2>
            <p className="text-body-md text-body mt-xs max-w-[62ch]">
              Measured from {p.sampleSize} race finishes
              {p.ratingSeasons
                ? ` between ${p.ratingSeasons.from} and ${p.ratingSeasons.to}`
                : ""}
              , not from published ratings.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg mt-lg">
              {p.ratings.map((rating) => (
                <RatingBar key={rating.key} rating={rating} />
              ))}
            </div>

            <Hairline className="my-xxl" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-xl">
              <TopList title="Most wins" entries={p.topDrivers} />
              <TopList title="Most poles" entries={p.topPoleSitters} />
              <TopList title="Constructors" entries={p.topConstructors} />
            </div>

            {p.poleDataFrom && (
              <p className="text-caption text-muted mt-md">
                Pole records begin {p.poleDataFrom}; qualifying results are not
                held for earlier races.
              </p>
            )}

            <Hairline className="my-xxl" />

            <SectionLabel>Recent winners</SectionLabel>
            <ul className="mt-md">
              {recent.map((w) => (
                <li
                  key={`${w.season}-${w.round}`}
                  className="flex items-baseline gap-xs py-sm border-b border-hairline last:border-b-0"
                >
                  <span className="text-title-sm tnum text-muted w-12 shrink-0">
                    {w.season}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md text-ink">{w.driverName}</p>
                    <p className="text-caption text-muted truncate">
                      {w.constructorName}
                      {/* Only when the year alone is ambiguous — the Red Bull
                          Ring held both the Austrian and Styrian GPs in 2020
                          and again in 2021. */}
                      {doubledSeasons.has(w.season) ? ` · ${w.raceName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-wrap gap-xs mt-xxl">
          {isSepang && <Button href="/sepang">Sepang heritage</Button>}
          <Button href="/schedule" variant="outline-on-dark">
            Schedule
          </Button>
        </div>
      </Container>
    </>
  );
}
