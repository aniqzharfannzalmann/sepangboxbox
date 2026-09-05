import maps from "@/lib/f1/circuit-maps.json";

export interface CircuitPath {
  d: string;
  /** Filled shape rather than a stroked line — the start marker. */
  filled: boolean;
  strokeWidth: number;
  linecap: string;
  linejoin: string;
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

export function CircuitMap({
  circuitId,
  name,
}: {
  circuitId: string;
  name: string;
}) {
  const map = getCircuitMap(circuitId);
  if (!map) return null;

  // The track is the heaviest stroke in the drawing; everything else is a
  // marking laid on top of it.
  const trackWidth = Math.max(...map.paths.map((p) => p.strokeWidth));

  return (
    <figure className="mt-lg">
      <svg
        viewBox={map.viewBox}
        role="img"
        aria-label={`Outline of ${name}: ${map.turns} turns, ${map.lengthKm} km, ${humanDirection(map.direction).toLowerCase()}`}
        // The viewBox is cropped to the drawing, so aspect ratios run from
        // 0.39 (Montreal) to 2.52 (Miami). Full width with a height cap lets a
        // wide circuit fill the space and keeps a tall one from running away.
        className="w-full h-auto max-h-[420px]"
      >
        {map.paths.map((path, i) => {
          const isTrack = !path.filled && path.strokeWidth === trackWidth;
          const colour = isTrack
            ? "var(--color-primary)"
            : "var(--color-ink)";
          return (
            <path
              key={i}
              d={path.d}
              fill={path.filled ? colour : "none"}
              stroke={path.filled ? "none" : colour}
              strokeWidth={path.strokeWidth * STROKE_SCALE}
              strokeLinecap={path.linecap as "round" | "square" | "butt"}
              strokeLinejoin={path.linejoin as "round" | "bevel" | "miter"}
            />
          );
        })}
      </svg>
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
