import { Container, SectionLabel } from "@/components/ui/primitives";

export const metadata = { title: "Compare drivers" };

export default function ComparePage() {
  return (
    <Container className="py-xxl">
      <SectionLabel>Head to head</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Compare drivers</h1>
      <p className="text-body-md text-body mt-sm">Phase 3.</p>
    </Container>
  );
}
