import { Button } from "@/components/ui/Button";
import { Container, SectionLabel } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Container className="py-xxl">
      <SectionLabel>404</SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Nothing here</h1>
      <p className="text-body-md text-body mt-sm max-w-[52ch]">
        That page does not exist. A round that has not been run yet has no
        results to show.
      </p>

      <div className="flex flex-wrap gap-xs mt-lg">
        <Button href="/">Live hub</Button>
        <Button href="/schedule" variant="outline-on-dark">
          Schedule
        </Button>
        <Button href="/results" variant="outline-on-dark">
          Results
        </Button>
      </div>
    </Container>
  );
}
