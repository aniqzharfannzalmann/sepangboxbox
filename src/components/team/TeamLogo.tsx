import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
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
 * Ids are the Ergast/Jolpica ones, so:
 *   public/teams/red_bull.svg
 *   public/teams/aston_martin.svg
 *   public/teams/ferrari.svg
 *
 * Falls back to the colour stripe and the team name, which is what the app
 * uses today and remains correct if a logo is never added.
 */

const LOGO_DIR = path.join(process.cwd(), "public", "teams");
const EXTENSIONS = [".svg", ".png", ".webp"];

/**
 * Read the directory once per process rather than per render — this is a
 * handful of files that only change on deploy.
 */
const AVAILABLE: Map<string, string> = (() => {
  const found = new Map<string, string>();
  if (!existsSync(LOGO_DIR)) return found;
  for (const file of readdirSync(LOGO_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;
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
  className,
}: {
  constructorId: string;
  name: string;
  className?: string;
}) {
  const src = AVAILABLE.get(constructorId);
  if (!src) return null;

  return (
    // Plain <img>: these are small, already-optimised marks of unknown
    // dimensions, and next/image would want a width and height per file.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} logo`}
      className={cn("h-8 w-auto object-contain", className)}
      loading="lazy"
    />
  );
}
