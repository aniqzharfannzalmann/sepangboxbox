import { Container, SectionLabel } from "@/components/ui/primitives";

export const metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <Container className="py-xxl">
      <SectionLabel>Malaysia Time</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Schedule</h1>
      <p className="text-body-md text-body mt-sm">Phase 1.</p>
    </Container>
  );
}
