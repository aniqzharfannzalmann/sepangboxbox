import maps from "@/lib/f1/circuit-maps.json";

export interface CircuitMapData {
  f1dbCircuitId: string;
  layoutId: string;
  d: string;
  viewBox: string;
  strokeWidth: number;
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
 * The circuit outline.
 *
 * Imported from F1DB by `npm run maps:circuits` and committed — an outline does
 * not change between releases, so nothing is fetched at request time.
 *
 * The asset's own stroke colour is dropped during import and set here from the
 * design tokens, so the outline follows the palette like everything else.
 */
export function CircuitMap({
  circuitId,
  name,
}: {
  circuitId: string;
  name: string;
}) {
  const map = getCircuitMap(circuitId);
  if (!map) return null;

  return (
    <figure className="mt-lg">
      <svg
        viewBox={map.viewBox}
        role="img"
        aria-label={`Outline of ${name}: ${map.turns} turns, ${map.lengthKm} km, ${humanDirection(map.direction).toLowerCase()}`}
        className="w-full h-auto max-h-[400px]"
      >
        <path
          d={map.d}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={map.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <figcaption className="text-caption text-muted mt-xs">
        Circuit outline from{" "}
        <a
          href="https://github.com/f1db/f1db"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          F1DB
        </a>
        , CC BY 4.0.
      </figcaption>
    </figure>
  );
}
