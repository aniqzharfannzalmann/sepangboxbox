import { cn } from "@/lib/cn";
import type { CircuitRating } from "@/lib/f1/circuit-stats";

/**
 * One measured circuit characteristic, as a value over a bar.
 *
 * The value is stated in its own units — "3.8 places", "22%" — rather than
 * forced onto an invented 1-5 scale. A reader can check "pole wins 67% of the
 * time here" against what they know; "traction 4/5" is not checkable at all,
 * and inventing one would dress a measurement up as an opinion.
 */
export function RatingBar({ rating }: { rating: CircuitRating }) {
  const pct = Math.round(rating.fraction * 100);

  return (
    <div>
      <p className="text-display-md text-ink tnum">{rating.display}</p>
      <p className="text-title-sm text-ink mt-xxxs">{rating.label}</p>
      <div
        className="mt-xs h-1 w-full bg-canvas-elevated"
        role="img"
        aria-label={`${rating.label}: ${rating.display}. ${rating.meaning}.`}
      >
        <div
          className={cn(
            "h-full",
            // Rosso Corsa only at the extreme. design.md keeps the accent
            // scarce, and here it means "this circuit is an outlier".
            pct >= 75 ? "bg-primary" : "bg-body",
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <p className="text-caption text-muted mt-xxs">{rating.meaning}</p>
    </div>
  );
}
