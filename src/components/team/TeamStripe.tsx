import { cn } from "@/lib/cn";
import { teamHex } from "@/lib/f1/team-colours";

/**
 * A team's livery colour as a vertical rule beside a row.
 *
 * Decorative and aria-hidden: the constructor is already named in text next to
 * it, so the colour adds recognition for people who read the grid by livery
 * without becoming the only way to tell teams apart.
 */
export function TeamStripe({
  constructorId,
  /**
   * How wide the rule is drawn, in pixels.
   *
   * 3px is the default and suits a dense table, where the colour is a marker
   * on a row you are already reading. Widen it where the colour is meant to be
   * the thing you scan by — several of these liveries are neighbouring blues
   * (Alpine, Williams, RB, Red Bull) and a hairline is not enough to separate
   * them at a glance.
   */
  width = 3,
  className,
}: {
  constructorId: string;
  width?: number;
  className?: string;
}) {
  const hex = teamHex(constructorId);
  if (!hex) return null;

  return (
    <span
      aria-hidden
      className={cn("block self-stretch shrink-0 rounded-none", className)}
      style={{ backgroundColor: hex, width }}
    />
  );
}
