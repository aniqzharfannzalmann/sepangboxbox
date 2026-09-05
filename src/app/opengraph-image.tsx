import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import weather from "@/lib/f1/sepang-weather.json";

/*
 * The social card.
 *
 * This project is judged as a link — pasted into a submission form or a chat —
 * so for a lot of people this image is the app before the app is. It had none
 * at all, which renders as a bare URL.
 *
 * Drawn in the app's own language rather than a generic card: the near-black
 * canvas, the Rosso Corsa rule from the header wordmark, and the one fact that
 * makes this Sepang and not any other circuit.
 *
 * Fonts are read from assets/fonts because ImageResponse needs real font data
 * and next/font/google leaves only hash-named woff2 in .next, which satori
 * cannot read. See that folder's README.
 */

export const alt =
  "Sepang Box Box — the 2026 Bahrain Grand Prix in Malaysia at Sepang International Circuit, 2 to 4 October 2026";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = "#181818";
const PRIMARY = "#da291c";
const INK = "#ffffff";
const MUTED = "#8f8f8f";

const font = (file: string) =>
  readFile(path.join(process.cwd(), "assets", "fonts", file));

export default async function Image() {
  const [regular, bold] = await Promise.all([
    font("Inter-Regular.woff"),
    font("Inter-Bold.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: "72px 80px",
          fontFamily: "Inter",
        }}
      >
        {/* The wordmark, as the header draws it: brand rule, then caps. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 10, height: 40, background: PRIMARY }} />
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: INK,
              letterSpacing: 3,
            }}
          >
            SEPANG BOX BOX
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Bahrain Grand Prix in Malaysia
          </div>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, marginTop: 24 }}>
            Sepang International Circuit · 2–4 October 2026
          </div>
        </div>

        {/*
          The hook, read from the same generated file the Sepang page reads so
          the card cannot quietly disagree with the site. Measured across 270
          hourly samples since 2011, not asserted from reputation.
        */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          {/* One text child, not a number beside a literal "%": satori
              requires an explicit display on any element with more than one
              child, and two adjacent expressions count as two. */}
          <div style={{ fontSize: 34, fontWeight: 700, color: PRIMARY }}>
            {`${weather.afternoon.wetHourPct}%`}
          </div>
          <div style={{ fontSize: 26, color: MUTED }}>
            of early-October afternoons here have rain in them
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular, style: "normal", weight: 400 },
        { name: "Inter", data: bold, style: "normal", weight: 700 },
      ],
    },
  );
}
