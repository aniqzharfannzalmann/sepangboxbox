import { cn } from "@/lib/cn";
import maps from "@/lib/f1/circuit-maps.json";

export interface CircuitPath {
  d: string;
  /** Filled shape rather than a stroked line — the start marker. */
  filled: boolean;
  strokeWidth: number;
  linecap: string;
  linejoin: string;
  /**
   * Present only where the artwork places a shape by transform instead of
   * drawing it in position. Three of the 23 do: Baku, Barcelona and Austin
   * draw an axis-aligned start line and then rotate it onto the track.
   * Dropping this leaves those start lines floating beside the circuit.
   */
  transform?: string;
}

export interface CircuitMapData {
  f1dbCircuitId: string;
  layoutId: string;
  paths: CircuitPath[];
  viewBox: string;
  lengthKm: number;
  turns: number;
  /** "RACE", "STREET" or "ROAD". */
  type: string;
  /** "CLOCKWISE" or "ANTI_CLOCKWISE". */
  direction: string;
  racesHeld: number;
}

const MAPS = maps as Record<string, CircuitMapData>;

export function getCircuitMap(circuitId: string): CircuitMapData | null {
  return MAPS[circuitId] ?? null;
}

/** "ANTI_CLOCKWISE" reads badly; "Anti-clockwise" does not. */
export function humanDirection(direction: string): string {
  return direction === "ANTI_CLOCKWISE" ? "Anti-clockwise" : "Clockwise";
}

export function humanType(type: string): string {
  if (type === "STREET") return "Street circuit";
  if (type === "ROAD") return "Road circuit";
  return "Permanent circuit";
}

/**
 * The circuit outline, with its start line and marker.
 *
 * Imported by `npm run maps:circuits` and committed — artwork does not change
 * between releases, so nothing is fetched at request time.
 *
 * The assets' own colours are dropped on import and set here from the design
 * tokens. The track takes Rosso Corsa; the start line and marker take ink, so
 * they read against it rather than disappearing into it.
 */
/**
 * The artwork is drawn with a stroke sized for a 500-unit square. Cropping the
 * viewBox to the drawing makes everything render larger, which left the track
 * heavy enough that tight sections merged into one another. Thinning it opens
 * those back up without making the line spindly.
 */
const STROKE_SCALE = 0.7;

/**
 * The drawing on its own, with no caption and no margin of its own.
 *
 * Separate from CircuitMap because the same artwork has to work at two very
 * different sizes: one large plate on a circuit page, and 23 thumbnails on the
 * index, where a repeated attribution line under every card would be noise.
 * The site footer carries that credit on every page, which is what CC BY 4.0
 * asks for.
 *
 * The caller sets the height, since what "too tall" means depends entirely on
 * whether this is the subject of the page or a tile in a grid.
 */
export function CircuitOutline({
  circuitId,
  name,
  className,
  strokePx,
}: {
  circuitId: string;
  name: string;
  className?: string;
  /**
   * Draw the track at this many screen pixels, whatever the drawing's scale.
   *
   * For a set of these side by side. Stroke width is in viewBox units, and the
   * viewBox is cropped to each drawing, so how thick a line looks depends
   * entirely on how much that particular circuit had to be scaled to fit —
   * measured across the 23, apparent stroke ran 2.77x, from Miami at 10.8px to
   * Interlagos at 3.9px, because a 2.5:1 shape fits a wide box best and is
   * therefore blown up most. That reads as 23 drawings at different weights
   * rather than one set.
   *
   * `vector-effect: non-scaling-stroke` takes the stroke out of the coordinate
   * system entirely, so the number below is screen pixels and every circuit
   * gets the same line. Left unset on the full-size plate, where there is only
   * ever one drawing on screen and nothing to be inconsistent with.
   */
  strokePx?: number;
}) {
  const map = getCircuitMap(circuitId);
  if (!map) return null;

  // The track is the heaviest stroke in the drawing; everything else is a
  // marking laid on top of it.
  const trackWidth = Math.max(...map.paths.map((p) => p.strokeWidth));

  return (
    <svg
      viewBox={map.viewBox}
      role="img"
      aria-label={`Outline of ${name}: ${map.turns} turns, ${map.lengthKm} km, ${humanDirection(map.direction).toLowerCase()}`}
      // The viewBox is cropped to the drawing, so aspect ratios run from 0.39
      // (Montreal) to 2.52 (Miami). Full width with a height cap lets a wide
      // circuit fill the space and keeps a tall one from running away.
      className={cn("w-full h-auto", className)}
    >
      {map.paths.map((path, i) => {
        const isTrack = !path.filled && path.strokeWidth === trackWidth;
        const colour = isTrack ? "var(--color-primary)" : "var(--color-ink)";
        return (
          <path
            key={i}
            d={path.d}
            transform={path.transform}
            fill={path.filled ? colour : "none"}
            stroke={path.filled ? "none" : colour}
            strokeWidth={
              strokePx === undefined
                ? path.strokeWidth * STROKE_SCALE
                : // Markings stay lighter than the track they sit on, in the
                  // same proportion the artwork drew them.
                  Math.max(1, strokePx * (path.strokeWidth / trackWidth))
            }
            vectorEffect={strokePx === undefined ? undefined : "non-scaling-stroke"}
            strokeLinecap={path.linecap as "round" | "square" | "butt"}
            strokeLinejoin={path.linejoin as "round" | "bevel" | "miter"}
          />
        );
      })}
    </svg>
  );
}

export function CircuitMap({
  circuitId,
  name,
}: {
  circuitId: string;
  name: string;
}) {
  if (!getCircuitMap(circuitId)) return null;

  return (
    <figure className="mt-lg">
      <CircuitOutline
        circuitId={circuitId}
        name={name}
        className="max-h-[420px]"
      />
      <figcaption className="text-caption text-muted mt-xs">
        Circuit artwork from{" "}
        <a
          href="https://github.com/julesr0y/f1-circuits-svg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          f1-circuits-svg
        </a>
        , measurements from{" "}
        <a
          href="https://github.com/f1db/f1db"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          F1DB
        </a>
        . Both CC BY 4.0.
      </figcaption>
    </figure>
  );
}
