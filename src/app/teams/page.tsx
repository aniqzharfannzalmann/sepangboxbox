import Link from "next/link";
import { StatusNotice } from "@/components/StatusNotice";
import { TeamLogo } from "@/components/team/TeamLogo";
import { TeamStripe } from "@/components/team/TeamStripe";
import { Container, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { getConstructorStandingsSafe } from "@/lib/f1/standings";
import { getTeamStats, lineageAddsTo } from "@/lib/f1/teams";

export const revalidate = 300;

export const metadata = {
  title: "Teams",
  description:
    "All eleven Formula 1 constructors of the 2026 season, with their championship position and career record.",
};

export default async function TeamsPage() {
  const standings = await getConstructorStandingsSafe();
  const entries = standings.data?.entries ?? [];

  return (
    <Container className="py-xxl">
      <SectionLabel>2026 grid</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Teams</h1>
      <p className="text-body-md text-body mt-xs max-w-[56ch]">
        Eleven constructors, expanded for 2026 with Audi and Cadillac.
      </p>

      {entries.length === 0 ? (
        <StatusNotice tone="warning" className="mt-lg">
          The constructor standings are temporarily unavailable.
        </StatusNotice>
      ) : (
        <ul className="mt-lg">
          {entries.map((entry) => {
            const id = entry.constructor.id;
            const team = getTeamStats(id);
            const record = team?.combined;

            return (
              <li key={id} className="border-b border-hairline last:border-b-0">
                <Link
                  href={`/teams/${id}`}
                  className="flex items-stretch gap-xs hover:bg-canvas-elevated transition-colors"
                >
                  {/*
                   * Wider here than in the dense tables, and running the full
                   * height of the row rather than the height of the text. On
                   * this page the livery is what you scan by — the logos
                   * cannot identify a team at row size, and the four blues on
                   * this grid need more than a hairline to tell apart. The
                   * row's padding sits on the group below so the colour can
                   * reach the edges.
                   */}
                  <TeamStripe constructorId={id} width={10} />

                  <span className="flex items-stretch gap-xs flex-1 min-w-0 py-sm">
                    <span
                      className={cn(
                        "text-title-md tnum w-8 shrink-0 self-center",
                        entry.position === 1 ? "text-primary" : "text-ink",
                      )}
                    >
                      {entry.position}
                    </span>

                    <span className="flex-1 min-w-0 self-center">
                      <span className="block text-body-md text-ink">
                        {entry.constructor.name}
                      </span>
                      <span className="block text-caption text-muted">
                        {record
                          ? `${record.titles} ${record.titles === 1 ? "title" : "titles"} · ${record.wins} ${record.wins === 1 ? "win" : "wins"}${team && lineageAddsTo(team) ? " incl. predecessors" : ""}`
                          : entry.constructor.nationality}
                      </span>
                    </span>

                    <TeamLogo
                      constructorId={id}
                      name={entry.constructor.name}
                      className="self-center shrink-0"
                    />

                    <span className="text-title-sm tnum text-ink shrink-0 self-center">
                      {entry.points}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
