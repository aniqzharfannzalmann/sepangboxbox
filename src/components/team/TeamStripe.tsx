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
  className,
}: {
  constructorId: string;
  className?: string;
}) {
  const hex = teamHex(constructorId);
  if (!hex) return null;

  return (
    <span
      aria-hidden
      className={cn("block w-[3px] self-stretch shrink-0 rounded-none", className)}
      style={{ backgroundColor: hex }}
    />
  );
}
