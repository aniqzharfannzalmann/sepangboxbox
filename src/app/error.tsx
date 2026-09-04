"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container, SectionLabel } from "@/components/ui/primitives";

/**
 * Last line of defence.
 *
 * Every data path already degrades on its own — the schedule falls back to its
 * committed snapshot, standings say when they are unavailable. This catches
 * what those did not anticipate, and still gives the reader somewhere to go
 * rather than a blank page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <Container className="py-xxl">
      <SectionLabel>Something went wrong</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">
        That page could not be loaded
      </h1>
      <p className="text-body-md text-body mt-sm max-w-[52ch]">
        The session schedule and championship standings are still available.
      </p>

      <div className="flex flex-wrap gap-xs mt-lg">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button href="/schedule" variant="outline-on-dark">
          Schedule
        </Button>
        <Button href="/standings" variant="outline-on-dark">
          Standings
        </Button>
      </div>

      {error.digest && (
        <p className="text-caption text-muted mt-xl">
          Reference: {error.digest}
        </p>
      )}
    </Container>
  );
}
