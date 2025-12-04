// app/api/ftc/events/[season]/[eventCode]/matches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEventMatchesForTeam } from "@/lib/ftcEvents";

/**
 * Fetch ALL qualification matches for an event (no team filter) from the
 * official FTC Events API.
 */
async function fetchEventQualificationMatches(
  season: number,
  eventCode: string
): Promise<any[]> {
  const username = process.env.FTC_API_USER;
  const apiKey = process.env.FTC_API_KEY;

  if (!username || !apiKey) {
    throw new Error("FTC API credentials (FTC_API_USER / FTC_API_KEY) are not set");
  }

  const url = `https://ftc-api.firstinspires.org/v2.0/${season}/matches/${encodeURIComponent(
    eventCode
  )}?tournamentLevel=qualification`;

  const res = await fetch(url, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64"),
    },
    // cache on the server a bit so repeated opens of the modal are fast
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(
      `FTC Events /matches request failed with status ${res.status}`
    );
  }

  const data = (await res.json()) as { matches?: any[] };
  return data.matches ?? [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { season: string; eventCode: string } }
) {
  try {
    const { season: seasonStr, eventCode } = params;

    const url = new URL(req.url);
    const teamNumberParam = url.searchParams.get("teamNumber");

    const season = Number(seasonStr);
    if (!Number.isFinite(season)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season" },
        { status: 400 }
      );
    }

    let matches: any[] = [];
    let teamNumber: number | undefined;

    // === Mode 1: team-specific (existing accordion use) ===
    if (teamNumberParam !== null) {
      teamNumber = Number(teamNumberParam);
      if (!Number.isFinite(teamNumber)) {
        return NextResponse.json(
          { ok: false, error: "Invalid teamNumber" },
          { status: 400 }
        );
      }

      matches = await getEventMatchesForTeam(season, eventCode, teamNumber);
    }
    // === Mode 2: event-wide quals (event-info modal) ===
    else {
      matches = await fetchEventQualificationMatches(season, eventCode);
    }

    return NextResponse.json({
      ok: true,
      season,
      eventCode,
      ...(teamNumber !== undefined ? { teamNumber } : {}),
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
