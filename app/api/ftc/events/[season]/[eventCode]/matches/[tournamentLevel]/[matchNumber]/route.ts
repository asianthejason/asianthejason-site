// app/api/ftc/events/[season]/[eventCode]/matches/[tournamentLevel]/[matchNumber]/route.ts
import { NextResponse } from "next/server";
import { getMatchScoreDetails } from "@/lib/ftcEvents";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: {
      season: string;
      eventCode: string;
      tournamentLevel: string;
      matchNumber: string;
    };
  }
) {
  try {
    const season = Number(params.season);
    const matchNumber = Number(params.matchNumber);

    if (!Number.isFinite(season) || !Number.isFinite(matchNumber)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season or matchNumber" },
        { status: 400 }
      );
    }

    const { eventCode, tournamentLevel } = params;

    const match = await getMatchScoreDetails(
      season,
      eventCode,
      tournamentLevel,
      matchNumber
    );

    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error: "Match not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      season,
      eventCode,
      tournamentLevel,
      matchNumber,
      match,
    });
  } catch (err) {
    console.error(
      "[api/ftc/events/[season]/[eventCode]/matches/[tournamentLevel]/[matchNumber]] Error fetching match details:",
      err
    );
    return NextResponse.json(
      { ok: false, error: "Failed to fetch match details" },
      { status: 500 }
    );
  }
}
