// app/api/ftc/events/[season]/[eventCode]/rankings/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch event rankings from the FTC Events API.
 * Used by the "Event info" modal for the rankings table.
 */
async function fetchEventRankings(
  season: number,
  eventCode: string
): Promise<any[]> {
  const username = process.env.FTC_API_USER;
  const apiKey = process.env.FTC_API_KEY;

  if (!username || !apiKey) {
    throw new Error(
      "FTC API credentials (FTC_API_USER / FTC_API_KEY) are not set"
    );
  }

  const url = `https://ftc-api.firstinspires.org/v2.0/${season}/rankings/${encodeURIComponent(
    eventCode
  )}`;

  const res = await fetch(url, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64"),
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(
      `FTC Events /rankings request failed with status ${res.status}`
    );
  }

  const data = (await res.json()) as { rankings?: any[] };
  return data.rankings ?? [];
}

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ season: string; eventCode: string }> }
) {
  try {
    const { season: seasonStr, eventCode } = await params;

    const season = Number(seasonStr);
    if (!Number.isFinite(season)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season" },
        { status: 400 }
      );
    }

    const rankings = await fetchEventRankings(season, eventCode);

    return NextResponse.json({
      ok: true,
      season,
      eventCode,
      rankings,
    });
  } catch (err) {
    console.error(
      "[api/ftc/events/[season]/[eventCode]/rankings] Error fetching rankings:",
      err
    );
    return NextResponse.json(
      { ok: false, error: "Failed to fetch rankings for event" },
      { status: 500 }
    );
  }
}
