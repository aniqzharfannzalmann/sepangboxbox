import { notFound } from "next/navigation";
import { StatusNotice } from "@/components/StatusNotice";
import { DriverPortrait } from "@/components/driver/DriverPortrait";
import { TeamLogo } from "@/components/team/TeamLogo";
import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
  SpecCell,
} from "@/components/ui/primitives";
import { teamColour } from "@/lib/f1/team-colours";
import { getConstructorStandingsSafe, getDriverStandingsSafe } from "@/lib/f1/standings";
import { getTeamStats, lineageAddsTo, type TeamRecord } from "@/lib/f1/teams";
import { FavoriteButton } from "@/components/preferences/FavoriteButton";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const team = getTeamStats(id);
  return {
    title: team?.name ?? "Team",
    description: team
      ? `${team.fullName}: championship record, career statistics and 2026 drivers.`
      : undefined,
  };
}

function RecordGrid({ record }: { record: TeamRecord }) {
  return (
    <div className="grid grid-cols-2 gap-lg sm:flex sm:flex-wrap sm:gap-xl mt-md">
      <SpecCell value={record.titles} label="Titles" accent />
      <SpecCell value={record.wins} label="Wins" />
      <SpecCell value={record.podiums} label="Podiums" />
      <SpecCell value={record.poles} label="Poles" />
      <SpecCell value={record.starts} label="Starts" />
    </div>
  );
}

export default async function TeamPage({ params }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  if (!/^[a-z0-9_]{2,40}$/.test(id)) notFound();

  const team = getTeamStats(id);
  if (!team) notFound();

  const [constructors, drivers] = await Promise.all([
    getConstructorStandingsSafe(),
    getDriverStandingsSafe(),
  ]);

  const standing =
    constructors.data?.entries.find((e) => e.constructor.id === id) ?? null;
  const lineup = (drivers.data?.entries ?? []).filter((e) =>
    e.constructors.some((c) => c.id === id),
  );
  const colour = teamColour(id);
  const showsLineage = lineageAddsTo(team);

  return (
    <>
      <section className="border-b border-hairline">
        <Container className="py-xxl">
          <div className="flex items-start gap-sm">
            {colour && (
              <span
                aria-hidden
                className="block w-1 self-stretch shrink-0"
                style={{ backgroundColor: colour.hex }}
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-xxs">
                {standing && (
                  <BadgePill tone="primary">
                    P{standing.position} · {standing.points} pts
                  </BadgePill>
                )}
                <SectionLabel>{team.fullName}</SectionLabel>
              </div>

              {/* Wraps so the logo drops below the name rather than off the
                  side of a 320px screen — a 132px mark beside a 32px heading
                  does not fit next to it there. No effect wider than that,
                  where the row has always had room. */}
              <div className="flex flex-wrap items-center gap-sm mt-xs">
                <h1 className="text-display-xl text-ink">{team.name}</h1>
                {/* 2:1, the ratio of the canvas the marks are centred on —
                    any other shape is just dead margin around them. */}
                <TeamLogo
                  constructorId={id}
                  name={team.name}
                  width={132}
                  height={66}
                />
                <FavoriteButton id={id} kind="constructor" name={team.name} />
              </div>
            </div>
          </div>

          {colour?.provisional && (
            <StatusNotice className="mt-md">
              The livery colour shown for {team.name} is provisional — this is a
              new entry for 2026 and the value has not been confirmed against
              the real car.
            </StatusNotice>
          )}
        </Container>
      </section>

      <Container className="py-xxl">
        <SectionLabel>
          {showsLineage ? "As " + team.name : "Career record"}
        </SectionLabel>
        <h2 className="text-display-md text-ink mt-xxs">
          {showsLineage ? "Under this name" : "In Formula 1"}
        </h2>
        <RecordGrid record={team.own} />

        {showsLineage && (
          <>
            <Hairline className="my-xxl" />
            <SectionLabel>Including predecessors</SectionLabel>
            <h2 className="text-display-md text-ink mt-xxs">
              The entry&rsquo;s full history
            </h2>
            <p className="text-body-md text-body mt-xs max-w-[62ch]">
              {team.name} continues an entry that has raced under other names.
              Counted end to end, that is the record — which is why the figure
              above and the one below differ.
            </p>
            <RecordGrid record={team.combined} />

            <ul className="mt-lg">
              {team.lineage.map((prev) => (
                <li
                  key={prev.id}
                  className="flex items-baseline gap-xs py-sm border-b border-hairline last:border-b-0"
                >
                  <span className="text-body-md text-ink flex-1 min-w-0 truncate">
                    {prev.name}
                  </span>
                  <span className="text-caption tnum text-muted shrink-0">
                    {prev.record.starts} starts · {prev.record.wins}{" "}
                    {prev.record.wins === 1 ? "win" : "wins"}
                    {prev.record.titles > 0
                      ? ` · ${prev.record.titles} ${prev.record.titles === 1 ? "title" : "titles"}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {lineup.length > 0 && (
          <>
            <Hairline className="my-xxl" />
            <SectionLabel>2026 drivers</SectionLabel>
            <ul className="mt-md">
              {lineup.map((entry) => (
                <li
                  key={entry.driver.id}
                  className="flex items-center gap-xs py-sm border-b border-hairline last:border-b-0"
                >
                  <span className="text-title-md tnum text-ink w-8 shrink-0">
                    {entry.position}
                  </span>
                  {/*
                    Two drivers on this page and room to give them, so this is
                    the largest the portrait is drawn anywhere. Centred rather
                    than baseline-aligned, since a 64px square has no baseline
                    worth aligning to.
                  */}
                  <DriverPortrait
                    driverId={entry.driver.id}
                    name={entry.driver.fullName}
                    constructorId={id}
                    size={64}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-body-md text-ink">
                      {entry.driver.fullName}
                    </span>
                    <span className="block text-caption text-muted">
                      {entry.wins > 0
                        ? `${entry.wins} ${entry.wins === 1 ? "win" : "wins"} this season`
                        : entry.driver.nationality}
                    </span>
                  </span>
                  <span className="text-title-sm tnum text-ink shrink-0">
                    {entry.points}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-wrap gap-xs mt-xxl">
          <Button href="/teams" variant="outline-on-dark">
            All teams
          </Button>
          <Button href="/standings" variant="outline-on-dark">
            Standings
          </Button>
        </div>
      </Container>
    </>
  );
}
