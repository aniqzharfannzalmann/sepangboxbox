import { Container } from "./primitives";

/**
 * Placeholder shaped like the table pages it stands in for, so the layout does
 * not jump when real content arrives.
 *
 * Used only by genuinely dynamic routes. A `loading.tsx` opens a Suspense
 * boundary, which makes Next stream the response — and a streamed response has
 * already committed HTTP 200 before the page body runs. On a route that can
 * call notFound() that silently turns a 404 into a 200, so those routes
 * deliberately have no loading boundary above them.
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Container className="py-xxl">
      <div className="animate-pulse" aria-hidden>
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
        Loading
      </p>
    </Container>
  );
}
