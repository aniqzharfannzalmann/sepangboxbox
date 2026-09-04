import { SectionLabel } from "@/components/ui/primitives";

/**
 * What a panel shows when the active source cannot supply it.
 *
 * This is the visible half of the adapter design. Tyre stints, the pit log and
 * race control all exist in the UI and all say plainly why they are empty, so
 * the page reads as complete-but-limited rather than broken — and the day an
 * OpenF1 key is added they fill in without any layout changing.
 */
export function UnsupportedPanel({
  title,
  reason,
}: {
  title: string;
  reason: string;
}) {
  return (
    <section className="border border-hairline p-md">
      <SectionLabel>{title}</SectionLabel>
      <p className="text-body-sm text-muted mt-xs max-w-[42ch]">{reason}</p>
    </section>
  );
}
