import { notFound } from "next/navigation";
import { LiveView } from "@/components/live/LiveView";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import { SEPANG, getRaceWeekend } from "@/lib/f1/jolpica";
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
 *   /live/preview/12                 the race, as it stands now
 *   /live/preview/12?session=quali   the clock pinned just after qualifying,
 *                                    which also shows the provisional state
 *
 * Not indexed, and not linked from the app.
 */

const PREVIEWABLE: SessionKind[] = ["race", "sprint", "quali", "sprint-quali"];

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

  // Resolve the weekend up front, whether or not a session was named. Without
  // this an out-of-range round reaches the source and throws a 500 instead of
  // returning a 404.
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
    // Pin the clock one minute after that session ended: late enough for a
    // classification to exist, early enough to still be inside the
    // provisional window.
    pin.nowMs = new Date(session.endsAtIso).getTime() + 60_000;
  }

  const notice = (
    <StatusNotice tone="warning" className="mb-lg">
      Preview — round {round}
      {requested ? `, clock pinned just after ${requested}` : ""}. This is the
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
