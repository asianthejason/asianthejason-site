// app/api/ftc/teams/[season]/route.ts
import { NextResponse } from "next/server";
import { getAllFtcTeamsForSeason } from "@/lib/ftcEvents";
import type { FtcTeam } from "@/lib/ftcEvents";

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

export async function GET(
  _req: Request,
  { params }: { params: { season: string } }
) {
  const seasonNum = Number(params.season);

  if (!Number.isFinite(seasonNum)) {
    return NextResponse.json(
      { ok: false, error: "Invalid season." },
      { status: 400 }
    );
  }

  try {
    const rawTeams = await getAllFtcTeamsForSeason(seasonNum);
    const teams = sortTeams(filterRealTeams(rawTeams));

    return NextResponse.json({ ok: true, teams });
  } catch (err: any) {
    console.error("Error loading FTC teams in API", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ?? "Unknown error loading FTC data.",
      },
      { status: 500 }
    );
  }
}
