import { Button } from "@/components/ui/Button";
import {
  BadgePill,
  Container,
  SectionLabel,
  SpecCell,
} from "@/components/ui/primitives";

/*
 * Phase 0 placeholder. This exists to prove the token set renders end-to-end;
 * Phase 1 replaces it with the real Live Hub (countdown + standings snapshot).
 */
export default function Home() {
  return (
    <>
      {/* hero-band-cinema — photography lands in Phase 3; the band is here now. */}
      <section className="bg-canvas border-b border-hairline">
        <Container className="py-xxl">
          <BadgePill tone="primary">Round 16</BadgePill>
          <h1 className="text-display-mega text-ink mt-sm max-w-[16ch]">
            Bahrain Grand Prix in Malaysia
          </h1>
          <p className="text-body-md text-body mt-sm max-w-[52ch]">
            Formula 1 returns to Sepang International Circuit for the first
            time since 2017. Live timing, championship standings and the full
            weekend schedule in Malaysia Time.
          </p>
          <div className="flex flex-wrap gap-xs mt-lg">
            <Button href="/schedule">View schedule</Button>
            <Button href="/standings" variant="outline-on-dark">
              Standings
            </Button>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-xxl">
          <SectionLabel>Race weekend</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg mt-md">
            <SpecCell value="02" label="October — FP1, FP2" />
            <SpecCell value="03" label="October — FP3, Qualifying" />
            <SpecCell value="04" label="October — Race, 15:00 MYT" accent />
          </div>
        </Container>
      </section>
    </>
  );
}
