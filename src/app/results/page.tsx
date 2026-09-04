import Link from "next/link";
import { StatusNotice } from "@/components/StatusNotice";
import { BadgePill, Container, SectionLabel } from "@/components/ui/primitives";
import { formatDayMonthMyt } from "@/lib/f1/time";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";

export const metadata = {
  title: "Results",
  description:
    "Race results from the 2026 Formula 1 season, including the Bahrain Grand Prix in Malaysia at Sepang.",
};

export default async function ResultsPage() {
  const season = await getSeasonScheduleSafe();
  const nowMs = season.fetchedAtMs;

  const rounds = season.data
    .map((race) => {
      const raceSession = race.sessions.find((s) => s.kind === "race");
      return {
        race,
        startsAtIso: raceSession?.startsAtIso ?? null,
        // Only rounds whose race has actually finished can have a result.
        finished: raceSession
          ? new Date(raceSession.endsAtIso).getTime() < nowMs
          : false,
      };
    })
    .reverse();

  return (
    <Container className="py-xxl">
      <SectionLabel>2026 season</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Results</h1>

      {season.origin === "fallback" ? (
        <StatusNotice tone="warning" className="mt-md">
          {season.reason}
        </StatusNotice>
      ) : (
        <ul className="mt-lg">
          {rounds.map(({ race, startsAtIso, finished }) => {
            const isSepang = race.circuitId === "sepang";
            const row = (
              <>
                <span className="text-caption tnum text-muted w-8 shrink-0">
                  {race.round}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={
                      finished || isSepang
                        ? "text-body-md text-ink"
                        : "text-body-md text-muted"
                    }
                  >
                    {race.raceName}
                  </p>
                  <p className="text-caption text-muted truncate">
                    {race.circuitName}
                  </p>
                </div>
                <span className="text-caption tnum text-muted shrink-0">
                  {startsAtIso ? formatDayMonthMyt(startsAtIso) : "TBC"}
                </span>
                {isSepang && <BadgePill tone="primary">Sepang</BadgePill>}
              </>
            );

            return (
              <li
                key={race.round}
                className="border-b border-hairline last:border-b-0"
              >
                {finished ? (
                  <Link
                    href={`/results/${race.round}`}
                    className="flex items-baseline gap-xs py-sm hover:bg-canvas-elevated transition-colors"
                  >
                    {row}
                  </Link>
                ) : (
                  // Not run yet — a link would lead to an empty classification.
                  <div className="flex items-baseline gap-xs py-sm opacity-60">
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
