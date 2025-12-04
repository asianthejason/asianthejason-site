// app/api/ftc/team/[teamNumber]/seasons/[season]/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTeamEventsForSeason } from "@/lib/ftcEvents";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ teamNumber: string; season: string }> }
) {
  try {
    const { teamNumber: teamStr, season: seasonStr } = await params;

    const teamNumber = Number(teamStr);
    const season = Number(seasonStr);

    if (!Number.isFinite(teamNumber) || !Number.isFinite(season)) {
      return NextResponse.json(
        { ok: false, error: "Invalid teamNumber or season" },
        { status: 400 }
      );
    }

    const events = await getTeamEventsForSeason(season, teamNumber);

    return NextResponse.json({
      ok: true,
      teamNumber,
      season,
      events,
    });
  } catch (err) {
    console.error(
      "[api/ftc/team/[teamNumber]/seasons/[season]/events] Error fetching events:",
      err
    );
    return NextResponse.json(
      { ok: false, error: "Failed to fetch team events for season" },
      { status: 500 }
    );
  }
}
