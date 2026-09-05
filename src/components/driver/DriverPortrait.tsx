import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { teamHex } from "@/lib/f1/team-colours";

/**
 * A driver's face, if one has been supplied.
 *
 * Driver photographs are somebody's copyright, so none are shipped here. This
 * is the slot: put a full-body original in assets/drivers/<driverId>.png, run
 * `npm run drivers:normalise`, and it appears wherever drivers are listed.
 *
 * Ids are the Ergast/Jolpica ones, so `max_verstappen` and `arvid_lindblad`
 * carry underscores. A file whose name does not match is not found, and the
 * driver keeps their initials — see assets/drivers/README.md.
 */

/*
 * Discovery is by directory listing, not by the generated manifest.
 *
 * driver-portraits.json records the crop the importer chose for each driver,
 * which is what makes a bad crop reviewable and overridable — but it is a
 * record of that decision, not something the rendering needs. Reading the
 * directory keeps this component true to what is actually on disk.
 */
const PORTRAIT_DIR = path.join(process.cwd(), "public", "drivers");

function listPortraits(): Map<string, string> {
  const found = new Map<string, string>();
  if (!existsSync(PORTRAIT_DIR)) return found;

  for (const file of readdirSync(PORTRAIT_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (![".webp", ".png", ".jpg", ".jpeg"].includes(ext)) continue;
    found.set(path.basename(file, ext), `/drivers/${file}`);
  }
  return found;
}

/**
 * Cached in production, re-read in development.
 *
 * In production these change only on deploy, so reading the directory once per
 * process is right. In development they change while the server is running —
 * that is the whole workflow for adding a driver — and a cached listing taken
 * before the file existed means the portrait does not appear and the only cure
 * is a restart. That wasted two verification passes before it was worth
 * fixing.
 */
const CACHED = process.env.NODE_ENV === "production" ? listPortraits() : null;
const available = () => CACHED ?? listPortraits();

/**
 * Initials, from the parts of a name rather than from its first two letters.
 *
 * "Andrea Kimi Antonelli" has to give AA and not AK: the middle name is not
 * the family name, and a driver is known by the last one.
 */
function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function DriverPortrait({
  driverId,
  name,
  /**
   * The team whose colour the fallback uses. Optional: without it the initials
   * sit on the elevated surface, which is correct but anonymous.
   */
  constructorId,
  /** Edge of the square, in CSS pixels. */
  size = 40,
  className,
}: {
  driverId: string;
  name: string;
  constructorId?: string;
  size?: number;
  className?: string;
}) {
  const src = available().get(driverId);
  const hex = constructorId ? teamHex(constructorId) : null;

  /*
   * Square, and the same square whether or not there is a photograph.
   *
   * These get added a few at a time, so for a long while most rows will be
   * initials and some will be faces. Reserving the space either way is what
   * keeps that looking deliberate rather than half-finished, and means no
   * layout shifts as they arrive.
   *
   * Sharp corners rather than a circle: docs/design.md keeps pill geometry for
   * badges, and everything else square.
   */
  const box = (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden bg-canvas-elevated",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          // The CSS box; the browser multiplies by device pixel ratio itself.
          sizes={`${size}px`}
          className="object-cover object-center"
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center label-caps text-ink"
          style={{
            // The livery, dimmed well below the stripe's full strength: this
            // is a placeholder behind a name, not a thing to be read.
            backgroundColor: hex ? `${hex}33` : undefined,
            // Initials have to stay legible from 32px in a table to 96px on a
            // team page, so the type scales with the box rather than picking a
            // token that only suits one of them.
            fontSize: Math.max(10, Math.round(size * 0.34)),
            letterSpacing: size > 56 ? "1.4px" : "0.5px",
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );

  return box;
}
