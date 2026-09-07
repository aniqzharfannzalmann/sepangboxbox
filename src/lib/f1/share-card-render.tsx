import type { ShareCardStatus, ShareableResultCard } from "./share-card";
import { teamHex } from "./team-colours";

const CANVAS = "#181818";
const WHITE = "#ffffff";
const MUTED = "#a3a3a3";
const PRIMARY = "#da291c";
const PENDING = "#f3b63f";

/*
 * Hex lives here rather than in globals.css, against the house rule, because
 * Satori resolves no CSS variables and no Tailwind — an ImageResponse tree is
 * inline styles or nothing. These four track the tokens of the same name.
 */
const STATUS_LABEL: Record<ShareCardStatus, string> = {
  official: "OFFICIAL CLASSIFICATION",
  provisional: "PROVISIONAL CLASSIFICATION",
  unpublished: "RESULT NOT PUBLISHED YET",
  unavailable: "RESULT UNAVAILABLE",
};

/* What stands where the winner's name goes when there is no winner to name. */
const NO_WINNER: Record<ShareCardStatus, string> = {
  official: "Not classified",
  provisional: "Not classified",
  unpublished: "Awaiting classification",
  unavailable: "Could not be loaded",
};

/* The same distinction, in the podium column. */
const NO_PODIUM: Record<ShareCardStatus, string> = {
  official: "Not classified",
  provisional: "Not classified",
  unpublished: "Not published",
  unavailable: "Unavailable",
};

export function ShareCardRender({ card }: { card: ShareableResultCard }) {
  const accent = card.winner ? teamHex(card.winner.constructorId) ?? PRIMARY : PRIMARY;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CANVAS, color: WHITE, padding: 64, fontFamily: "Inter" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 8, height: 34, background: PRIMARY }} />
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>SEPANG BOX BOX</div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: MUTED }}>{`${card.season} · ROUND ${card.round}`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
        <div style={{ fontSize: 24, color: MUTED }}>{card.circuitName}</div>
        <div style={{ fontSize: 42, fontWeight: 700, marginTop: 8 }}>{card.raceName}</div>
        <div style={{ display: "flex", fontSize: 18, color: card.status === "official" ? MUTED : PENDING, marginTop: 8 }}>{STATUS_LABEL[card.status]}</div>
      </div>
      <div style={{ display: "flex", flex: 1, gap: 44, alignItems: "center", marginTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 420, borderLeft: `10px solid ${accent}`, paddingLeft: 24 }}>
          <div style={{ fontSize: 18, color: MUTED, letterSpacing: 2 }}>WINNER</div>
          <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8 }}>{card.winner?.name ?? NO_WINNER[card.status]}</div>
          <div style={{ fontSize: 24, color: MUTED, marginTop: 6 }}>{card.winner?.constructorName ?? ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
          <div style={{ fontSize: 18, color: MUTED, letterSpacing: 2 }}>PODIUM</div>
          {card.podium.map((driver) => <div key={driver.id} style={{ display: "flex", fontSize: 24 }}><span style={{ width: 48, color: driver.position === 1 ? PRIMARY : WHITE }}>{`P${driver.position}`}</span><span>{driver.name}</span></div>)}
          {card.podium.length === 0 && <div style={{ fontSize: 24, color: MUTED }}>{NO_PODIUM[card.status]}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 310, gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 16, color: MUTED, letterSpacing: 1 }}>FASTEST LAP</div><div style={{ fontSize: 21, marginTop: 6 }}>{card.fastestLap ? `${card.fastestLap.driverName} · ${card.fastestLap.time}` : "Unavailable"}</div></div>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 16, color: MUTED, letterSpacing: 1 }}>BIGGEST MOVER</div><div style={{ fontSize: 21, marginTop: 6 }}>{card.biggestMover ? `${card.biggestMover.driverName} · ${card.biggestMover.direction === "gained" ? "+" : "-"}${card.biggestMover.places} places` : "Unavailable"}</div></div>
        </div>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid #444", paddingTop: 16, fontSize: 16, color: MUTED }}>{card.sourceDisclaimer}</div>
    </div>
  );
}
