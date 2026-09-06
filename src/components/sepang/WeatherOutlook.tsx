import { StatusNotice } from "@/components/StatusNotice";
import { SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { MYT_LABEL, formatFullMyt } from "@/lib/f1/time";
import type { SepangOutlook } from "@/lib/f1/weather";

const TH = "label-caps text-muted font-normal text-left py-xs";
const TD = "py-sm align-baseline";

/**
 * Conditions for the Sepang weekend, session by session.
 *
 * Two different claims share this table and the reader has to be able to tell
 * them apart, so each row says which it is. A forecast is about 4 October
 * 2026. The historical column is about early October in fifteen other years,
 * which is useful — it is why anyone expects rain here at all — but it is not
 * a prediction, and presenting the two in the same voice would be a lie told
 * by layout.
 *
 * Real tables, because this is tabular data.
 */
export function WeatherOutlook({ outlook }: { outlook: SepangOutlook }) {
  if (outlook.sessions.length === 0) return null;

  return (
    <section>
      <SectionLabel>Conditions</SectionLabel>
      <h2 className="text-display-md text-ink mt-xxs">
        {outlook.hasForecast ? "The forecast" : "What October does here"}
      </h2>

      <p className="text-body-md text-body mt-xs max-w-[60ch]">
        Rain falls in{" "}
        <span className="text-ink">
          {outlook.wetHourPct}% of early-October afternoons
        </span>{" "}
        at Sepang, measured across {outlook.hoursSampled} hours between{" "}
        {outlook.fromYear} and {outlook.toYear}. Three of the five sessions run
        in that window, and the race starts at three in the afternoon.
      </p>

      {!outlook.hasForecast && (
        <StatusNotice className="mt-md">
          No forecast reaches this far out — weather models run about sixteen
          days ahead. These are the recorded conditions for these dates in past
          years, not a prediction. The forecast replaces them automatically as
          the weekend comes into range.
        </StatusNotice>
      )}

      <div className="overflow-x-auto mt-md">
        <table className="table-cards w-full min-w-0 sm:min-w-[32rem] border-collapse">
          <caption className="sr-only">
            Conditions for each session of the 2026 Sepang race weekend
          </caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className={TH}>
                Session
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Air
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Humidity
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Rain
              </th>
            </tr>
          </thead>
          <tbody>
            {outlook.sessions.map((session) => (
              <tr
                key={session.kind}
                className="border-b border-hairline last:border-b-0"
              >
                <td className={TD}>
                  <span className="block text-body-md text-ink">
                    {session.label}
                  </span>
                  <span className="block text-caption text-muted">
                    {formatFullMyt(session.startsAtIso)} {MYT_LABEL}
                  </span>
                </td>
                <td data-label="Air" className={cn(TD, "text-right tnum text-body-md text-ink")}>
                  {session.airTempC === null
                    ? "—"
                    : `${session.airTempC.toFixed(0)}°`}
                </td>
                <td data-label="Humidity" className={cn(TD, "text-right tnum text-body-md text-body")}>
                  {session.humidityPct === null
                    ? "—"
                    : `${session.humidityPct.toFixed(0)}%`}
                </td>
                <td data-label="Rain" className={cn(TD, "text-right")}>
                  {session.origin === "forecast" &&
                  session.rainChancePct !== null ? (
                    <>
                      <span className="block tnum text-body-md text-ink">
                        {session.rainChancePct}%
                      </span>
                      <span className="block text-caption text-muted">
                        forecast
                      </span>
                    </>
                  ) : session.wetYears !== null &&
                    session.yearsSampled !== null ? (
                    <>
                      <span className="block tnum text-body-md text-ink">
                        {session.wetYears}/{session.yearsSampled}
                      </span>
                      {/*
                        The window matters and is not the same for every row:
                        the race covers 150 minutes and a practice session 60,
                        so the race has three times the chance to catch a
                        shower whatever the sky is doing. Without this the
                        numbers look comparable and are not.
                      */}
                      <span className="block text-caption text-muted">
                        years wet, over {session.minutes} min
                      </span>
                    </>
                  ) : (
                    <span className="text-body-md text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
