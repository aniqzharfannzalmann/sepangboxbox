import { LiveView } from "@/components/live/LiveView";
import { getTimingSource } from "@/lib/f1/sources";

// Matches the 60s window on the timing fetches; auto-refresh on the client
// cannot surface anything fresher than this.
export const revalidate = 60;

export const metadata = {
  title: "Live timing",
  description:
    "Session timing for the 2026 Bahrain Grand Prix in Malaysia at Sepang International Circuit.",
};

export default async function LivePage() {
  return <LiveView source={getTimingSource()} />;
}
