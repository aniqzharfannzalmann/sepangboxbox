"use client";

import { useState } from "react";
import { f1Audio } from "@/lib/audio";
import { cn } from "@/lib/cn";
import type { RadioMoment } from "@/lib/f1/sepang-turns";

interface TeamRadioCardProps {
  radio: RadioMoment;
  className?: string;
}

export function TeamRadioCard({ radio, className }: TeamRadioCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayToggle = () => {
    if (isPlaying) {
      f1Audio.stopPlayback();
      setIsPlaying(false);
      return;
    }

    // Combine dialogue lines for speech synthesis
    const fullText = radio.dialogue
      .map((d) => `${d.speaker} said: ${d.text}`)
      .join(". ");

    f1Audio.speakRadioQuote(
      fullText,
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-surface/75 backdrop-blur-md overflow-hidden transition-all shadow-md hover:border-primary/40",
        className,
      )}
    >
      {/* Official F1 Broadcast Header Bar */}
      <div className="flex items-center justify-between px-md py-xs bg-black/60 border-b border-hairline">
        <div className="flex items-center gap-xs">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              isPlaying ? "bg-primary animate-pulse" : "bg-muted/60",
            )}
          />
          <span className="text-caption uppercase tracking-widest font-mono text-ink font-semibold">
            F1 Team Radio · {radio.year}
          </span>
        </div>

        <span className="text-caption text-muted font-mono">
          SIC {radio.year}
        </span>
      </div>

      {/* Driver & Team Banner */}
      <div className="p-sm sm:p-md">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-sm">
          <div className="flex items-start gap-sm flex-1 min-w-0">
            {/* Team Color Stripe & Driver Number Badge */}
            <div
              className="flex items-center justify-center px-sm py-xs rounded text-title-sm font-mono font-bold text-white shadow-sm shrink-0"
              style={{ backgroundColor: radio.teamColor }}
            >
              {radio.driverCode}
              <span className="ml-1 opacity-80 text-caption font-normal">
                #{radio.driverNumber}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-body-md font-semibold text-ink leading-snug">
                {radio.headline}
              </h4>
              <p className="text-caption text-muted mt-0.5">
                {radio.driverName} · {radio.teamName}
              </p>
            </div>
          </div>

          {/* Radio Play / Stop Button - full width on mobile, compact on desktop */}
          <button
            type="button"
            onClick={handlePlayToggle}
            aria-label={isPlaying ? "Stop radio broadcast" : "Listen to radio broadcast"}
            className={cn(
              "w-full sm:w-auto justify-center flex items-center gap-xs px-md py-xs rounded-full border text-caption font-mono uppercase tracking-wider transition-all shrink-0 active:scale-95",
              isPlaying
                ? "bg-primary/20 border-primary text-primary"
                : "bg-surface border-hairline text-ink hover:border-ink hover:bg-surface-elevated",
            )}
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 rounded-sm bg-primary animate-ping" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Listen</span>
              </>
            )}
          </button>
        </div>

        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-1 my-sm h-6 px-sm bg-black/40 rounded border border-hairline/60">
          {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70, 85, 40, 65, 90, 55, 30, 80, 45].map(
            (height, i) => (
              <span
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-200",
                  isPlaying ? "bg-primary animate-pulse" : "bg-muted/40",
                )}
                style={{
                  height: `${height}%`,
                  animationDelay: isPlaying ? `${(i * 70) % 700}ms` : undefined,
                  animationDuration: isPlaying ? "750ms" : undefined,
                }}
              />
            ),
          )}
        </div>

        {/* Context Narrative */}
        <p className="text-body-sm text-muted mb-sm leading-relaxed">
          {radio.context}
        </p>

        {/* Dialogue Box */}
        <div className="space-y-xs pt-xs border-t border-hairline font-mono text-body-sm">
          {radio.dialogue.map((line, idx) => (
            <div key={idx} className="flex items-baseline gap-xs">
              <span
                className={cn(
                  "text-caption font-semibold shrink-0 uppercase",
                  line.role === "driver"
                    ? "text-primary"
                    : line.role === "team_principal"
                      ? "text-accent"
                      : "text-ink",
                )}
              >
                {line.speaker}:
              </span>
              <span className="text-body italic text-ink/90">
                &ldquo;{line.text}&rdquo;
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
