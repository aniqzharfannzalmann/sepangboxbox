"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Container } from "./primitives";

const NAV = [
  { href: "/live", label: "Live" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/circuits", label: "Circuits" },
  { href: "/compare", label: "Compare" },
  { href: "/sepang", label: "Sepang" },
] as const;

/** Wordmark. The Rosso Corsa bar is the brand mark — we do not ship a
 *  third party's trademarked emblem as an asset. */
function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-xxs shrink-0 min-h-12 group"
      aria-label="Sepang Box Box — home"
    >
      <span
        aria-hidden
        className="block h-6 w-[6px] bg-primary group-hover:scale-y-110 transition-transform"
      />
      <span className="label-caps text-ink text-[13px] tracking-[1.4px]">
        Sepang Box Box
      </span>
    </Link>
  );
}

export function TopNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reset pending state synchronously on route change per React guidelines
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setPendingHref(null);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isPending = (href: string) => pendingHref === href;

  const handleNavClick = (href: string) => {
    if (!isActive(href)) {
      setPendingHref(href);
      // Safety timeout in case navigation is cancelled or aborted
      setTimeout(() => setPendingHref(null), 8000);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-canvas border-b border-hairline">
      <Container>
        <div className="h-16 flex items-center justify-between">
          <Wordmark />

          {/* Desktop menu — uppercase, 0.65px tracking (design.md §top-nav) */}
          <nav className="hidden md:flex items-center gap-md" aria-label="Main">
            {NAV.map((item) => {
              const active = isActive(item.href);
              const pending = isPending(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // design.md promises an effective 48px tap area for nav
                    // items; py alone did not get there.
                    "text-nav-link uppercase transition-all duration-150 relative",
                    "inline-flex items-center min-h-12 px-xxs",
                    active
                      ? "text-ink"
                      : pending
                        ? "text-ink font-semibold"
                        : "text-body hover:text-ink",
                  )}
                >
                  {item.label}
                  {/* Subtle active / pending indicator bar */}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  {pending && !active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Hamburger below 768px (design.md §Collapsing Strategy) */}
          <button
            type="button"
            className="md:hidden h-12 w-12 -mr-3 flex flex-col items-center justify-center gap-[5px]"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              aria-hidden
              className={cn(
                "block h-px w-5 bg-ink transition-transform",
                open && "translate-y-[6px] rotate-45",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "block h-px w-5 bg-ink transition-opacity",
                open && "opacity-0",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "block h-px w-5 bg-ink transition-transform",
                open && "-translate-y-[6px] -rotate-45",
              )}
            />
          </button>
        </div>
      </Container>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="md:hidden border-t border-hairline bg-canvas"
        >
          <Container>
            <ul className="flex flex-col py-xxs">
              {NAV.map((item) => {
                const active = isActive(item.href);
                const pending = isPending(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        handleNavClick(item.href);
                        setOpen(false);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "text-nav-link uppercase flex items-center justify-between h-12 border-b border-hairline/40",
                        active
                          ? "text-ink font-semibold"
                          : pending
                            ? "text-ink font-semibold"
                            : "text-body",
                      )}
                    >
                      <span>{item.label}</span>
                      {pending && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Container>
        </nav>
      )}
    </header>
  );
}
