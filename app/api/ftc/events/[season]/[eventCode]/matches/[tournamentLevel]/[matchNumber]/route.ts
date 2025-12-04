// app/api/ftc/events/[season]/[eventCode]/matches/[tournamentLevel]/[matchNumber]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMatchScoreDetails } from "@/lib/ftcEvents";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      season: string;
      eventCode: string;
      tournamentLevel: string;
      matchNumber: string;
    }>;
  }
) {
  try {
    const {
      season: seasonStr,
      eventCode,
      tournamentLevel,
      matchNumber: matchNumberStr,
    } = await params;

    const season = Number(seasonStr);
    const matchNumber = Number(matchNumberStr);

    if (!Number.isFinite(season) || !Number.isFinite(matchNumber)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season or matchNumber" },
        { status: 400 }
      );
    }

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
