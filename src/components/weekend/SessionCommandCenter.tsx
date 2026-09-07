import { Countdown } from "@/components/Countdown";
import { StatusNotice } from "@/components/StatusNotice";
import { Button } from "@/components/ui/Button";
import { BadgePill, SectionLabel } from "@/components/ui/primitives";
import { formatFullMyt, MYT_LABEL } from "@/lib/f1/time";
import { getWeekendState } from "@/lib/f1/session-windows";
import type { RaceWeekend } from "@/lib/f1/types";

function stateCopy(state: ReturnType<typeof getWeekendState>) {
  if (state.status === "live" && state.current) {
    return `${state.current.label} is scheduled to be in progress now.`;
  }
  if (state.status === "between") {
    return state.next
      ? `The next session is ${state.next.label}.`
      : "The weekend is between sessions.";
  }
  if (state.status === "finished") return "This weekend is complete.";
  return state.next ? `Next up: ${state.next.label}.` : "The weekend schedule is ready.";
}

export function SessionCommandCenter({
  weekend,
  nowMs,
  compact = false,
}: {
  weekend: RaceWeekend;
  nowMs: number;
  compact?: boolean;
}) {
  const state = getWeekendState(weekend, nowMs);
  const target = state.status === "live" ? state.current?.endsAtIso : state.next?.startsAtIso;
  const targetLabel = state.status === "live" ? "Session window" : "Next session";

  return (
    <section className="border border-hairline bg-canvas-elevated/30 p-md sm:p-lg" aria-labelledby="session-command-center">
      <div className="flex flex-wrap items-center gap-xxs">
        <SectionLabel>{weekend.raceName}</SectionLabel>
        {state.status === "live" && <BadgePill tone="warning">Under way</BadgePill>}
        {state.status === "finished" && <BadgePill>Complete</BadgePill>}
      </div>
      <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between mt-xs">
        <div>
          <h2 id="session-command-center" className="text-display-md text-ink">
            {state.current?.label ?? state.next?.label ?? "Race weekend"}
          </h2>
          <p className="text-body-md text-body mt-xxs">{stateCopy(state)}</p>
          <p className="text-caption text-muted mt-xs">
            All times {MYT_LABEL}. {state.current
              ? formatFullMyt(state.current.startsAtIso)
              : state.next
                ? formatFullMyt(state.next.startsAtIso)
                : "Final classification available in results."}
          </p>
        </div>
        {target && state.status !== "finished" && (
          <div className="shrink-0">
            <SectionLabel>{targetLabel}</SectionLabel>
            <Countdown targetIso={target} className="mt-xxs" />
          </div>
        )}
      </div>

      {state.status === "live" && (
        <StatusNotice tone="warning" className="mt-md">
          This project uses official post-session classifications, not second-by-second live timing. Check back after the flag for the published result.
        </StatusNotice>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-xs mt-lg">
          <Button href="/live">
            Session view
          </Button>
          <Button href="/schedule" variant="outline-on-dark">
            Full weekend
          </Button>
          <Button href={`/circuits/${weekend.circuitId}`} variant="outline-on-dark">
            Circuit guide
          </Button>
        </div>
      )}
    </section>
  );
}
