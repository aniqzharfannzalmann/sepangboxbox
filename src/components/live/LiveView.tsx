import type { ReactNode } from "react";
import { Countdown } from "@/components/Countdown";
import { StatusNotice } from "@/components/StatusNotice";
import { TimingTable } from "@/components/live/TimingTable";
import { UnsupportedPanel } from "@/components/live/UnsupportedPanel";
import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  Hairline,
  SectionLabel,
  SpecCell,
} from "@/components/ui/primitives";
import type { LiveTimingSource } from "@/lib/f1/sources/types";
import { MYT_LABEL, formatFullMyt } from "@/lib/f1/time";

/*
 * Live Timing (PRD 7.3).
 *
 * Every number here arrives through LiveTimingSource, so this renders
 * identically whether it is drawing post-session classifications from Jolpica
 * or second-by-second timing from OpenF1. What changes is the fidelity banner
 * and which panels render data instead of an explanation.
 *
 * The source is injected rather than resolved here so that /live/preview can
 * render this exact component against a completed round. A preview that used
 * different components would prove nothing.
 */

export async function LiveView({
  source,
  notice,
}: {
  source: LiveTimingSource;
  notice?: ReactNode;
}) {

  const [state, rows, stints, pitLog, raceControl, weather] = await Promise.all([
    source.getSessionState(),
    source.getTimingRows(),
    source.getStints(),
    source.getPitLog(),
    source.getRaceControl(),
    source.getWeather(),
  ]);

  // The source resolved "now" once when it built the session state, and
  // carries the next session on it. The page reads that rather than consulting
  // the clock again, so the header, the table and the footer cannot disagree
  // about which session is current.
  const { capabilities } = source;

  const isLive = state.status === "live";
  const sessionLabel = state.session?.label ?? "Session";

  return (
    <Container className="py-xxl">
      {notice}

      <div className="flex items-center gap-xxs">
        <SectionLabel>{state.weekend.raceName}</SectionLabel>
      </div>

      <div className="flex flex-wrap items-baseline gap-xs mt-xs">
        <h1 className="text-display-lg text-ink">
          {isLive
            ? sessionLabel
            : state.session
              ? `${sessionLabel} timing`
              : "Live timing"}
        </h1>
        {isLive && <BadgePill tone="warning">Session running</BadgePill>}
        {state.provisional && !isLive && (
          <BadgePill tone="info">Provisional</BadgePill>
        )}
      </div>

      {state.session && (
        <p className="text-body-md text-body mt-xs">
          {formatFullMyt(state.session.startsAtIso)} {MYT_LABEL}
        </p>
      )}

      {/*
        The fidelity statement. This is the one thing on the page that must
        never be soft — a reader has to know whether they are looking at live
        positions or at a classification published after the flag.
      */}
      <StatusNotice
        tone={source.fidelity === "live" ? "info" : "warning"}
        className="mt-md"
      >
        {source.fidelity === "live"
          ? "Live timing."
          : `Post-session results — ${source.description}`}
      </StatusNotice>

      {state.provisional && (
        <StatusNotice className="mt-xs">
          Positions are provisional until the stewards publish the official
          classification.
        </StatusNotice>
      )}

      {/* Nothing has started yet: the only honest thing to show is the wait. */}
      {state.status === "before" && (
        <div className="mt-xl">
          <SectionLabel>
            Sepang begins · {state.weekend.sessions[0]?.label}
          </SectionLabel>
          {state.weekend.sessions[0] && (
            <Countdown
              targetIso={state.weekend.sessions[0].startsAtIso}
              className="mt-xs"
            />
          )}
          <p className="text-body-md text-body mt-md max-w-[52ch]">
            Timing appears here once the first session runs. Until then, the
            championship standings and the full weekend schedule are ready.
          </p>
          <div className="flex flex-wrap gap-xs mt-lg">
            <Button href="/schedule">Weekend schedule</Button>
            <Button href="/standings" variant="outline-on-dark">
              Standings
            </Button>
          </div>
        </div>
      )}

      {state.status !== "before" &&
        (rows && rows.length > 0 ? (
          <div className="mt-lg">
            <TimingTable
              rows={rows}
              capabilities={capabilities}
              sessionLabel={sessionLabel}
            />
          </div>
        ) : (
          <StatusNotice tone="warning" className="mt-lg">
            {isLive
              ? `${sessionLabel} is running. This source only publishes a classification once the session ends.`
              : `No classification has been published for ${sessionLabel} yet.`}
          </StatusNotice>
        ))}

      <Hairline className="my-xxl" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {capabilities.tyres && stints ? (
          <section className="border border-hairline p-md">
            <SectionLabel>Tyre stints</SectionLabel>
            <ul className="mt-xs flex flex-col gap-xxs">
              {stints.map((stint, i) => (
                <li
                  key={`${stint.driverId}-${i}`}
                  className="text-body-sm text-body"
                >
                  {stint.driverId} · {stint.compound} · laps {stint.startLap}–
                  {stint.endLap ?? "…"}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <UnsupportedPanel
            title="Tyre stints"
            reason="Compound and stint age come from OpenF1 live timing, which needs a paid API key. Not available on the current source."
          />
        )}

        {capabilities.pitLog && pitLog ? (
          <section className="border border-hairline p-md">
            <SectionLabel>Pit stops</SectionLabel>
            <ul className="mt-xs flex flex-col gap-xxs">
              {pitLog.map((stop, i) => (
                <li
                  key={`${stop.driverId}-${i}`}
                  className="text-body-sm text-body"
                >
                  {stop.driverId} · lap {stop.lap}
                  {stop.durationSeconds !== null &&
                    ` · ${stop.durationSeconds.toFixed(1)}s`}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <UnsupportedPanel
            title="Pit stops"
            reason="Pit entry, exit and stationary time come from OpenF1 live timing. Not available on the current source."
          />
        )}

        {capabilities.raceControl && raceControl ? (
          <section className="border border-hairline p-md">
            <SectionLabel>Race control</SectionLabel>
            <ul className="mt-xs flex flex-col gap-xxs">
              {raceControl.map((msg, i) => (
                <li key={i} className="text-body-sm text-body">
                  {msg.flag ? `${msg.flag} · ` : ""}
                  {msg.message}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <UnsupportedPanel
            title="Race control"
            reason="Flags, safety cars and penalties are broadcast on the OpenF1 race control feed. Not available on the current source."
          />
        )}
      </div>

      {weather && (
        <section className="mt-xxl">
          <SectionLabel>Track conditions</SectionLabel>
          <div className="flex flex-wrap gap-lg mt-xs">
            {weather.airTempC !== null && (
              <SpecCell value={`${weather.airTempC.toFixed(0)}°`} label="Air" />
            )}
            {weather.trackTempC !== null && (
              <SpecCell
                value={`${weather.trackTempC.toFixed(0)}°`}
                label="Track"
              />
            )}
            {weather.humidityPct !== null && (
              <SpecCell
                value={`${weather.humidityPct.toFixed(0)}%`}
                label="Humidity"
              />
            )}
            {weather.rainfall !== null && (
              <SpecCell
                value={weather.rainfall ? "Wet" : "Dry"}
                label="Rainfall"
                accent={weather.rainfall}
              />
            )}
          </div>
        </section>
      )}

      {state.next && state.status !== "before" && (
        <div className="mt-xxl">
          <SectionLabel>Next · {state.next.label}</SectionLabel>
          <p className="text-body-md text-body mt-xxs">
            {formatFullMyt(state.next.startsAtIso)} {MYT_LABEL}
          </p>
        </div>
      )}
    </Container>
  );
}
