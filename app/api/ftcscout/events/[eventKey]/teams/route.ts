// app/api/ftc-scout/events/[eventKey]/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getScoutTeamsForEvent } from "@/lib/ftcScout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Next.js 16 route handlers type `context.params` as a Promise in strict mode.
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventKey: string }> }
) {
  const { eventKey } = await context.params;

  const { searchParams } = new URL(req.url);
  const seasonParam = searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : 2025;

  if (!eventKey) {
    return NextResponse.json(
      { ok: false, error: "Missing eventKey path parameter" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(season)) {
    return NextResponse.json(
      { ok: false, error: "Invalid season parameter" },
      { status: 400 }
    );
  }

  try {
    const teams = await getScoutTeamsForEvent(season, eventKey);
    return NextResponse.json({ ok: true, season, eventKey, teams });
  } catch (err: any) {
    console.error("Error in /api/ftc-scout/events/[eventKey]/teams", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ??
          "Failed to load FTCScout team performance for this event.",
      },
      { status: 500 }
    );
  }
}
