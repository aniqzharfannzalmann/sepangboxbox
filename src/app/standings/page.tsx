import {
  ConstructorStandingsTable,
  DriverStandingsTable,
} from "@/components/StandingsTables";
import { Container, Hairline, SectionLabel } from "@/components/ui/primitives";
import {
  getConstructorStandingsSafe,
  getDriverStandingsSafe,
} from "@/lib/f1/standings";

export const metadata = {
  title: "Standings",
  description:
    "2026 Formula 1 drivers' and constructors' championship standings going into the Bahrain Grand Prix in Malaysia at Sepang.",
};

export default async function StandingsPage() {
  const [drivers, constructors] = await Promise.all([
    getDriverStandingsSafe(),
    getConstructorStandingsSafe(),
  ]);

  const round = drivers.data?.round ?? constructors.data?.round;
  const season = drivers.data?.season ?? constructors.data?.season ?? "2026";

  return (
    <Container className="py-xxl">
      <SectionLabel>
        {season} championship{round ? ` · after round ${round}` : ""}
      </SectionLabel>
      <h1 className="text-display-lg text-ink mt-xs">Standings</h1>

      <section className="mt-xl">
        <h2 className="text-display-md text-ink">Drivers</h2>
        <DriverStandingsTable snapshot={drivers.data} />
      </section>

      <Hairline className="my-xxl" />

      <section>
        <h2 className="text-display-md text-ink">Constructors</h2>
        <ConstructorStandingsTable snapshot={constructors.data} />
      </section>
    </Container>
  );
}
