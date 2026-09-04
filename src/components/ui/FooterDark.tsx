import Link from "next/link";
import { Container, Hairline } from "./primitives";

const COLUMNS = [
  {
    heading: "Race",
    links: [
      { href: "/", label: "Live" },
      { href: "/results", label: "Results" },
      { href: "/schedule", label: "Schedule" },
    ],
  },
  {
    heading: "Season",
    links: [
      { href: "/standings", label: "Standings" },
      { href: "/compare", label: "Compare drivers" },
    ],
  },
  {
    heading: "Sepang",
    links: [
      {
        href: "https://www.sepangcircuit.com",
        label: "Sepang Circuit",
        external: true,
      },
    ],
  },
  {
    heading: "Data",
    links: [
      { href: "https://api.jolpi.ca", label: "Jolpica-F1", external: true },
      { href: "https://openf1.org", label: "OpenF1", external: true },
    ],
  },
] as const;

export function FooterDark() {
  return (
    <footer className="bg-canvas mt-auto">
      <Hairline />
      <Container className="py-xl">
        {/* 5-column at desktop (design.md §footer-dark) */}
        <div className="grid grid-cols-2 gap-lg md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-xxs">
              <span aria-hidden className="block h-6 w-[6px] bg-primary" />
              <span className="label-caps text-ink tracking-[1.4px]">
                Sepang Box Box
              </span>
            </div>
            <p className="text-body-sm text-muted mt-xs max-w-[28ch]">
              Bahrain Grand Prix in Malaysia · Sepang International Circuit ·
              2–4 October 2026
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="label-caps text-muted">{col.heading}</h2>
              <ul className="mt-xs flex flex-col gap-xxs">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-body hover:text-ink transition-colors"
                      {...("external" in link && link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Hairline className="my-lg" />

        {/*
         * PRD §9 — this disclaimer is a launch requirement, not a nicety.
         * It ships from day one so it cannot be forgotten in race week.
         */}
        <p className="text-body-sm text-muted max-w-[70ch]">
          Sepang Box Box is an unofficial fan project and is not affiliated
          with Formula 1, the FIA, or Formula One Licensing B.V. Timing and
          championship data come from Jolpica-F1 and OpenF1, neither of which
          is an official F1 or FIA data source.
        </p>
      </Container>
    </footer>
  );
}
