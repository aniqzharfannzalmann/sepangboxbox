import Link from "next/link";
import { StatusNotice } from "@/components/StatusNotice";
import { BadgePill, SectionLabel } from "@/components/ui/primitives";
import { formatFullMyt } from "@/lib/f1/time";
import type { SessionRecap as SessionRecapData } from "@/lib/f1/editorial";

export function SessionRecap({ data }: { data: SessionRecapData }) {
  const statusLabel = data.status === "provisional" ? "Provisional" : data.status === "official" ? "Official" : "Awaiting classification";
  return (
    <section aria-labelledby="session-recap" className="border border-hairline p-md sm:p-lg">
      <div className="flex flex-wrap items-center gap-xxs">
        <SectionLabel>After the session</SectionLabel>
        <BadgePill tone={data.status === "provisional" ? "warning" : data.status === "official" ? "success" : "neutral"}>{statusLabel}</BadgePill>
      </div>
      <h2 id="session-recap" className="text-display-md text-ink mt-xxs">{data.sessionLabel} recap</h2>
      {data.status === "unavailable" ? (
        <StatusNotice tone="warning" className="mt-md">{data.warnings[0]}</StatusNotice>
      ) : (
        <>
          {data.winner && (
            <div className="mt-md">
              <SectionLabel>{data.sessionLabel === "Qualifying" ? "Pole sitter" : "Winner"}</SectionLabel>
              <p className="text-title-md text-primary mt-xxs">{data.winner.name}</p>
              <p className="text-caption text-muted">{data.winner.constructorName}</p>
            </div>
          )}
          {data.poleSitter && (
            <div className="mt-md">
              <SectionLabel>Pole sitter</SectionLabel>
              <p className="text-title-md text-primary mt-xxs">{data.poleSitter.name}</p>
              <p className="text-caption text-muted">{data.poleSitter.constructorName}</p>
            </div>
          )}
          {data.biggestMovers.length > 0 && (
            <div className="mt-lg">
              <SectionLabel>Biggest movers</SectionLabel>
              <ul className="mt-xxs">
                {data.biggestMovers.map((mover) => (
                  <li key={mover.driverId} className="text-body-sm text-body py-xxs border-b border-hairline last:border-b-0">
                    <span className="text-ink">{mover.name}</span> · P{mover.gridPosition} to P{mover.finishPosition} · up {mover.placesGained}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.retirements.length > 0 && (
            <p className="text-body-sm text-body mt-md"><span className="text-ink">Non-classified:</span> {data.retirements.map((driver) => driver.name).join(", ")}</p>
          )}
          {data.pointsImpact && <p className="text-body-sm text-body mt-md">{data.pointsImpact}</p>}
          {data.status === "provisional" && <StatusNotice tone="warning" className="mt-md">The classification is provisional and may change after steward decisions.</StatusNotice>}
        </>
      )}
      {data.nextSession ? (
        <div className="mt-lg">
          <SectionLabel>Next · {data.nextSession.label}</SectionLabel>
          <p className="text-body-sm text-body mt-xxs">{formatFullMyt(data.nextSession.startsAtIso)} MYT</p>
          <Link href="/schedule" className="text-caption text-primary underline underline-offset-4 mt-xs inline-block">Full schedule</Link>
        </div>
      ) : (
        <p className="text-body-sm text-muted mt-lg">This weekend is complete.</p>
      )}
    </section>
  );
}
