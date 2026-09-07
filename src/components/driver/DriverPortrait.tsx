import Image from "next/image";
import { cn } from "@/lib/cn";
import { teamHex } from "@/lib/f1/team-colours";

/**
 * A driver's face, if one has been supplied.
 *
 * Driver photographs are generated into public/drivers by the normalisation
 * script and mapped here explicitly so this component remains browser-safe.
 *
 * Ids are the Ergast/Jolpica ones, so `max_verstappen` and `arvid_lindblad`
 * carry underscores. A file whose name does not match is not found, and the
 * driver keeps their initials — see assets/drivers/README.md.
 */

/*
 * The explicit map also provides a predictable fallback for a newly added
 * driver: initials render until the public asset is deliberately mapped.
 */
/**
 * Public assets are resolved from the browser-safe manifest. Keeping discovery
 * out of this component is important: DriverPortrait is rendered inside client
 * trees, so it must never import node:fs or node:path.
 */
const PORTRAITS: Record<string, string> = {
  albon: "/drivers/albon.webp",
  alonso: "/drivers/alonso.webp",
  antonelli: "/drivers/antonelli.webp",
  arvid_lindblad: "/drivers/arvid_lindblad.webp",
  bearman: "/drivers/bearman.webp",
  bottas: "/drivers/bottas.webp",
  bortoleto: "/drivers/bortoleto.webp",
  colapinto: "/drivers/colapinto.webp",
  gasly: "/drivers/gasly.webp",
  hadjar: "/drivers/hadjar.webp",
  hamilton: "/drivers/hamilton.webp",
  hulkenberg: "/drivers/hulkenberg.webp",
  lawson: "/drivers/lawson.webp",
  leclerc: "/drivers/leclerc.webp",
  max_verstappen: "/drivers/max_verstappen.webp",
  norris: "/drivers/norris.webp",
  ocon: "/drivers/ocon.webp",
  perez: "/drivers/perez.webp",
  piastri: "/drivers/piastri.webp",
  russell: "/drivers/russell.webp",
  sainz: "/drivers/sainz.webp",
  stroll: "/drivers/stroll.webp",
};

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
  const src = PORTRAITS[driverId];
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
