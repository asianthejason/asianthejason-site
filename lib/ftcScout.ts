// lib/ftcScout.ts
const FTC_SCOUT_BASE = "https://api.ftcscout.org/rest/v1";

/**
 * Generic helper to call the FTCScout REST API.
 *
 * NOTE: You MUST adjust the `path` and query parameters to match
 * the official FTCScout REST docs at https://ftcscout.org/api.
 */
async function scoutFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(FTC_SCOUT_BASE + path);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const res = await fetch(url.toString(), {
    // FTCScout REST docs say no special headers needed
    method: "GET",
    // Make sure this is not statically cached forever
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `FTCScout request failed (${res.status}): ${
        text || res.statusText || "Unknown error"
      }`
    );
  }

  return (await res.json()) as T;
}

/* ========= Public types you’ll use on the frontend ========= */

export interface ScoutEvent {
  eventKey: string; // e.g. "CAONCMP"
  name: string;
  season: number;
  startDate?: string | null;
  endDate?: string | null;
  country?: string | null;
  stateProv?: string | null;
  city?: string | null;
  region?: string | null; // league / region if available
}

export interface ScoutTeamPerformance {
  teamNumber: number;
  teamName?: string | null;
  rank?: number | null;
  matchesPlayed?: number | null;
  wins?: number | null;
  losses?: number | null;
  ties?: number | null;
  opr?: number | null;
  dpr?: number | null;
  ccwm?: number | null;
  // Add more metrics as you discover them in the API
}

/* ========= Server-side functions (used in API routes) ========= */

/**
 * Fetch all events for a given season from FTCScout.
 *
 * TODO: Update `path` + response shape to match FTCScout docs.
 */
export async function getScoutEventsForSeason(
  season: number
): Promise<ScoutEvent[]> {
  // ❗ TODO: make sure this path and query param match their docs.
  // Example guess:
  //   GET /events?season=2024
  const raw = await scoutFetch<any>("/events", { season });

  const eventsArray: any[] = Array.isArray(raw)
    ? raw
    : raw.events || raw.data || [];

  const mapped: ScoutEvent[] = eventsArray
    .map((e: any): ScoutEvent | null => {
      const eventKey =
        e.code || e.eventCode || e.event_key || e.eventKey || null;
      const name = e.name || e.eventName || e.event_name || null;

      if (!eventKey || !name) return null;

      return {
        eventKey,
        name,
        season: e.season ?? season,
        startDate: e.start || e.startDate || e.start_date || null,
        endDate: e.end || e.endDate || e.end_date || null,
        country: e.country || e.countryCode || e.country_code || null,
        stateProv: e.state || e.stateProv || e.state_prov || null,
        city: e.city || null,
        region: e.region || e.league || e.leagueCode || e.region_name || null,
      };
    })
    .filter((e): e is ScoutEvent => e !== null);

  return mapped;
}

/**
 * Fetch team performance / rankings for a single event.
 *
 * TODO: Update path + response shape to match FTCScout docs.
 */
export async function getScoutTeamsForEvent(
  season: number,
  eventKey: string
): Promise<ScoutTeamPerformance[]> {
  // ❗ TODO: verify the correct path in FTCScout docs.
  // Example guesses:
  //   /events/{eventKey}/teams?season=2024
  //   /events/{season}/{eventKey}/rankings
  const raw = await scoutFetch<any>(`/events/${eventKey}/teams`, { season });

  const teamsArray: any[] = Array.isArray(raw)
    ? raw
    : raw.teams || raw.data || raw.rankings || [];

  const mapped: ScoutTeamPerformance[] = teamsArray
    .map((t: any): ScoutTeamPerformance | null => {
      const teamNum =
        t.teamNumber ||
        t.teamNum ||
        t.team_number ||
        t.team?.teamNumber ||
        t.team?.team_number ||
        null;

      if (!teamNum) return null;

      return {
        teamNumber: Number(teamNum),
        teamName:
          t.teamName ||
          t.team_name ||
          t.team?.teamName ||
          t.team?.team_name ||
          null,
        rank: t.rank ?? t.ranking ?? t.seed ?? null,
        matchesPlayed: t.played ?? t.matchesPlayed ?? t.games_played ?? null,
        wins: t.wins ?? t.w ?? null,
        losses: t.losses ?? t.l ?? null,
        ties: t.ties ?? t.t ?? null,
        opr: t.opr ?? t.offensivePowerRating ?? null,
        dpr: t.dpr ?? t.defensivePowerRating ?? null,
        ccwm: t.ccwm ?? t.combined_rating ?? null,
      };
    })
    .filter((x): x is ScoutTeamPerformance => x !== null);

  return mapped;
}
