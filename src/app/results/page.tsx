import { Container, SectionLabel } from "@/components/ui/primitives";

export const metadata = { title: "Results" };

export default function ResultsPage() {
  return (
    <Container className="py-xxl">
      <SectionLabel>2026 season</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Results</h1>
      <p className="text-body-md text-body mt-sm">Phase 2.</p>
    </Container>
  );
}
