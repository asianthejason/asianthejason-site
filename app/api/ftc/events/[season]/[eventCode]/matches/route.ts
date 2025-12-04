// app/api/ftc/events/[season]/[eventCode]/matches/route.ts
import { NextResponse } from "next/server";
import { getEventMatchesForTeam } from "@/lib/ftcEvents";

export async function GET(
  req: Request,
  { params }: { params: { season: string; eventCode: string } }
) {
  try {
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

    const season = Number(params.season);
    if (!Number.isFinite(season)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season" },
        { status: 400 }
      );
    }

    const eventCode = params.eventCode;

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
