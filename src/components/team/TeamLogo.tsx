import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/lib/cn";
import manifest from "@/lib/f1/team-logos.json";

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
 *
 * A word on what this component does not attempt. These logos cannot identify
 * a team at row size — rendered at 48px and looked at rather than reasoned
 * about, the ones supplied as full lockups (McLaren, Alpine, Red Bull) are
 * mush, because their wordmark is four pixels tall. The team colour and the
 * name in text do the identifying; this is a supporting mark, and it is sized
 * and toned to sit quietly beside them rather than to be read.
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

const MEASURED: Record<string, { mono: boolean }> = manifest.logos;

/**
 * Whether to render a mark in ink rather than its own colours.
 *
 * Measured, not guessed: `npm run logos:normalise` samples every logo and
 * writes its verdict to team-logos.json, because judging this by eye is what
 * produced a solid white circle where the Mercedes star should have been. The
 * rule and the evidence behind it live in scripts/normalise-logos.mjs.
 *
 * Unmeasured files invert. Most supplied logos are black — five of these
 * eleven are pure black, which is 1.18:1 against the canvas and effectively
 * invisible — so that is the safer default for a file dropped in without the
 * script having been run.
 */
function inkByDefault(constructorId: string): boolean {
  return MEASURED[constructorId]?.mono ?? true;
}

export function TeamLogo({
  constructorId,
  name,
  /**
   * The box each logo is fitted into, at the 2:1 of the shared canvas the
   * normalise script centres every mark on. Off that ratio and the box simply
   * carries dead margin; the marks stay the size they are.
   */
  width = 48,
  height = 24,
  /** Override the measured ink/colour decision for one mark. */
  mono,
  className,
}: {
  constructorId: string;
  name: string;
  width?: number;
  height?: number;
  mono?: boolean;
  className?: string;
}) {
  const src = AVAILABLE.get(constructorId);
  if (!src) return null;

  const ink = mono ?? inkByDefault(constructorId);

  return (
    /*
     * Every logo has already been scaled to a common optical weight and
     * centred on one 400x200 canvas, so `object-contain` in a box of that
     * ratio renders the whole set at a consistent visual size. Doing it to the
     * image is the only place it works: fitting differently-shaped marks into
     * a shared CSS box equalises the bounding box and nothing else, and a
     * dense disc and a pair of hairline wings drawn to the same height do not
     * weigh the same.
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
        // by the device pixel ratio.
        sizes={`${width}px`}
        className={cn(
          "object-contain object-center",
          // brightness(0) drives every opaque pixel to black, invert(1) takes
          // it to white. The alpha channel is untouched, so the silhouette and
          // its antialiased edges survive — the logo does not become a box.
          // It does flatten any structure drawn as a second tone, which is
          // exactly why this is not applied to every mark.
          ink && "brightness-0 invert",
        )}
        loading="lazy"
      />
    </span>
  );
}
