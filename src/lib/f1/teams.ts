import stats from "./team-stats.json";

/**
 * Constructor career records, imported from F1DB.
 *
 * `own` covers the entity racing under this name today. `combined` adds every
 * entry it continued — Aston Martin is a 2021 entity with no wins of its own,
 * but the entry traces back through Racing Point, Force India and Jordan, and
 * showing only the first number would read as a team that has never won.
 */

export interface TeamRecord {
  entries: number;
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  titles: number;
  points: number;
}

export interface TeamLineageEntry {
  id: string;
  name: string;
  record: TeamRecord;
}

export interface TeamStats {
  f1dbId: string;
  name: string;
  fullName: string;
  own: TeamRecord;
  lineage: TeamLineageEntry[];
  combined: TeamRecord;
}

const TEAMS = stats as Record<string, TeamStats>;

export function getTeamStats(constructorId: string): TeamStats | null {
  return TEAMS[constructorId] ?? null;
}

export function allTeamIds(): string[] {
  return Object.keys(TEAMS);
}

/** True where the lineage materially changes the story. */
export function lineageAddsTo(team: TeamStats): boolean {
  return (
    team.lineage.length > 0 &&
    (team.combined.wins > team.own.wins || team.combined.titles > team.own.titles)
  );
}
