import maps from "@/lib/f1/circuit-maps.json";

interface CircuitMapData {
  d: string;
  viewBox: string;
  measuredMetres: number;
  officialMetres: number;
  source: string;
}

const MAPS = maps as Record<string, CircuitMapData>;

export function getCircuitMap(circuitId: string): CircuitMapData | null {
  return MAPS[circuitId] ?? null;
}

/**
 * The circuit outline, traced from OpenStreetMap.
 *
 * Generated offline by `npm run maps:circuits` and committed, because an
 * outline never changes and Overpass is far too slow to query at request time.
 *
 * Only circuits whose traced geometry matched their published length to within
 * 4% have a map at all. Fifteen of the twenty-three do; the street circuits
 * mostly do not, because OSM tags their roads as ordinary streets rather than
 * raceway. A circuit without a verified outline shows none, which is the right
 * trade: F1 fans know these tracks by shape, and a wrong map would undermine
 * everything else on the page.
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
        aria-label={`Outline of ${name}`}
        className="w-full h-auto max-h-[420px]"
      >
        <path
          d={map.d}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
          // Belongs on the path, not the svg — on the parent it does nothing.
          // Keeps the line an even weight however the viewBox is scaled.
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="text-caption text-muted mt-xs">
        Outline traced from {map.source}. Measured{" "}
        {(map.measuredMetres / 1000).toFixed(3)} km against a published{" "}
        {(map.officialMetres / 1000).toFixed(3)} km.
      </figcaption>
    </figure>
  );
}
