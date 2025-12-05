// app/api/ftc/events/[season]/[eventCode]/matches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEventMatchesForTeam } from "@/lib/ftcEvents";

/**
 * Fetch ALL qualification matches for an event (no team filter) from
 * the official FTC Events API. Used by the "Event info" modal.
 */
async function fetchEventQualificationMatches(
  season: number,
  eventCode: string
): Promise<any[]> {
  // Use the same env vars as lib/ftcEvents.ts
  const username = process.env.FTC_API_USERNAME;
  const apiKey = process.env.FTC_API_TOKEN;

  if (!username || !apiKey) {
    throw new Error(
      "FTC API credentials (FTC_API_USERNAME / FTC_API_TOKEN) are not set"
    );
  }

  const url = `https://ftc-api.firstinspires.org/v2.0/${season}/matches/${encodeURIComponent(
    eventCode
  )}?tournamentLevel=qualification`;

  const res = await fetch(url, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64"),
    },
    // allow some caching on the server
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(
      `FTC Events /matches request failed with status ${res.status}`
    );
  }

  const data = (await res.json()) as { matches?: any[]; Matches?: any[] };
  return data.matches ?? data.Matches ?? [];
}

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
    // === Mode 2: event-wide quals (event-info modal, no teamNumber) ===
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
