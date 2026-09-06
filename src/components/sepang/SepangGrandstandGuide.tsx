"use client";

import { useId, useMemo, useState } from "react";
import {
  BadgePercent,
  Camera,
  Compass,
  Flag,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tv,
  Zap,
} from "lucide-react";
import { getCircuitMap } from "@/components/circuit/CircuitMap";
import { BadgePill, Hairline, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import {
  FILTER_PRESETS,
  GrandstandData,
  GrandstandTag,
  SEPANG_GRANDSTANDS,
} from "@/lib/f1/grandstands";

function ScoreMeter({
  icon: Icon,
  label,
  score,
  max = 10,
  detail,
  accent = "bg-primary",
}: {
  icon: React.ElementType;
  label: string;
  score: number;
  max?: number;
  detail?: string;
  accent?: string;
}) {
  const percent = Math.round((score / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-caption">
        <span className="text-body font-medium flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted shrink-0" />
          <span>{label}</span>
        </span>
        <span className="font-mono font-bold text-ink">
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full bg-canvas-elevated rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", accent)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {detail && (
        <span className="text-[10px] text-muted font-mono block">
          {detail}
        </span>
      )}
    </div>
  );
}

export function SepangGrandstandGuide() {
  const mapGradientId = useId();
  const [selectedTag, setSelectedTag] = useState<GrandstandTag | "all">("all");
  const [selectedGrandstandId, setSelectedGrandstandId] = useState<string>("k1");

  const mapData = getCircuitMap("sepang");

  const activeGrandstand: GrandstandData = useMemo(() => {
    return (
      SEPANG_GRANDSTANDS.find((g) => g.id === selectedGrandstandId) ??
      SEPANG_GRANDSTANDS[0]
    );
  }, [selectedGrandstandId]);

  const handleFilterClick = (tag: GrandstandTag | "all") => {
    setSelectedTag(tag);
    if (tag !== "all") {
      const match = SEPANG_GRANDSTANDS.find((g) => g.tags.includes(tag));
      if (match) {
        setSelectedGrandstandId(match.id);
      }
    }
  };

  const getFilterIcon = (id: string) => {
    switch (id) {
      case "overtaking":
        return Zap;
      case "shelter":
        return ShieldCheck;
      case "budget":
        return BadgePercent;
      case "pit-stops":
        return Flag;
      default:
        return SlidersHorizontal;
    }
  };

  return (
    <div id="grandstand-guide" className="space-y-lg">
      {/* Header */}
      <div className="border-b border-hairline pb-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
          <div>
            <SectionLabel>Sepang 2026 Spectator Guide</SectionLabel>
            <h2 className="text-display-sm text-ink mt-xxs">
              Grandstand Vantage Points & Sun Angle
            </h2>
          </div>
          <div className="flex items-center gap-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="text-caption font-mono uppercase tracking-wider text-muted">
              5 Spectator Zones
            </span>
          </div>
        </div>
        <p className="text-body-sm text-body mt-xs max-w-3xl leading-relaxed">
          Planning to attend Formula 1 at Sepang? Select grandstands directly on the circuit map
          to inspect viewing sightlines, roof shelter against 4:00 PM tropical rain, and local seating advice.
        </p>
      </div>

      {/* Clean Filter Bar */}
      <div className="flex items-center gap-xs overflow-x-auto pb-1 scrollbar-none">
        {FILTER_PRESETS.map((preset) => {
          const isSelected = selectedTag === preset.id;
          const Icon = getFilterIcon(preset.id);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleFilterClick(preset.id as GrandstandTag | "all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-caption font-mono uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 border",
                isSelected
                  ? "border-primary bg-primary text-white font-bold shadow-sm"
                  : "border-hairline bg-surface hover:border-ink/40 text-muted hover:text-ink"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Interactive Map (Left) + Refined Scorecard Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Left Column: Interactive Circuit Map (7 Cols) */}
        <div className="lg:col-span-7 bg-surface/30 rounded-xl border border-hairline p-sm sm:p-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-xs px-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Click any grandstand on the track
            </span>
            <span className="text-[11px] font-mono text-muted font-medium">
              Sepang · 5.543 km
            </span>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full aspect-[461/408] max-h-[420px] mx-auto select-none bg-canvas rounded-lg p-2 border border-hairline/60">
            {mapData && (
              <svg
                viewBox={mapData.viewBox}
                className="w-full h-full"
                role="img"
                aria-label="Interactive spectator grandstand map of Sepang International Circuit"
              >
                <defs>
                  {/* Subtle sightline field of view gradient */}
                  <radialGradient
                    id={`sightlineGrad-${mapGradientId}`}
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="50%"
                    fy="50%"
                  >
                    <stop offset="0%" stopColor="#da291c" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#da291c" stopOpacity="0.0" />
                  </radialGradient>
                </defs>

                {/* Circuit Track Path */}
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

                {/* Start / Finish straight label */}
                <text
                  x="150"
                  y="315"
                  fill="#555555"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  transform="rotate(-48 150 315)"
                  className="select-none pointer-events-none"
                >
                  START / FINISH
                </text>

                {/* Back straight label */}
                <text
                  x="200"
                  y="245"
                  fill="#555555"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  transform="rotate(-48 200 245)"
                  className="select-none pointer-events-none"
                >
                  BACK STRAIGHT
                </text>

                {/* Active Grandstand Sightline Vision Cone */}
                {activeGrandstand.mapCoords.conePoints && (
                  <polygon
                    points={activeGrandstand.mapCoords.conePoints}
                    fill={`url(#sightlineGrad-${mapGradientId})`}
                    stroke="#da291c"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.85"
                  />
                )}

                {/* Grandstand Architectural Pins */}
                {SEPANG_GRANDSTANDS.map((g) => {
                  const isSelected = g.id === activeGrandstand.id;
                  const coords = g.mapCoords;

                  return (
                    <g
                      key={g.id}
                      onClick={() => setSelectedGrandstandId(g.id)}
                      className="cursor-pointer group outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${g.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedGrandstandId(g.id);
                        }
                      }}
                    >
                      {/* Subtle Radar Pulse on active pin */}
                      {isSelected && (
                        <circle
                          cx={coords.x}
                          cy={coords.y}
                          r="14"
                          fill="none"
                          stroke="#da291c"
                          strokeWidth="1.5"
                          className="animate-svg-pulse"
                        />
                      )}

                      {/* Clean Pin Box */}
                      <rect
                        x={coords.x - 17}
                        y={coords.y - 9}
                        width="34"
                        height="18"
                        rx="3"
                        fill={isSelected ? "#da291c" : "#1f1f1f"}
                        stroke={isSelected ? "#ffffff" : "#444444"}
                        strokeWidth={isSelected ? "1.5" : "1"}
                        className="transition-colors duration-150 group-hover:stroke-white group-hover:fill-primary"
                      />

                      {/* Pin Label */}
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {g.id === "main-north"
                          ? "MAIN N"
                          : g.id === "main-south"
                            ? "MAIN S"
                            : g.id === "c2-hillstand"
                              ? "C2 HILL"
                              : g.id === "f-grandstand"
                                ? "F STAND"
                                : "K1"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Grandstand Quick Selector Chips */}
          <div className="grid grid-cols-5 gap-1 pt-1">
            {SEPANG_GRANDSTANDS.map((g) => {
              const isSelected = g.id === activeGrandstand.id;
              const isMatch =
                selectedTag === "all" || g.tags.includes(selectedTag);

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGrandstandId(g.id)}
                  className={cn(
                    "py-1.5 px-1 border rounded text-center transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/15 text-ink font-bold shadow-sm"
                      : isMatch
                        ? "border-hairline bg-canvas hover:border-ink/40 text-muted hover:text-ink"
                        : "border-hairline/40 bg-canvas/40 opacity-40"
                  )}
                >
                  <span className="text-[10px] font-mono block truncate">
                    {g.id === "main-north"
                      ? "Main N"
                      : g.id === "main-south"
                        ? "Main S"
                        : g.id === "c2-hillstand"
                          ? "C2 Hill"
                          : g.id === "f-grandstand"
                            ? "F Stand"
                            : "K1"}
                  </span>
                  <span className="text-[9px] font-mono text-muted block truncate">
                    {g.approxPriceRm.split("–")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Clean Premium Details Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-surface/30 rounded-xl border border-hairline p-md sm:p-lg space-y-md">
          {/* Header Row */}
          <div className="space-y-1 border-b border-hairline pb-sm">
            <div className="flex items-center justify-between gap-xs">
              <BadgePill tone={activeGrandstand.badgeTone}>
                {activeGrandstand.badge}
              </BadgePill>
              <span className="text-[11px] font-mono text-muted font-medium">
                {activeGrandstand.roofStatus}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-sm pt-1">
              <h3 className="text-title-lg text-ink font-bold">
                {activeGrandstand.name}
              </h3>
              <span className="text-title-sm font-mono font-bold text-ink shrink-0">
                {activeGrandstand.approxPriceRm}
              </span>
            </div>

            <p className="text-caption text-muted flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-muted shrink-0" />
              <span>{activeGrandstand.facing}</span>
            </p>
          </div>

          {/* Key Vantage View */}
          <div className="space-y-1">
            <span className="text-caption font-mono uppercase tracking-wider text-muted block">
              Vantage Point
            </span>
            <p className="text-body-sm text-ink leading-relaxed">
              {activeGrandstand.keyView}
            </p>
          </div>

          {/* Scorecard */}
          <div className="bg-canvas/80 border border-hairline/80 rounded-lg p-sm space-y-2.5">
            <span className="text-[10px] uppercase font-mono text-muted tracking-widest block border-b border-hairline pb-1">
              Performance Scorecard
            </span>

            <ScoreMeter
              icon={Zap}
              label="Overtaking Action"
              score={activeGrandstand.ratings.overtaking}
              accent="bg-primary"
              detail="Wheel-to-wheel braking zone action"
            />

            <ScoreMeter
              icon={ShieldCheck}
              label="Weather Shelter"
              score={activeGrandstand.ratings.shelter}
              accent={
                activeGrandstand.ratings.shelter >= 8
                  ? "bg-emerald-500"
                  : activeGrandstand.ratings.shelter >= 6
                    ? "bg-amber-500"
                    : "bg-red-500"
              }
              detail="Protection from afternoon sun & monsoon rain"
            />

            <ScoreMeter
              icon={Tv}
              label="Big Screen Visibility"
              score={activeGrandstand.ratings.bigScreen}
              accent="bg-sky-500"
              detail="Direct line of sight to broadcast screen"
            />

            <ScoreMeter
              icon={Camera}
              label="Photography Angle"
              score={activeGrandstand.ratings.photography}
              accent="bg-purple-500"
              detail="Car proximity and panning potential"
            />
          </div>

          {/* Sun & Weather Outlook */}
          <div className="border-l-2 border-primary/60 pl-3 py-1 space-y-0.5">
            <span className="text-[11px] font-mono text-ink font-semibold flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sun Angle & Weather Outlook</span>
            </span>
            <p className="text-[11px] text-muted leading-relaxed">
              {activeGrandstand.sunAndRainOutlook}
            </p>
          </div>

          {/* Local Insider Tip */}
          <div className="bg-canvas-elevated/40 border border-hairline rounded-lg p-sm flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary block">
                Local Insider Tip
              </span>
              <p className="text-[11px] text-body leading-relaxed">
                {activeGrandstand.proTip}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Hairline />
    </div>
  );
}
