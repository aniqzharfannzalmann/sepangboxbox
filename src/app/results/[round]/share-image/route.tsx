import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { gatewayRaceResult } from "@/lib/f1/gateway";
import { buildShareableResultCard } from "@/lib/f1/share-card";
import { ShareCardRender } from "@/lib/f1/share-card-render";
import { getSeasonScheduleSafe } from "@/lib/f1/weekend";

export const revalidate = 300;
export const contentType = "image/png";

const size = { width: 1200, height: 630 };
const font = (file: string) => readFile(path.join(process.cwd(), "assets", "fonts", file));

export async function GET(_request: Request, context: { params: Promise<{ round: string }> }) {
  const { round } = await context.params;
  const season = await getSeasonScheduleSafe();
  const weekend = season.data.find((item) => item.round === round);
  const [regular, bold] = await Promise.all([font("Inter-Regular.woff"), font("Inter-Bold.woff")]);

  if (!weekend) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#181818", color: "#fff", fontFamily: "Inter", fontSize: 42 }}>
        Sepang Box Box · Result unavailable
      </div>,
      { ...size, fonts: [{ name: "Inter", data: regular, style: "normal", weight: 400 }, { name: "Inter", data: bold, style: "normal", weight: 700 }] },
    );
  }

  // weekend.season, not season.data[0].season — the round being drawn is the
  // one that decides the year, not whatever happens to sit first in the list.
  const result = (await gatewayRaceResult(weekend.season, round)).data;
  const card = buildShareableResultCard({ result, weekend, nowMs: season.fetchedAtMs });
  return new ImageResponse(<ShareCardRender card={card} />, {
    ...size,
    fonts: [
      { name: "Inter", data: regular, style: "normal", weight: 400 },
      { name: "Inter", data: bold, style: "normal", weight: 700 },
    ],
  });
}
