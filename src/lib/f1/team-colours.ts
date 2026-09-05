/**
 * Team colours, keyed on the Ergast/Jolpica constructor id.
 *
 * Every F1 app identifies teams by colour, and a hex value is not a trademark
 * the way a logo is — so this is the part of team branding that can simply be
 * used.
 *
 * Used as a stripe beside a row rather than as text. That is both how the real
 * timing screens do it and how it stays accessible: several of these (Red Bull
 * navy, Ferrari red, Aston green) fall below 4.5:1 against the near-black
 * canvas and would fail as body text, but a decorative rule carries no contrast
 * requirement and the label next to it stays in ink.
 *
 * Neither Jolpica nor F1DB publishes these, so they are maintained here.
 */

export interface TeamColour {
  /** Livery colour. */
  hex: string;
  /** True where the value still needs confirming against the real livery. */
  provisional?: boolean;
}

const TEAM_COLOURS: Record<string, TeamColour> = {
  mercedes: { hex: "#27F4D2" },
  ferrari: { hex: "#E8002D" },
  mclaren: { hex: "#FF8000" },
  red_bull: { hex: "#3671C6" },
  rb: { hex: "#6692FF" },
  alpine: { hex: "#00A1E8" },
  haas: { hex: "#B6BABD" },
  williams: { hex: "#64C4FF" },
  aston_martin: { hex: "#229971" },

  // Audi and Cadillac are new entries for 2026 and these two are best guesses
  // from each marque's brand identity rather than a confirmed F1 livery. They
  // are flagged so a wrong colour is a known gap rather than a silent error —
  // correct the hex here and every table follows.
  audi: { hex: "#00E700", provisional: true },
  cadillac: { hex: "#C8102E", provisional: true },
};

/** Null for a constructor with no colour on file — the UI omits the stripe. */
export function teamColour(constructorId: string): TeamColour | null {
  return TEAM_COLOURS[constructorId] ?? null;
}

export function teamHex(constructorId: string): string | null {
  return TEAM_COLOURS[constructorId]?.hex ?? null;
}

/** Ids carrying a colour, for the contract test to check against the grid. */
export function colouredTeamIds(): string[] {
  return Object.keys(TEAM_COLOURS);
}
