import { notFound } from "next/navigation";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import { Container, Hairline, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { SEPANG, getQualifyingResult, getRaceResult } from "@/lib/f1/jolpica";
import type { QualifyingResult, RaceResult } from "@/lib/f1/types";

export const revalidate = 300;

const TH = "label-caps text-muted font-normal text-left py-xs";
const TD = "py-sm align-baseline";

async function load(round: string): Promise<{
  race: RaceResult | null;
  qualifying: QualifyingResult | null;
  failed: boolean;
}> {
  // A round with a race but no published qualifying (or vice versa) is normal,
  // so the two are settled independently rather than failing together.
  const [race, qualifying] = await Promise.allSettled([
    getRaceResult(SEPANG.season, round),
    getQualifyingResult(SEPANG.season, round),
  ]);

  return {
    race: race.status === "fulfilled" ? race.value : null,
    qualifying: qualifying.status === "fulfilled" ? qualifying.value : null,
    failed: race.status === "rejected" && qualifying.status === "rejected",
  };
}

function RaceTable({ result }: { result: RaceResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="sr-only">{result.raceName} race result</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className={cn(TH, "w-10")}>
              Pos
            </th>
            <th scope="col" className={TH}>
              Driver
            </th>
            <th scope="col" className={cn(TH, "text-right w-16")}>
              Grid
            </th>
            <th scope="col" className={cn(TH, "text-right w-32")}>
              Time
            </th>
            <th scope="col" className={cn(TH, "text-right w-14")}>
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => {
            const retired = row.position === null || !/^\d+$/.test(row.positionText);
            return (
              <tr
                key={row.driver.id}
                className={cn(
                  "border-b border-hairline last:border-b-0",
                  retired && "opacity-60",
                )}
              >
                <td className={cn(TD, "w-10")}>
                  <span
                    className={cn(
                      "text-title-md tnum",
                      retired
                        ? "text-muted"
                        : row.position === 1
                          ? "text-primary"
                          : "text-ink",
                    )}
                  >
                    {retired ? row.positionText : row.position}
                  </span>
                </td>
                <td className={TD}>
                  <span className="text-body-md text-ink">
                    {row.driver.fullName}
                  </span>
                  <span className="block text-caption text-muted">
                    {row.constructor.name} · {row.status}
                  </span>
                </td>
                <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {row.gridPosition || "—"}
                </td>
                <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {row.time ?? "—"}
                </td>
                <td className={cn(TD, "text-right tnum text-body-md text-ink")}>
                  {row.points || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QualifyingTable({ result }: { result: QualifyingResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse">
        <caption className="sr-only">{result.raceName} qualifying result</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className={cn(TH, "w-10")}>
              Pos
            </th>
            <th scope="col" className={TH}>
              Driver
            </th>
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Q1
            </th>
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Q2
            </th>
            <th scope="col" className={cn(TH, "text-right w-24")}>
              Q3
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr
              key={row.driver.id}
              className="border-b border-hairline last:border-b-0"
            >
              <td className={cn(TD, "w-10")}>
                <span
                  className={cn(
                    "text-title-md tnum",
                    row.position === 1 ? "text-primary" : "text-ink",
                  )}
                >
                  {row.position}
                </span>
              </td>
              <td className={TD}>
                <span className="text-body-md text-ink">
                  {row.driver.fullName}
                </span>
                <span className="block text-caption text-muted">
                  {row.constructor.name}
                </span>
              </td>
              <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                {row.q1 ?? "—"}
              </td>
              <td className={cn(TD, "text-right tnum text-body-md text-body")}>
                {row.q2 ?? "—"}
              </td>
              <td className={cn(TD, "text-right tnum text-body-md text-ink")}>
                {row.q3 ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RoundResultPage({
  params,
}: PageProps<"/results/[round]">) {
  const { round } = await params;
  if (!/^\d{1,2}$/.test(round)) notFound();

  const { race, qualifying, failed } = await load(round);

  if (failed) {
    return (
      <Container className="py-xxl">
        <h1 className="text-display-lg text-ink">Round {round}</h1>
        <StatusNotice tone="warning" className="mt-md">
          Results are temporarily unavailable. Please try again shortly.
        </StatusNotice>
        <Button href="/results" variant="outline-on-dark" className="mt-lg">
          All results
        </Button>
      </Container>
    );
  }

  if (!race && !qualifying) notFound();

  const title = race?.raceName ?? qualifying?.raceName ?? `Round ${round}`;

  return (
    <Container className="py-xxl">
      <SectionLabel>2026 · Round {round}</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">{title}</h1>
      {race && (
        <p className="text-body-md text-body mt-xs">{race.circuitName}</p>
      )}

      {race ? (
        <section className="mt-xl">
          <h2 className="text-display-md text-ink">Race</h2>
          <div className="mt-xs">
            <RaceTable result={race} />
          </div>
        </section>
      ) : (
        <StatusNotice className="mt-xl">
          No race classification has been published for this round yet.
        </StatusNotice>
      )}

      {qualifying && (
        <>
          <Hairline className="my-xxl" />
          <section>
            <h2 className="text-display-md text-ink">Qualifying</h2>
            <div className="mt-xs">
              <QualifyingTable result={qualifying} />
            </div>
          </section>
        </>
      )}

      <Button href="/results" variant="outline-on-dark" className="mt-xxl">
        All results
      </Button>
    </Container>
  );
}
