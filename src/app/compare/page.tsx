import { StatusNotice } from "@/components/StatusNotice";
import { DriverPortrait } from "@/components/driver/DriverPortrait";
import { Button } from "@/components/ui/Button";
import { Container, Hairline, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { getDriverStats } from "@/lib/f1/compare";
import { getDriverStandingsSafe } from "@/lib/f1/standings";
import type { DriverSeasonStats } from "@/lib/f1/types";

export const metadata = {
  title: "Compare drivers",
  description:
    "Compare any two Formula 1 drivers' 2026 season records side by side — points, wins, podiums and average finish.",
};

/*
 * Compare Drivers (PRD 7.5).
 *
 * A plain GET form: the selection lives in the URL, so a comparison can be
 * shared or bookmarked, the page renders on the server, and it works with
 * JavaScript disabled. No client state to keep in sync.
 */

type StatDirection = "higher" | "lower";

interface StatSpec {
  label: string;
  value: (s: DriverSeasonStats) => number | null;
  format?: (n: number) => string;
  better: StatDirection;
}

const STATS: StatSpec[] = [
  { label: "Championship points", value: (s) => s.points, better: "higher" },
  { label: "Wins", value: (s) => s.wins, better: "higher" },
  { label: "Podiums", value: (s) => s.podiums, better: "higher" },
  { label: "Points finishes", value: (s) => s.pointsFinishes, better: "higher" },
  { label: "Best finish", value: (s) => s.bestFinish, better: "lower" },
  {
    label: "Average finish",
    value: (s) => s.averageFinish,
    format: (n) => n.toFixed(1),
    better: "lower",
  },
  {
    label: "Average grid",
    value: (s) => s.averageGrid,
    format: (n) => n.toFixed(1),
    better: "lower",
  },
  { label: "Retirements", value: (s) => s.dnfs, better: "lower" },
  { label: "Races entered", value: (s) => s.racesEntered, better: "higher" },
];

function winnerOf(
  a: number | null,
  b: number | null,
  better: StatDirection,
): "a" | "b" | null {
  if (a === null || b === null || a === b) return null;
  const aWins = better === "higher" ? a > b : a < b;
  return aWins ? "a" : "b";
}

function StatValue({
  value,
  format,
  highlighted,
  align,
}: {
  value: number | null;
  format?: (n: number) => string;
  highlighted: boolean;
  align: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "py-sm tnum text-title-md",
        align === "right" ? "text-right" : "text-left",
        highlighted ? "text-primary" : "text-ink",
      )}
    >
      {value === null ? "—" : (format?.(value) ?? String(value))}
    </td>
  );
}

