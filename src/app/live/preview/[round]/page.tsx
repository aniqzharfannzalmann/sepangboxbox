import { notFound } from "next/navigation";
import { LiveView } from "@/components/live/LiveView";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import { SEPANG, getRaceWeekend } from "@/lib/f1/jolpica";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";
import {
  JolpicaTimingSource,
  type SourcePin,
} from "@/lib/f1/sources/jolpica.source";
import type { SessionKind } from "@/lib/f1/types";

export const revalidate = 300;

export const metadata = {
  title: "Live timing preview",
  robots: { index: false, follow: false },
};

/*
 * Renders the real Live Timing view against a round that has already run.
 *
 * Sepang is round 16 and has not happened, so in normal operation the timing
 * table, the provisional badge and the retired-driver styling never render —
 * they would be exercised for the first time on race day. This route drives
 * the same component with the same source class against real classifications.
 *
 *   /live/preview/12                        the race, as it stands now
 *   /live/preview/12?session=quali          clock just after qualifying, which
 *                                           shows the provisional state
 *   /live/preview/12?session=quali&at=during clock mid-session, which is the
 *                                           only way to render the live branch
 *
 * Not indexed, and not linked from the app.
 */

/*
 * Practice is included on purpose. Jolpica publishes nothing for it, so
 * `?session=fp1&at=during` is the only way to render the combination a fan
 * will actually meet on the Friday at Sepang: a session running, with no rows
 * to show.
 */
const PREVIEWABLE: SessionKind[] = [
  "fp1",
  "fp2",
  "fp3",
  "race",
  "sprint",
  "quali",
  "sprint-quali",
];

export default async function LivePreviewPage({
  params,
  searchParams,
}: PageProps<"/live/preview/[round]">) {
  const { round } = await params;
  const query = await searchParams;

  if (!/^\d{1,2}$/.test(round)) notFound();

  const requested = Array.isArray(query.session)
    ? query.session[0]
    : query.session;
  const at = Array.isArray(query.at) ? query.at[0] : query.at;

  const season = await getSeasonScheduleSafe();
  if (!season.data.some((race) => race.round === round)) notFound();

  // Resolve the weekend up front, whether or not a session was named.
  let weekend;
  try {
    weekend = await getRaceWeekend(SEPANG.season, round);
  } catch {
    notFound();
  }

  const pin: SourcePin = { season: SEPANG.season, round };

  if (requested) {
    if (!PREVIEWABLE.includes(requested as SessionKind)) notFound();
    const session = weekend.sessions.find((s) => s.kind === requested);
    if (!session) notFound();

    const startsAt = new Date(session.startsAtIso).getTime();
    const endsAt = new Date(session.endsAtIso).getTime();

    pin.nowMs =
      at === "during"
        ? // Halfway through. The only way to reach status "live", where the
          // page shows the running badge and says this source publishes
          // nothing until the flag.
          startsAt + (endsAt - startsAt) / 2
        : // One minute after the flag: late enough for a classification to
          // exist, early enough to still be provisional.
          endsAt + 60_000;
  }

  const notice = (
    <StatusNotice tone="warning" className="mb-lg">
      Preview — round {round}
      {requested
        ? `, clock pinned ${at === "during" ? "mid-" : "just after "}${requested}`
        : ""}
      . This is the
      live timing view driven by a completed round, so the table can be checked
      before Sepang runs. Not live data.
    </StatusNotice>
  );

  return (
    <>
      <LiveView source={new JolpicaTimingSource(pin)} notice={notice} />
      <div className="mx-auto w-full max-w-[1280px] px-xs md:px-md pb-xxl">
        <Button href="/live" variant="outline-on-dark">
          Back to live
        </Button>
      </div>
    </>
  );
}
