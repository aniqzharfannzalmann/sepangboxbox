import { WeatherOutlook } from "@/components/sepang/WeatherOutlook";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import { Container, SectionLabel } from "@/components/ui/primitives";
import {
  HISTORY_REVALIDATE_SECONDS,
  SEPANG,
  getRaceWeekend,
} from "@/lib/f1/jolpica";
import type { F1Session } from "@/lib/f1/types";
import { getSepangOutlook } from "@/lib/f1/weather";

export const revalidate = 3600;

export const metadata = {
  title: "Sepang weather preview",
  robots: { index: false, follow: false },
};

/*
 * Renders the weather panel against sessions moved into the forecast window.
 *
 * Open-Meteo forecasts reach about sixteen days. The Sepang race is further
 * out than that for most of this project's life, so the forecast branch of
 * getSepangOutlook would otherwise run for the first time in the week of the
 * race — which is precisely how the deleted OpenF1 adapter came to sit in the
 * repository for a month, fully written and never once executed.
 *
 * So this drives the real function, against the real API, with the session
 * times shifted forward. Same code path, same component; only the clock is
 * different.
 *
 *   /sepang/preview          three days out — every session forecast
 *   /sepang/preview?in=14    the mixed case: near sessions forecast, far ones
 *                            still historical, which is what the real page
 *                            will show for a few days in late September
 *
 * Not indexed, and not linked from the app.
 */

const DAY_MS = 86_400_000;

/**
 * The Sepang sessions, moved so the first one lands `days` from now.
 *
 * The clock is read here rather than in the component, which has to stay pure
 * — the same rule the rest of the app follows by taking `fetchedAtMs` from the
 * data layer.
 *
 * Gaps between sessions are preserved, so the shifted weekend still spans
 * three days and keeps its shape. A forecast that was right for one session
 * and wrong for another would be invisible if they all collapsed onto a single
 * timestamp.
 */
function shiftSessions(sessions: F1Session[], days: number): F1Session[] {
  if (sessions.length === 0) return sessions;

  const shift =
    Date.now() + days * DAY_MS - new Date(sessions[0].startsAtIso).getTime();
  const move = (iso: string) =>
    new Date(new Date(iso).getTime() + shift).toISOString();

  return sessions.map((session) => ({
    ...session,
    startsAtIso: move(session.startsAtIso),
    endsAtIso: move(session.endsAtIso),
  }));
}

export default async function SepangWeatherPreview({
  searchParams,
}: {
  searchParams: Promise<{ in?: string }>;
}) {
  const { in: inDays } = await searchParams;
  const days = Number.isFinite(Number(inDays)) ? Number(inDays) : 3;

  const weekend = await getRaceWeekend(
    SEPANG.season,
    SEPANG.round,
    HISTORY_REVALIDATE_SECONDS,
  ).catch(() => null);

  if (!weekend) {
    return (
      <Container className="py-xxl">
        <StatusNotice tone="warning">
          The Sepang weekend could not be loaded, so there are no session times
          to shift.
        </StatusNotice>
      </Container>
    );
  }

  const outlook = await getSepangOutlook(
    shiftSessions(weekend.sessions, days),
  );
  const forecast = outlook.sessions.filter((s) => s.origin === "forecast");

  return (
    <Container className="py-xxl">
      <SectionLabel>Not the real weekend</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Weather preview</h1>

      <StatusNotice tone="warning" className="mt-md">
        The Sepang sessions moved {days} day{days === 1 ? "" : "s"} from now, so
        the forecast branch can be exercised before the race is close enough to
        have one. {forecast.length} of {outlook.sessions.length} sessions came
        back with a forecast. The real page is at /sepang.
      </StatusNotice>

      <div className="mt-xl">
        <WeatherOutlook outlook={outlook} />
      </div>

      <div className="flex flex-wrap gap-xs mt-xl">
        <Button href="/sepang/preview?in=3" variant="outline-on-dark">
          3 days
        </Button>
        <Button href="/sepang/preview?in=14" variant="outline-on-dark">
          14 days — mixed
        </Button>
        <Button href="/sepang/preview?in=30" variant="outline-on-dark">
          30 days — all historical
        </Button>
        <Button href="/sepang" variant="outline-on-dark">
          The real page
        </Button>
      </div>
    </Container>
  );
}
