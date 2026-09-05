import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * A team logo, if one has been supplied.
 *
 * Deliberately empty by default. Team logos are registered trademarks, and no
 * open dataset can license them however its own repository is licensed — so
 * none are shipped here. This is the slot: drop a file at
 * `public/teams/<constructorId>.svg` (or .png/.webp) and it appears wherever
 * teams are shown. Nothing else needs changing.
 *
 * Ids are the Ergast/Jolpica ones:
 *   public/teams/red_bull.png
 *   public/teams/aston_martin.png
 *
 * Falls back to the colour stripe and the team name, which is what the app
 * uses without a logo and remains correct if one is never added.
 */

const LOGO_DIR = path.join(process.cwd(), "public", "teams");

/** Read the directory once per process — these change only on deploy. */
const AVAILABLE: Map<string, string> = (() => {
  const found = new Map<string, string>();
  if (!existsSync(LOGO_DIR)) return found;

  for (const file of readdirSync(LOGO_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (![".svg", ".png", ".webp"].includes(ext)) continue;
    found.set(path.basename(file, ext), `/teams/${file}`);
  }
  return found;
})();

export function hasTeamLogo(constructorId: string): boolean {
  return AVAILABLE.has(constructorId);
}

export function TeamLogo({
  constructorId,
  name,
  /** The box each logo is fitted into. */
  width = 76,
  height = 28,
  className,
}: {
  constructorId: string;
  name: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const src = AVAILABLE.get(constructorId);
  if (!src) return null;

  return (
    /*
     * Every logo is fitted into the same box rather than given the same
     * height. These marks range from square (Ferrari, 1:1) to very wide
     * (Aston Martin, 4.5:1), so a fixed height made the wide ones render four
     * times the area of the square ones and the row looked arbitrary. A shared
     * box with object-contain lets each scale to whichever edge it meets
     * first, and they read as one set.
     *
     * next/image with `fill` needs a positioned parent, and `sizes` keeps it
     * from fetching a srcset entry far larger than the box.
     */
    <span
      className={cn("relative block shrink-0", className)}
      style={{ width, height }}
    >
      <Image
        src={src}
        alt={`${name} logo`}
        fill
        // The CSS box, not a doubled one: the browser already multiplies this
        // by the device pixel ratio. Pre-doubling it fetched roughly twice the
        // resolution needed on top of that.
        sizes={`${width}px`}
        className="object-contain object-center"
        loading="lazy"
      />
    </span>
  );
}
