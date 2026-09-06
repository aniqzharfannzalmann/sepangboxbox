"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

/**
 * Global F1-themed top navigation progress bar.
 *
 * Provides immediate visual feedback (<10ms) when any internal link or button
 * is clicked, preventing rage-clicks/double-click spam during server component
 * data fetching and page transitions.
 */
function NavigationBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPitPulse, setShowPitPulse] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const completeLoading = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    setProgress(100);
    setShowPitPulse(false);

    // Fade out after reaching 100%
    setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        setProgress(0);
      }, 300);
    }, 200);
  }, []);

  const startLoading = useCallback(() => {
    // Clear any previous timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    setIsLoading(true);
    setProgress(15);
    setShowPitPulse(false);

    // If navigation takes longer than 350ms, show the subtle pit-wall telemetry indicator
    pulseTimerRef.current = setTimeout(() => {
      setShowPitPulse(true);
    }, 350);

    // Smooth progressive trickle: speeds up initially, then slows down before completing
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          return prev; // Hold at 90% until page route arrives
        }
        if (prev < 40) return prev + 12;
        if (prev < 70) return prev + 6;
        return prev + 1.5;
      });
    }, 150);

    // Safety timeout: auto-complete if navigation never finishes after 12s
    safetyTimeoutRef.current = setTimeout(() => {
      completeLoading();
    }, 12000);
  }, [completeLoading]);

  // Complete progress whenever the pathname or search parameters change
  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const previousUrlRef = useRef(currentUrl);

  useEffect(() => {
    if (previousUrlRef.current !== currentUrl) {
      previousUrlRef.current = currentUrl;
      completeLoading();
    }
  }, [currentUrl, completeLoading]);

  useEffect(() => {
    // Intercept clicks on links across the document for instantaneous (<10ms) feedback
    const handleDocumentClick = (event: MouseEvent) => {
      // Ignore modified clicks (new tab / window)
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore in-page hash anchors, mailto, tel, javascript, downloads, target="_blank"
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("rel")?.includes("external")
      ) {
        return;
      }

      // Check destination against current origin and URL
      try {
        const dest = new URL(href, window.location.href);
        if (dest.origin !== window.location.origin) {
          return; // External domain
        }

        // If clicking link to current page + same hash, don't trigger loading
        if (
          dest.pathname === window.location.pathname &&
          dest.search === window.location.search &&
          dest.hash === window.location.hash
        ) {
          return;
        }

        // Distinct page destination: start progress bar immediately!
        startLoading();
      } catch {
        // Not a valid URL
      }
    };

    // Also trigger loading on browser Back / Forward buttons
    const handlePopState = () => {
      startLoading();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      if (timerRef.current) clearInterval(timerRef.current);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, [startLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top Rosso Corsa Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[3px] bg-transparent"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Page navigation progress"
      >
        <div
          className="h-full bg-primary transition-all duration-200 ease-out relative"
          style={{
            width: `${progress}%`,
            opacity: isLoading ? 1 : 0,
            boxShadow:
              "0 0 10px var(--color-primary, #da291c), 0 0 4px var(--color-primary, #da291c)",
          }}
        >
          {/* Glowing head at the front of the progress line */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/40 pointer-events-none" />
        </div>
      </div>

      {/* Pit wall telemetry pulse indicator for longer loads (>350ms) */}
      <div
        className={`fixed top-4 right-4 z-[99998] pointer-events-none transition-all duration-300 ${
          showPitPulse
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2"
        }`}
      >
        <div className="flex items-center gap-2 bg-canvas-elevated/95 backdrop-blur-md border border-hairline px-3 py-1.5 shadow-2xl text-[11px] font-mono tracking-wider uppercase text-ink">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-body font-semibold">FETCHING TELEMETRY...</span>
        </div>
      </div>
    </>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationBarInner />
    </Suspense>
  );
}