function ComparisonTable({
  left,
  right,
  leftConstructorId,
  rightConstructorId,
}: {
  left: DriverSeasonStats;
  right: DriverSeasonStats;
  /**
   * Team ids for the two drivers, for the portrait fallback's colour.
   *
   * Passed separately because DriverSeasonStats carries constructor *names*
   * only — it is built for display, and the caller has the standings entry
   * with the ids on it anyway.
   */
  leftConstructorId?: string;
  rightConstructorId?: string;
}) {
  return (
    /*
     * The table scrolls sideways inside this, rather than the page doing it.
     *
     * A three-column head-to-head has a real minimum width — two portraits,
     * two names and a stat label. Measured on a 320px phone it wanted 458px
     * and took the whole document sideways with it; letting the stat label
     * wrap brings that to about 411, which still does not fit a phone.
     *
     * So the table scrolls inside this container and the page does not, which
     * is the answer the results, timing and weather tables already use. The
     * cost is honest: on a narrow screen the right-hand driver's portrait sits
     * just off the edge until you swipe. Closing that last 20px would mean
     * shrinking the portraits everywhere, including on desktop, which is a
     * worse trade than a short sideways scroll.
     *
     * min-w is the floor for wide screens, deliberately below the natural
     * minimum so it never forces the table wider than its content needs.
     */
    <div className="overflow-x-auto mt-lg">
      <table className="w-full min-w-[24rem] border-collapse">
        <caption className="sr-only">
          {left.driver.fullName} compared with {right.driver.fullName}, 2026
          season
        </caption>
      <thead>
        <tr className="border-b border-hairline">
          <th scope="col" className="text-left py-xs w-2/5">
            <span className="flex items-center gap-xs">
              <DriverPortrait
                driverId={left.driver.id}
                name={left.driver.fullName}
                constructorId={leftConstructorId}
                size={56}
              />
              <span className="min-w-0">
                <span className="text-body-md text-ink block">
                  {left.driver.fullName}
                </span>
                <span className="text-caption text-muted">
                  {left.constructorNames.join(" / ")}
                </span>
              </span>
            </span>
          </th>
          <th scope="col" className="label-caps text-muted font-normal py-xs">
            <span className="sr-only">Statistic</span>
          </th>
          {/* Mirrored: this column reads right-to-left, so the portrait sits
              on the outside edge as the left one does. */}
          <th scope="col" className="text-right py-xs w-2/5">
            <span className="flex items-center justify-end gap-xs">
              <span className="min-w-0">
                <span className="text-body-md text-ink block">
                  {right.driver.fullName}
                </span>
                <span className="text-caption text-muted">
                  {right.constructorNames.join(" / ")}
                </span>
              </span>
              <DriverPortrait
                driverId={right.driver.id}
                name={right.driver.fullName}
                constructorId={rightConstructorId}
                size={56}
              />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {STATS.map((stat) => {
          const a = stat.value(left);
          const b = stat.value(right);
          const winner = winnerOf(a, b, stat.better);
          return (
            <tr
              key={stat.label}
              className="border-b border-hairline last:border-b-0"
            >
              <StatValue
                value={a}
                format={stat.format}
                highlighted={winner === "a"}
                align="left"
              />
              {/* Allowed to wrap: keeping "Championship points" on one line
                  set the table's minimum width on its own, and it reads fine
                  over two lines. */}
              <td className="py-sm text-center label-caps text-muted px-xs">
                {stat.label}
              </td>
              <StatValue
                value={b}
                format={stat.format}
                highlighted={winner === "b"}
                align="right"
              />
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: PageProps<"/compare">) {
  const params = await searchParams;
  const standings = await getDriverStandingsSafe();
  const entries = standings.data?.entries ?? [];

  if (entries.length < 2) {
    return (
      <Container className="py-xxl">
        <SectionLabel>Head to head</SectionLabel>
        <h1 className="text-display-lg text-ink mt-xs">Compare drivers</h1>
        <StatusNotice tone="warning" className="mt-md">
          The driver list is temporarily unavailable, so there is nothing to
          compare yet. Please try again shortly.
        </StatusNotice>
      </Container>
    );
  }

  const first = (key: string): string | undefined => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  // Default to the top two in the championship — a useful comparison rather
  // than an empty form.
  const leftId =
    entries.find((e) => e.driver.id === first("a"))?.driver.id ??
    entries[0].driver.id;
  const rightId =
    entries.find((e) => e.driver.id === first("b"))?.driver.id ??
    entries.find((e) => e.driver.id !== leftId)!.driver.id;

  const leftEntry = entries.find((e) => e.driver.id === leftId)!;
  const rightEntry = entries.find((e) => e.driver.id === rightId)!;

  const [left, right] = await Promise.all([
    getDriverStats(
      leftId,
      leftEntry.driver,
      leftEntry.constructors.map((c) => c.name),
      leftEntry.points,
    ),
    getDriverStats(
      rightId,
      rightEntry.driver,
      rightEntry.constructors.map((c) => c.name),
      rightEntry.points,
    ),
  ]);

  const selectClass =
    "w-full h-12 bg-canvas text-ink text-body-md border border-hairline " +
    "rounded-sm px-xs appearance-none";

  return (
    <Container className="py-xxl">
      <SectionLabel>Head to head · 2026</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Compare drivers</h1>

      <form method="get" className="mt-lg grid grid-cols-1 sm:grid-cols-3 gap-xs items-end">
        <div>
          <label htmlFor="a" className="label-caps text-muted block mb-xxs">
            Driver
          </label>
          <select id="a" name="a" defaultValue={leftId} className={selectClass}>
            {entries.map((e) => (
              <option key={e.driver.id} value={e.driver.id}>
                {e.position}. {e.driver.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="b" className="label-caps text-muted block mb-xxs">
            Compared with
          </label>
          <select id="b" name="b" defaultValue={rightId} className={selectClass}>
            {entries.map((e) => (
              <option key={e.driver.id} value={e.driver.id}>
                {e.position}. {e.driver.fullName}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full sm:w-auto">
          Compare
        </Button>
      </form>

      {leftId === rightId ? (
        <StatusNotice className="mt-lg">
          Pick two different drivers to see a comparison.
        </StatusNotice>
      ) : left && right ? (
        <>
          <ComparisonTable
            left={left}
            right={right}
            leftConstructorId={leftEntry.constructors[0]?.id}
            rightConstructorId={rightEntry.constructors[0]?.id}
          />
          <Hairline className="my-lg" />
          <p className="text-body-sm text-muted max-w-[64ch]">
            Championship points are the official totals and include sprint
            points. Every other figure covers Grands Prix only. Average finish
            and average grid count classified finishes — retirements are
            excluded rather than counted as last place.
          </p>
        </>
      ) : (
        <StatusNotice tone="warning" className="mt-lg">
          Season results for one of these drivers could not be loaded. Please
          try again shortly.
        </StatusNotice>
      )}
    </Container>
  );
}
