import { existsSync, openSync, readSync, closeSync, readdirSync } from "node:fs";
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

interface Logo {
  src: string;
  /** Intrinsic size, where it can be read. Null for SVG, which has none. */
  width: number | null;
  height: number | null;
}

/**
 * Intrinsic dimensions from a PNG header.
 *
 * Needed because next/image wants them, and supplying them is what lets it
 * resize: these files are drawn at 32-48px but arrive as large as 3840x2160,
 * which is 414 KB of logos on a page that is otherwise about 240 KB. Reading
 * the header costs 24 bytes per file, once per process.
 */
function pngSize(file: string): { width: number; height: number } | null {
  let fd: number | null = null;
  try {
    fd = openSync(file, "r");
    const header = Buffer.alloc(24);
    if (readSync(fd, header, 0, 24, 0) < 24) return null;
    // 8-byte signature, then the IHDR chunk with width and height as
    // big-endian uint32 at offsets 16 and 20.
    if (header.readUInt32BE(0) !== 0x89504e47) return null;
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

/** Read the directory once per process — these change only on deploy. */
const AVAILABLE: Map<string, Logo> = (() => {
  const found = new Map<string, Logo>();
  if (!existsSync(LOGO_DIR)) return found;

  for (const file of readdirSync(LOGO_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (![".svg", ".png", ".webp"].includes(ext)) continue;

    const size = ext === ".png" ? pngSize(path.join(LOGO_DIR, file)) : null;
    found.set(path.basename(file, ext), {
      src: `/teams/${file}`,
      width: size?.width ?? null,
      height: size?.height ?? null,
    });
  }
  return found;
})();

export function hasTeamLogo(constructorId: string): boolean {
  return AVAILABLE.has(constructorId);
}

export function TeamLogo({
  constructorId,
  name,
  /** Rendered height in pixels; the width follows the logo's aspect ratio. */
  height = 32,
  className,
}: {
  constructorId: string;
  name: string;
  height?: number;
  className?: string;
}) {
  const logo = AVAILABLE.get(constructorId);
  if (!logo) return null;

  const classes = cn("w-auto object-contain", className);
  const alt = `${name} logo`;

  // Without intrinsic dimensions — an SVG — there is nothing for next/image to
  // resize, so serve it directly.
  if (logo.width === null || logo.height === null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo.src} alt={alt} style={{ height }} className={classes} loading="lazy" />
    );
  }

  // Ask for twice the drawn height so it stays sharp on a dense screen, and
  // let next/image do the downscaling and format conversion.
  const scale = (height * 2) / logo.height;

  return (
    <Image
      src={logo.src}
      alt={alt}
      width={Math.max(1, Math.round(logo.width * scale))}
      height={height * 2}
      style={{ height, width: "auto" }}
      className={classes}
      loading="lazy"
    />
  );
}
