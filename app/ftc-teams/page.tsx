// app/ftc-teams/page.tsx
import { getAllFtcTeamsForSeason } from "@/lib/ftcEvents";
import type { FtcTeam } from "@/lib/ftcEvents";
import { FtcTeamsShell } from "./FtcTeamsShell";

export const dynamic = "force-dynamic";

const SEASON = 2025;

function sortTeams(teams: FtcTeam[]): FtcTeam[] {
  return [...teams].sort((a, b) => {
    const aNum = a.teamNumber ?? 0;
    const bNum = b.teamNumber ?? 0;
    return aNum - bNum;
  });
}

function filterRealTeams(teams: FtcTeam[]): FtcTeam[] {
  return teams.filter((t) => {
    const num = t.teamNumber ?? 0;

    const nameShort = (t.nameShort ?? "").toString().trim();
    const nameFull = (t.nameFull ?? "").toString().trim();
    const city = (t.city ?? "").toString().trim();
    const state = (t.stateProv ?? "").toString().trim();
    const country = (t.country ?? "").toString().trim();

    const hasName = nameShort !== "" || nameFull !== "";
    const hasLocation = city !== "" || state !== "" || country !== "";

    return num > 0 && (hasName || hasLocation);
  });
}

export default async function FtcTeamsPage() {
  let teams: FtcTeam[] = [];
  let loadError: string | null = null;

  try {
    const rawTeams = await getAllFtcTeamsForSeason(SEASON);
    teams = sortTeams(filterRealTeams(rawTeams));
  } catch (err) {
    console.error("Error loading FTC teams", err);
    loadError =
      err instanceof Error ? err.message : "Unknown error loading FTC data";
  }

  return (
    <FtcTeamsShell season={SEASON} teams={teams} loadError={loadError} />
  );
}
