// app/api/ftc/team/[teamNumber]/seasons/route.ts
import { NextResponse } from "next/server";
import { getTeamSeasonsList } from "@/lib/ftcEvents";

export async function GET(
  req: Request,
  { params }: { params: { teamNumber: string } }
) {
  try {
    const teamNumber = Number(params.teamNumber);

    if (!Number.isFinite(teamNumber)) {
      return NextResponse.json(
        { ok: false, error: "Invalid teamNumber" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const rookieYearParam = url.searchParams.get("rookieYear");
    const currentSeasonParam = url.searchParams.get("currentSeason");

    const rookieYear =
      rookieYearParam && !Number.isNaN(Number(rookieYearParam))
        ? Number(rookieYearParam)
        : null;

    const currentSeason =
      currentSeasonParam && !Number.isNaN(Number(currentSeasonParam))
        ? Number(currentSeasonParam)
        : new Date().getFullYear();

    const seasons = await getTeamSeasonsList(
      teamNumber,
      rookieYear,
      currentSeason
    );

    return NextResponse.json({
      ok: true,
      teamNumber,
      seasons,
    });
  } catch (err) {
    console.error(
      "[api/ftc/team/[teamNumber]/seasons] Error fetching seasons:",
      err
    );
    return NextResponse.json(
      { ok: false, error: "Failed to fetch team seasons" },
      { status: 500 }
    );
  }
}
