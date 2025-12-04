// app/api/ftc/events/[season]/[eventCode]/matches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEventMatchesForTeam } from "@/lib/ftcEvents";

export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ season: string; eventCode: string }> }
) {
  try {
    const { season: seasonStr, eventCode } = await params;

    const url = new URL(req.url);
    const teamNumberParam = url.searchParams.get("teamNumber");

    if (!teamNumberParam) {
      return NextResponse.json(
        { ok: false, error: "Missing teamNumber query parameter" },
        { status: 400 }
      );
    }

    const teamNumber = Number(teamNumberParam);
    if (!Number.isFinite(teamNumber)) {
      return NextResponse.json(
        { ok: false, error: "Invalid teamNumber" },
        { status: 400 }
      );
    }

    const season = Number(seasonStr);
    if (!Number.isFinite(season)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season" },
        { status: 400 }
      );
    }

    const matches = await getEventMatchesForTeam(
      season,
      eventCode,
      teamNumber
    );

    return NextResponse.json({
      ok: true,
      season,
      eventCode,
      teamNumber,
      matches,
    });
  } catch (err) {
    console.error(
      "[api/ftc/events/[season]/[eventCode]/matches] Error fetching matches:",
      err
    );
    return NextResponse.json(
      { ok: false, error: "Failed to fetch matches for event" },
      { status: 500 }
    );
  }
}
