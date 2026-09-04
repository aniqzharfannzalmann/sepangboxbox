import { StatusNotice } from "@/components/StatusNotice";
import { cn } from "@/lib/cn";
import type {
  ConstructorStanding,
  DriverStanding,
  StandingsSnapshot,
} from "@/lib/f1/types";

/*
 * Championship tables.
 *
 * Real <table> markup rather than a grid of divs: this is tabular data, and
 * screen readers need the row/column relationships to read a driver's points
 * without the user counting cells.
 *
 * Position and points use tabular figures so the columns do not jitter.
 */

const TH = "label-caps text-muted font-normal text-left py-xs";
const TD = "py-sm align-baseline";

function PositionCell({ position }: { position: number }) {
  return (
    <td className={cn(TD, "w-10")}>
      <span
        className={cn(
          "text-title-md tnum",
          position === 1 ? "text-primary" : "text-ink",
        )}
      >
        {position}
      </span>
    </td>
  );
}

function GapCell({ gap }: { gap: number }) {
  return (
    <td className={cn(TD, "text-right w-20 tnum text-body-md text-muted")}>
      {gap === 0 ? "—" : `−${gap}`}
    </td>
  );
}

export function DriverStandingsTable({
  snapshot,
}: {
  snapshot: StandingsSnapshot<DriverStanding> | null;
}) {
  if (!snapshot || snapshot.entries.length === 0) {
    return (
      <StatusNotice tone="warning" className="mt-md">
        Driver standings are temporarily unavailable.
      </StatusNotice>
    );
  }

  return (
    <table className="w-full mt-xs border-collapse">
      <caption className="sr-only">
        {snapshot.season} Formula 1 drivers&rsquo; championship standings after
        round {snapshot.round}
      </caption>
      <thead>
        <tr className="border-b border-hairline">
          <th scope="col" className={cn(TH, "w-10")}>
            Pos
          </th>
          <th scope="col" className={TH}>
            Driver
          </th>
          <th scope="col" className={cn(TH, "text-right w-16")}>
            Pts
          </th>
          <th scope="col" className={cn(TH, "text-right w-20")}>
            Gap
          </th>
        </tr>
      </thead>
      <tbody>
        {snapshot.entries.map((entry) => (
          <tr
            key={entry.driver.id}
            className="border-b border-hairline last:border-b-0"
          >
            <PositionCell position={entry.position} />
            <td className={TD}>
              <span className="text-body-md text-ink">
                {entry.driver.fullName}
              </span>
              <span className="block text-caption text-muted">
                {entry.constructors.map((c) => c.name).join(" / ")}
                {entry.wins > 0 &&
                  ` · ${entry.wins} ${entry.wins === 1 ? "win" : "wins"}`}
              </span>
            </td>
            <td className={cn(TD, "text-right tnum text-title-sm text-ink")}>
              {entry.points}
            </td>
            <GapCell gap={entry.pointsBehindLeader} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ConstructorStandingsTable({
  snapshot,
}: {
  snapshot: StandingsSnapshot<ConstructorStanding> | null;
}) {
  if (!snapshot || snapshot.entries.length === 0) {
    return (
      <StatusNotice tone="warning" className="mt-md">
        Constructor standings are temporarily unavailable.
      </StatusNotice>
    );
  }

  return (
    <table className="w-full mt-xs border-collapse">
      <caption className="sr-only">
        {snapshot.season} Formula 1 constructors&rsquo; championship standings
        after round {snapshot.round}
      </caption>
      <thead>
        <tr className="border-b border-hairline">
          <th scope="col" className={cn(TH, "w-10")}>
            Pos
          </th>
          <th scope="col" className={TH}>
            Constructor
          </th>
          <th scope="col" className={cn(TH, "text-right w-16")}>
            Pts
          </th>
          <th scope="col" className={cn(TH, "text-right w-20")}>
            Gap
          </th>
        </tr>
      </thead>
      <tbody>
        {snapshot.entries.map((entry) => (
          <tr
            key={entry.constructor.id}
            className="border-b border-hairline last:border-b-0"
          >
            <PositionCell position={entry.position} />
            <td className={TD}>
              <span className="text-body-md text-ink">
                {entry.constructor.name}
              </span>
              {entry.wins > 0 && (
                <span className="block text-caption text-muted">
                  {entry.wins} {entry.wins === 1 ? "win" : "wins"}
                </span>
              )}
            </td>
            <td className={cn(TD, "text-right tnum text-title-sm text-ink")}>
              {entry.points}
            </td>
            <GapCell gap={entry.pointsBehindLeader} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
