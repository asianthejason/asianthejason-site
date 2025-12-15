// app/api/ftc-scout/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getScoutEventsForSeason } from "@/lib/ftcScout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seasonParam = searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : 2025;

  if (!Number.isFinite(season)) {
    return NextResponse.json(
      { ok: false, error: "Invalid season parameter" },
      { status: 400 }
    );
  }

  try {
    const events = await getScoutEventsForSeason(season);
    return NextResponse.json({ ok: true, season, events });
  } catch (err: any) {
    console.error("Error in /api/ftc-scout/events", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ?? "Failed to load FTCScout events. See server logs.",
      },
      { status: 500 }
    );
  }
}
