import { LiveView } from "@/components/live/LiveView";
import { getTimingSource } from "@/lib/f1/sources";

export const metadata = {
  title: "Live timing",
  description:
    "Session timing for the 2026 Bahrain Grand Prix in Malaysia at Sepang International Circuit.",
};

export default async function LivePage() {
  return <LiveView source={getTimingSource()} />;
}
