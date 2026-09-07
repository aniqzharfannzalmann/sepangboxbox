import { BadgePill, SectionLabel } from "@/components/ui/primitives";
import { formatTimeMyt, formatDayMonthMyt } from "@/lib/f1/time";
import { getWeekendState } from "@/lib/f1/session-windows";
import type { RaceWeekend } from "@/lib/f1/types";

export function WeekendTimeline({ weekend, nowMs }: { weekend: RaceWeekend; nowMs: number }) {
  const state = getWeekendState(weekend, nowMs);

  return (
    <section aria-labelledby="weekend-timeline">
      <SectionLabel>Weekend timeline</SectionLabel>
      <h2 id="weekend-timeline" className="text-display-md text-ink mt-xxs">
        Every session, in Malaysia Time
      </h2>
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-xs mt-md">
        {weekend.sessions.map((session) => {
          const complete = new Date(session.endsAtIso).getTime() <= nowMs;
          const live = state.current?.kind === session.kind;
          const next = state.next?.kind === session.kind;
          return (
            <li key={session.kind} className="border border-hairline p-sm flex flex-col gap-xxs">
              <div className="flex items-center justify-between gap-xs">
                <span className="text-body-md text-ink">{session.label}</span>
                {live && <BadgePill tone="warning">Live</BadgePill>}
                {!live && next && <BadgePill tone="primary">Next</BadgePill>}
                {!live && !next && complete && <BadgePill>Done</BadgePill>}
              </div>
              <time className="text-title-sm tnum text-ink" dateTime={session.startsAtIso}>
                {formatTimeMyt(session.startsAtIso)}
              </time>
              <span className="text-caption text-muted">{formatDayMonthMyt(session.startsAtIso)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
