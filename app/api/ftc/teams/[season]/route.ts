// app/api/ftc/teams/[season]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllFtcTeamsForSeason, type FtcTeam } from "@/lib/ftcEvents";

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
  request: NextRequest,
  context: { params: Promise<{ season: string }> }
) {
  // In Next 16 with typed routes, params is a Promise
  const { season } = await context.params;

  const seasonNumber = Number(season);
  if (!Number.isFinite(seasonNumber)) {
    return NextResponse.json(
      { ok: false, error: "Invalid season value" },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const countryParam = url.searchParams.get("country");
  const countryFilter = countryParam?.toString().trim() || "";

  try {
    const rawTeams = await getAllFtcTeamsForSeason(seasonNumber);
    let teams = filterRealTeams(rawTeams);

    if (countryFilter) {
      teams = teams.filter((t) => {
        const c = (t.country ?? "").toString().trim();
        return c === countryFilter;
      });
    }

    const sorted = sortTeams(teams);

    return NextResponse.json({ ok: true, teams: sorted });
  } catch (error: any) {
    console.error("Error in /api/ftc/teams/[season]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load FTC teams",
      },
      { status: 500 }
    );
  }
}
