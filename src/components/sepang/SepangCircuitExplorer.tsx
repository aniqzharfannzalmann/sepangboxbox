"use client";

import { useEffect, useRef, useState } from "react";
import { getCircuitMap } from "@/components/circuit/CircuitMap";
import { TeamRadioCard } from "@/components/sepang/TeamRadioCard";
import { BadgePill, SectionLabel } from "@/components/ui/primitives";
import { f1Audio } from "@/lib/audio";
import { cn } from "@/lib/cn";
import {
  HISTORIC_RADIOS,
  SEPANG_TURNS,
  type TurnData,
} from "@/lib/f1/sepang-turns";

interface SepangCircuitExplorerProps {
  className?: string;
}

export function SepangCircuitExplorer({
  className,
}: SepangCircuitExplorerProps) {
  const [selectedTurnId, setSelectedTurnId] = useState<string>("t1_2");
  const [activeTab, setActiveTab] = useState<"corners" | "radios">("corners");

  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const mapData = getCircuitMap("sepang");
  const selectedTurn =
    SEPANG_TURNS.find((t) => t.id === selectedTurnId) ?? SEPANG_TURNS[0];

  useEffect(() => {
    const activeBtn = chipRefs.current[selectedTurnId];
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedTurnId]);

  const handleTurnSelect = (turn: TurnData) => {
    setSelectedTurnId(turn.id);
    // Play light UI audio cue
    f1Audio.playRadioIntroBeep();
  };

  return (
    <div className={cn("space-y-xl", className)}>
      {/* Mode Switcher: Corners vs Radio Soundboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-hairline pb-sm">
        <div>
          <SectionLabel>Circuit Explorer & Nostalgia Archive</SectionLabel>
          <h2 className="text-display-sm text-ink mt-xxs">
            Sepang International Circuit
          </h2>
        </div>

        <div className="flex w-full sm:w-auto rounded-full bg-surface border border-hairline p-1">
          <button
            type="button"
            onClick={() => setActiveTab("corners")}
            className={cn(
              "flex-1 sm:flex-none text-center px-md py-xs rounded-full text-caption font-mono uppercase tracking-wider transition-all",
              activeTab === "corners"
                ? "bg-primary text-white font-semibold shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            Corners & Moments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("radios")}
            className={cn(
              "flex-1 sm:flex-none text-center px-md py-xs rounded-full text-caption font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-xs",
              activeTab === "radios"
                ? "bg-primary text-white font-semibold shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Radio Soundboard
          </button>
        </div>
      </div>

      {activeTab === "corners" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-start">
          {/* Left Column: Interactive Track SVG Map (7 cols) */}
          <div className="lg:col-span-7 bg-surface/40 rounded-xl border border-hairline p-sm sm:p-lg relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between mb-sm">
              <span className="text-caption text-muted font-mono uppercase tracking-widest text-[11px] sm:text-caption">
                Tap any corner on the track
              </span>
              <span className="text-caption text-primary font-mono font-semibold text-[11px] sm:text-caption">
                15 Turns · 5.543 km
              </span>
            </div>

            {/* SVG Track with Hotspots */}
            <div className="relative w-full aspect-[461/408] max-h-[460px] mx-auto select-none">
              {mapData && (
                <svg
                  viewBox={mapData.viewBox}
                  className="w-full h-full"
                  role="img"
                  aria-label="Interactive map of Sepang International Circuit"
                >
                  {/* Track Outlines */}
                  {mapData.paths.map((path, i) => {
                    const isTrack =
                      !path.filled &&
                      path.strokeWidth ===
                        Math.max(...mapData.paths.map((p) => p.strokeWidth));
                    const colour = isTrack
                      ? "var(--color-primary)"
                      : "var(--color-ink)";
                    return (
                      <path
                        key={i}
                        d={path.d}
                        transform={path.transform}
                        fill={path.filled ? colour : "none"}
                        stroke={path.filled ? "none" : colour}
                        strokeWidth={path.strokeWidth * 0.7}
                        strokeLinecap={
                          path.linecap as "round" | "square" | "butt"
                        }
                        strokeLinejoin={
                          path.linejoin as "round" | "bevel" | "miter"
                        }
                      />
                    );
                  })}

                  {/* Turn Markers / Hotspots */}
                  {SEPANG_TURNS.map((turn) => {
                    const isSelected = turn.id === selectedTurn.id;
                    return (
                      <g
                        key={turn.id}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSelected}
                        aria-label={`Select ${turn.name}`}
                        onClick={() => handleTurnSelect(turn)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleTurnSelect(turn);
                          }
                        }}
                        className="cursor-pointer group outline-none"
                      >
                        {/* Outer Pulsing Halo when active - pure SVG radar pulse */}
                        {isSelected && (
                          <>
                            <circle
                              cx={turn.x}
                              cy={turn.y}
                              r="9"
                              fill="rgba(218, 41, 28, 0.15)"
                              stroke="var(--color-primary)"
                              className="animate-svg-pulse"
                            />
                            <circle
                              cx={turn.x}
                              cy={turn.y}
                              r="15"
                              fill="none"
                              stroke="var(--color-primary)"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                              opacity="0.8"
                            />
                          </>
                        )}

                        {/* Turn Marker Circle */}
                        <circle
                          cx={turn.x}
                          cy={turn.y}
                          r={isSelected ? 11 : 8.5}
                          className={cn(
                            "transition-colors duration-150",
                            isSelected
                              ? "fill-primary stroke-white stroke-[2]"
                              : "fill-canvas-elevated stroke-muted hover:stroke-primary stroke-[1.5]",
                          )}
                        />

                        {/* Turn Short Label inside marker */}
                        <text
                          x={turn.x}
                          y={turn.y + 2.5}
                          textAnchor="middle"
                          className={cn(
                            "text-[7px] font-mono font-bold select-none pointer-events-none transition-colors",
                            isSelected ? "fill-white" : "fill-ink",
                          )}
                        >
                          {turn.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Turn Quick Chips (Horizontal Scroll) */}
            <div className="mt-md pt-sm border-t border-hairline">
              <div className="flex gap-xxs overflow-x-auto pb-xs scrollbar-none">
                {SEPANG_TURNS.map((turn) => {
                  const isSelected = turn.id === selectedTurn.id;
                  return (
                    <button
                      key={turn.id}
                      ref={(el) => {
                        chipRefs.current[turn.id] = el;
                      }}
                      type="button"
                      onClick={() => handleTurnSelect(turn)}
                      className={cn(
                        "px-sm py-xs rounded-full text-caption font-mono shrink-0 transition-all active:scale-95",
                        isSelected
                          ? "bg-primary text-white font-bold shadow"
                          : "bg-surface border border-hairline text-muted hover:text-ink hover:border-ink/40",
                      )}
                    >
                      {turn.number}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Turn Details & Historic Moments (5 cols) */}
          <div className="lg:col-span-5 space-y-md">
            <div className="rounded-xl border border-hairline bg-surface/60 backdrop-blur-sm p-md sm:p-lg shadow-sm">
              <div className="flex items-center gap-xs">
                <BadgePill tone="primary">{selectedTurn.number}</BadgePill>
                {selectedTurn.drsZone && (
                  <BadgePill tone="neutral">DRS Zone {selectedTurn.drsZone}</BadgePill>
                )}
                <span className="text-caption text-muted font-mono uppercase ml-auto">
                  {selectedTurn.type}
                </span>
              </div>

              <h3 className="text-title-lg text-ink font-semibold mt-xs">
                {selectedTurn.name}
              </h3>

              <p className="text-body-sm text-body mt-xs leading-relaxed">
                {selectedTurn.characteristics}
              </p>

              {/* Technical Telemetry Grid - balanced 3-column row on mobile and desktop */}
              <div className="grid grid-cols-3 gap-xxs sm:gap-xs mt-md pt-md border-t border-hairline">
                <div className="p-xs bg-black/40 rounded border border-hairline/60 text-center sm:text-left">
                  <span className="text-[11px] sm:text-caption text-muted block">Gear</span>
                  <span className="text-body-md sm:text-title-sm font-mono font-bold text-ink">
                    {selectedTurn.gear.replace(/Gear\s*/i, "")}
                  </span>
                </div>
                <div className="p-xs bg-black/40 rounded border border-hairline/60 text-center sm:text-left">
                  <span className="text-[11px] sm:text-caption text-muted block">Apex Speed</span>
                  <span className="text-body-md sm:text-title-sm font-mono font-bold text-ink truncate block">
                    {selectedTurn.speedKmh}
                  </span>
                </div>
                <div className="p-xs bg-black/40 rounded border border-hairline/60 text-center sm:text-left">
                  <span className="text-[11px] sm:text-caption text-muted block truncate">Overtaking</span>
                  <div className="flex justify-center sm:justify-start gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={cn(
                          "w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full",
                          star <= selectedTurn.overtakingRating
                            ? "bg-primary"
                            : "bg-muted/40",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Historic Moments at This Corner */}
            <div className="space-y-sm">
              <SectionLabel>Historic Moments at this Corner</SectionLabel>
              {selectedTurn.moments.map((moment, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-hairline bg-surface/40 p-sm sm:p-md space-y-xs transition-all hover:border-ink/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-xxs sm:gap-xs">
                    <span className="text-title-sm font-mono font-bold text-primary">
                      {moment.year}
                    </span>
                    <span className="text-caption text-muted sm:text-right leading-tight">
                      {moment.driver} ({moment.team})
                    </span>
                  </div>

                  <h4 className="text-body-md font-semibold text-ink">
                    {moment.title}
                  </h4>

                  <p className="text-body-sm text-muted leading-relaxed">
                    {moment.description}
                  </p>

                  {/* Radio Quote Snippet */}
                  {moment.radioQuote && (
                    <div className="mt-xs pt-xs border-t border-hairline/60 flex flex-col sm:flex-row sm:items-center justify-between gap-xs bg-black/30 p-xs sm:p-sm rounded">
                      <p className="text-caption italic font-mono text-ink/90 flex-1">
                        &ldquo;{moment.radioQuote.text}&rdquo; —{" "}
                        <span className="text-primary not-italic">
                          {moment.radioQuote.speaker}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          f1Audio.speakRadioQuote(
                            `${moment.radioQuote?.speaker} said: ${moment.radioQuote?.text}`,
                          );
                        }}
                        className="w-full sm:w-auto text-center px-sm py-xs rounded text-[11px] font-mono uppercase bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-white transition-all shrink-0"
                      >
                        Play Audio
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Team Radio Soundboard Tab */
        <div className="space-y-lg">
          <p className="text-body-md text-muted max-w-[64ch]">
            Listen back to the most dramatic and iconic team radio exchanges
            across 19 editions of the Malaysian Grand Prix at Sepang — from Red
            Bull&rsquo;s Multi 21 team orders feud to Lewis Hamilton&rsquo;s
            championship-altering engine failure.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {HISTORIC_RADIOS.map((radio) => (
              <TeamRadioCard key={radio.id} radio={radio} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
