import { cn } from "@/lib/cn";
import type { SourceCapabilities } from "@/lib/f1/sources/types";
import type { TimingRow } from "@/lib/f1/types";

/*
 * The timing tower.
 *
 * Columns are driven by the source's capabilities rather than by whether a
 * given cell happens to be null. A source that cannot report tyres hides the
 * column outright; a source that can, but has not yet, shows an em dash. Those
 * are different states and the reader can tell them apart.
 */

const TH = "label-caps text-muted font-normal text-left py-xs";
const TD = "py-sm align-baseline";

function PositionCell({ row }: { row: TimingRow }) {
  const label = row.retired ? row.positionText : (row.position ?? "—");
  return (
    <td className={cn(TD, "w-10")}>
      <span
        className={cn(
          "text-title-md tnum",
          row.retired
            ? "text-muted"
            : row.position === 1
              ? "text-primary"
              : "text-ink",
        )}
      >
        {label}
      </span>
    </td>
  );
}

export function TimingTable({
  rows,
  capabilities,
  sessionLabel,
}: {
  rows: TimingRow[];
  capabilities: SourceCapabilities;
  sessionLabel: string;
}) {
  const showGapAhead = capabilities.gapToAhead;
  const showLastLap = capabilities.lastLap;
  const showTyre = capabilities.tyres;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse">
        <caption className="sr-only">{sessionLabel} timing</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className={cn(TH, "w-10")}>
              Pos
            </th>
            <th scope="col" className={TH}>
              Driver
            </th>
            {showTyre && (
              <th scope="col" className={cn(TH, "w-16")}>
                Tyre
              </th>
            )}
            <th scope="col" className={cn(TH, "text-right w-28")}>
              Gap
            </th>
            {showGapAhead && (
              <th scope="col" className={cn(TH, "text-right w-24")}>
                Interval
              </th>
            )}
            {showLastLap && (
              <th scope="col" className={cn(TH, "text-right w-24")}>
                Last lap
              </th>
            )}
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Best
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.driver.id}
              className={cn(
                "border-b border-hairline last:border-b-0",
                row.retired && "opacity-60",
              )}
            >
              <PositionCell row={row} />
              <td className={TD}>
                <span className="text-body-md text-ink">
                  {row.driver.code ?? row.driver.familyName}
                  <span className="text-muted"> · </span>
                  <span className="text-body">{row.driver.familyName}</span>
                </span>
                <span className="block text-caption text-muted">
                  {row.constructor.name}
                  {row.status && row.retired && ` · ${row.status}`}
                  {row.lapsCompleted !== null && !row.retired
                    ? ` · ${row.lapsCompleted} laps`
                    : ""}
                </span>
              </td>
              {showTyre && (
                <td className={cn(TD, "text-caption text-body")}>
                  {row.tyre ?? "—"}
                </td>
              )}
              <td className={cn(TD, "text-right tnum text-body-md text-ink")}>
                {row.gapToLeader ?? "—"}
              </td>
              {showGapAhead && (
                <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {row.gapToAhead ?? "—"}
                </td>
              )}
              {showLastLap && (
                <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {row.lastLap ?? "—"}
                </td>
              )}
              <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                {row.bestLap ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
