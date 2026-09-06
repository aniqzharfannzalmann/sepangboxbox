import { Container, Hairline } from "./primitives";

/**
 * TableSkeleton: Placeholder shaped like standings, results, and table pages.
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Container className="py-xxl">
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-3 w-32 bg-canvas-elevated" />
        <div className="h-10 w-72 max-w-full bg-canvas-elevated mt-sm" />
        <div className="mt-xl flex flex-col">
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-xs py-sm border-b border-hairline"
            >
              <div className="h-5 w-6 bg-canvas-elevated shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-40 max-w-full bg-canvas-elevated" />
                <div className="h-3 w-24 bg-canvas-elevated mt-xxs" />
              </div>
              <div className="h-4 w-12 bg-canvas-elevated shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">
        Loading...
      </p>
    </Container>
  );
}

/**
 * CircuitDetailSkeleton: Placeholder for /circuits/[id] pages.
 */
export function CircuitDetailSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {/* Hero section skeleton */}
      <div className="bg-canvas border-b border-hairline py-xxl">
        <Container>
          <div className="h-4 w-28 bg-canvas-elevated" />
          <div className="h-12 w-80 max-w-full bg-canvas-elevated mt-sm" />
          <div className="h-4 w-48 bg-canvas-elevated mt-xs" />

          {/* Circuit Map Placeholder */}
          <div className="mt-xl h-[280px] sm:h-[380px] w-full bg-canvas-elevated/40 border border-hairline flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin opacity-50" />
          </div>
        </Container>
      </div>

      {/* Specs Grid Skeleton */}
      <Container className="py-xxl">
        <div className="h-4 w-36 bg-canvas-elevated mb-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="border border-hairline p-md flex flex-col gap-sm"
            >
              <div className="h-3 w-20 bg-canvas-elevated" />
              <div className="h-8 w-24 bg-canvas-elevated" />
            </div>
          ))}
        </div>
      </Container>
      <p className="sr-only" role="status">
        Loading circuit telemetry...
      </p>
    </div>
  );
}

/**
 * TeamDetailSkeleton: Placeholder for /teams/[id] pages.
 */
export function TeamDetailSkeleton() {
  return (
    <div className="animate-pulse py-xxl" aria-hidden="true">
      <Container>
        <div className="h-4 w-24 bg-canvas-elevated" />
        <div className="h-12 w-72 max-w-full bg-canvas-elevated mt-sm" />
        <div className="h-4 w-40 bg-canvas-elevated mt-xs" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mt-xxl">
          <div className="border border-hairline p-lg flex flex-col gap-md">
            <div className="h-4 w-28 bg-canvas-elevated" />
            <div className="h-40 w-full bg-canvas-elevated/40" />
          </div>
          <div className="border border-hairline p-lg flex flex-col gap-md">
            <div className="h-4 w-28 bg-canvas-elevated" />
            <div className="h-40 w-full bg-canvas-elevated/40" />
          </div>
        </div>
      </Container>
      <p className="sr-only" role="status">
        Loading team telemetry...
      </p>
    </div>
  );
}

/**
 * SepangSkeleton: Placeholder for the rich /sepang page.
 */
export function SepangSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {/* Hero section */}
      <div className="bg-canvas border-b border-hairline py-xxl">
        <Container>
          <div className="h-4 w-32 bg-canvas-elevated" />
          <div className="h-14 w-96 max-w-full bg-canvas-elevated mt-sm" />
          <div className="h-5 w-72 bg-canvas-elevated mt-xs" />
          <div className="flex gap-sm mt-lg">
            <div className="h-12 w-36 bg-canvas-elevated" />
            <div className="h-12 w-36 bg-canvas-elevated" />
          </div>
        </Container>
      </div>

      {/* Explorer section skeleton */}
      <Container className="py-xxl">
        <div className="h-4 w-44 bg-canvas-elevated mb-lg" />
        <div className="h-[420px] w-full bg-canvas-elevated/30 border border-hairline flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs uppercase tracking-wider text-muted">
              Loading Sepang Circuit Map & Telemetry...
            </span>
          </div>
        </div>
      </Container>
      <p className="sr-only" role="status">
        Loading Sepang overview...
      </p>
    </div>
  );
}

/**
 * PageSkeleton: General fallback skeleton for root app loading.
 */
export function PageSkeleton() {
  return (
    <Container className="py-xxl animate-pulse" aria-hidden="true">
      <div className="h-4 w-24 bg-canvas-elevated" />
      <div className="h-10 w-64 max-w-full bg-canvas-elevated mt-sm" />
      <Hairline className="my-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mt-lg">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="border border-hairline p-md h-32 flex flex-col justify-between bg-canvas-elevated/20"
          >
            <div className="h-4 w-28 bg-canvas-elevated" />
            <div className="h-3 w-16 bg-canvas-elevated" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading...
      </p>
    </Container>
  );
}
