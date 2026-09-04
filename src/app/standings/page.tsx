import { Container, SectionLabel } from "@/components/ui/primitives";

export const metadata = { title: "Standings" };

export default function StandingsPage() {
  return (
    <Container className="py-xxl">
      <SectionLabel>Championship</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Standings</h1>
      <p className="text-body-md text-body mt-sm">Phase 1.</p>
    </Container>
  );
}
