import Link from "next/link";
import { StatusNotice } from "@/components/StatusNotice";
import { SectionLabel } from "@/components/ui/primitives";

const LINKS = [
  { label: "Circuit guide", href: "/circuits/sepang", note: "Track layout, history and measured characteristics." },
  { label: "Grandstand guide", href: "/sepang#grandstand-guide", note: "Viewing context and trackside atmosphere." },
  { label: "Weekend schedule", href: "/schedule", note: "Session times in Malaysia Time." },
] as const;

export function VerifiedVenueGuide() {
  return (
    <section className="border border-hairline p-md sm:p-lg" aria-labelledby="venue-guide">
      <SectionLabel>At the circuit</SectionLabel>
      <h2 id="venue-guide" className="text-display-md text-ink mt-xxs">
        Plan your Sepang weekend
      </h2>
      <p className="text-body-md text-body mt-xs max-w-[60ch]">
        Use the guide for track context, viewing ideas and the session schedule. Entry rules, tickets, transport, hospitality access and venue facilities can change, so confirm those details with official venue information before travelling.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-xs mt-md">
        {LINKS.map((link) => (
          <li key={link.href} className="border border-hairline p-sm">
            <Link href={link.href} className="text-body-md text-ink underline underline-offset-4">
              {link.label}
            </Link>
            <p className="text-caption text-muted mt-xxs">{link.note}</p>
          </li>
        ))}
      </ul>
      <StatusNotice role="note" className="mt-md">
        Sepang Box Box is an unofficial fan project. This guide does not sell tickets, provide hospitality access, or replace instructions from the circuit operator, ticket provider or local authorities.
      </StatusNotice>
    </section>
  );
}
