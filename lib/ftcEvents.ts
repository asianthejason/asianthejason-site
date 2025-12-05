// lib/ftcEvents.ts
const FTC_API_BASE = "https://ftc-api.firstinspires.org/v2.0";

const FTC_USERNAME = process.env.FTC_API_USERNAME;
const FTC_TOKEN = process.env.FTC_API_TOKEN;

if (!FTC_USERNAME || !FTC_TOKEN) {
  // Don't throw here — Next will run this on build; we’ll surface
  // a nicer error in API routes instead.
  console.warn(
    "[ftcEvents] Missing FTC_API_USERNAME or FTC_API_TOKEN environment variables."
  );
}

async function ftcFetch<T>(
  path: string,
  query: Record<string, string | number | undefined> = {}
): Promise<T> {
  if (!FTC_USERNAME || !FTC_TOKEN) {
    throw new Error(
      "FTC API credentials not configured. Set FTC_API_USERNAME and FTC_API_TOKEN."
    );
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) {
      params.append(k, String(v));
    }
  }

  const url =
    FTC_API_BASE +
    path +
    (params.toString() ? `?${params.toString()}` : "");

  const auth = Buffer.from(`${FTC_USERNAME}:${FTC_TOKEN}`).toString("base64");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    // Be explicit this is server-side only.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `FTC API error ${res.status} ${res.statusText} for ${url}: ${body}`
    );
  }

  return (await res.json()) as T;
}

/* ===================== Base team types ===================== */

export interface FtcTeam {
  teamNumber: number;
  displayTeamNumber?: string | null;
  nameFull?: string | null;
  nameShort?: string | null;
  city?: string | null;
  stateProv?: string | null;
  country?: string | null;
  rookieYear?: number | null;
  // ... other fields available but we don't need them yet
}

export interface FtcTeamApiResponse {
  teams: FtcTeam[];
  // paging fields etc.
}

/**
 * Get all teams for a season.
 * Uses: GET /v2.0/{season}/teams with paging.
 */
export async function getAllFtcTeamsForSeason(
  season: number,
  opts?: { countryCode?: string | null }
): Promise<FtcTeam[]> {
  const pageSize = 250;
  const countryCode = opts?.countryCode ?? null;

  async function loadAll(
    extraQuery: Record<string, string | number | undefined> = {}
  ): Promise<FtcTeam[]> {
    let page = 1;
    const all: FtcTeam[] = [];

    // The /teams endpoint pages; we loop until less than pageSize is returned
    while (true) {
      const data = await ftcFetch<FtcTeamApiResponse>(`/${season}/teams`, {
        page,
        size: pageSize,
        ...extraQuery,
      });

      if (!data.teams?.length) break;

      all.push(...data.teams);
      if (data.teams.length < pageSize) break;
      page += 1;
    }

    return all;
  }

  let all: FtcTeam[] = [];

  if (countryCode) {
    try {
      // Prefer asking the FTC Events API for just this country if supported.
      all = await loadAll({ countryCode: countryCode });
    } catch (err) {
      console.warn(
        `[ftcEvents] Failed to load teams with country filter "${countryCode}". Falling back to all teams.`,
        err
      );
      all = await loadAll();
    }
  } else {
    all = await loadAll();
  }

  // Filter out phantom 999xx entries that are blank
  return all.filter((t) => t.teamNumber && t.teamNumber < 99900);
}/* ===================== Drilldown types ===================== */

/**
 * A single event that a team attends in a given season.
 */
export interface FtcTeamEvent {
  eventCode: string;
  eventName: string;
  city?: string | null;
  stateProv?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  // optional: type, region, venue, etc, can be added later if needed
}

/**
 * All events for a given season for one team.
 * This is what we’ll use for the "Year" → "Events" accordion level.
 */
export interface FtcTeamSeason {
  season: number;
  events: FtcTeamEvent[];
}

/**
 * Match types for UI drilldown.
 * These are intentionally loose so changes in the FTC API don't break compilation.
 * We can tighten these interfaces later once you're happy with the schema you use in the UI.
 */
export type FtcMatchSummary = any; // one row in the "matches" list for an event
export type FtcMatchDetail = any; // full scoring breakdown for a single match

// Backwards-compatible aliases (if any code already imports these names)
export type FtcMatch = FtcMatchSummary;
export type FtcMatchScores = FtcMatchDetail;

/* ===================== Drilldown helpers ===================== */

/**
 * Events that a team attended in a given season.
 * Uses: GET /v2.0/{season}/events?teamNumber=XXXX
 */
export async function getTeamEventsForSeason(
  season: number,
  teamNumber: number
): Promise<FtcTeamEvent[]> {
  const data = await ftcFetch<{ events: any[] }>(`/${season}/events`, {
    teamNumber,
  });

  const events = data.events ?? [];

  return events.map((e) => {
    // Try multiple possible fields for the event code
    const rawCode =
      e.eventCode ??
      e.code ??
      e.codeShort ??
      e.tournamentCode ??
      e.eventCodeShort ??
      e.id;

    const eventCode = (rawCode ?? "").toString().trim();

    return {
      eventCode,
      eventName: e.eventName ?? e.name ?? e.description ?? "Unnamed event",
      city: e.city,
      stateProv: e.stateProv,
      country: e.country,
      startDate: e.startDate,
      endDate: e.endDate,
    } as FtcTeamEvent;
  });
}


/**
 * Convenience: get multiple seasons of events for a team.
 * For now we build seasons from rookieYear..currentSeason.
 * You can tighten this later if you have a dedicated "team history" endpoint.
 *
 * This is perfect for the "click team row → load all seasons (years) with events"
 * behavior in your accordion.
 */
export async function getTeamSeasonsWithEvents(
  teamNumber: number,
  rookieYear: number | null | undefined,
  currentSeason: number
): Promise<FtcTeamSeason[]> {
  const firstSeason = rookieYear ?? currentSeason;
  const seasons: FtcTeamSeason[] = [];

  for (let season = firstSeason; season <= currentSeason; season++) {
    try {
      const events = await getTeamEventsForSeason(season, teamNumber);
      if (events.length > 0) {
        seasons.push({ season, events });
      }
    } catch (err) {
      // Ignore seasons that error out (e.g. pre-FTC Events era)
      console.warn(
        `[ftcEvents] Failed to load events for team ${teamNumber} in season ${season}:`,
        err
      );
    }
  }

  return seasons;
}

/**
 * Simple helper if you ever only need the list of seasons that have events.
 * (Not strictly required for the accordion, but convenient for API routes.)
 */
export async function getTeamSeasonsList(
  teamNumber: number,
  rookieYear: number | null | undefined,
  currentSeason: number
): Promise<number[]> {
  const seasonsWithEvents = await getTeamSeasonsWithEvents(
    teamNumber,
    rookieYear,
    currentSeason
  );
  return seasonsWithEvents.map((s) => s.season);
}

/**
 * Matches for a team at a given event.
 * Uses: GET /v2.0/{season}/matches/{eventCode}?teamNumber=XXXX
 *
 * This is what you’ll call for the "Event" → "Matches" dropdown level.
 */
export async function getEventMatchesForTeam(
  season: number,
  eventCode: string,
  teamNumber: number
): Promise<FtcMatchSummary[]> {
  const data = await ftcFetch<{
    matches?: any[];
    Matches?: any[];
  }>(`/${season}/matches/${encodeURIComponent(eventCode)}`, {
    teamNumber,
  });

  // Check docs for exact field name; most FIRST APIs expose an array like data.matches
  return data.matches ?? data.Matches ?? [];
}

/**
 * Score details for a specific match at an event.
 * Uses: GET /v2.0/{season}/scores/{eventCode}/{tournamentLevel}?matchNumber=XX
 *
 * This powers the innermost "Match" → "Scoring details" dropdown.
 */
export async function getMatchScoreDetails(
  season: number,
  eventCode: string,
  tournamentLevel: string, // 'qual' or 'playoff' (or whatever the API uses)
  matchNumber: number
): Promise<FtcMatchDetail | null> {
  const data = await ftcFetch<any>(
    `/${season}/scores/${encodeURIComponent(eventCode)}/${tournamentLevel}`,
    { matchNumber }
  );

  // The response contains multiple matches for that level; filter down.
  const allMatches =
    data.matches ??
    data.Matches ??
    data.matchScores ??
    data.MatchScores ??
    [];

  const found =
    allMatches.find(
      (m: any) =>
        m.matchNumber === matchNumber || m.MatchNumber === matchNumber
    ) ?? null;

  return found ?? null;
}

/* ===================== Helper aliases for nicer names ===================== */

/**
 * Aliases with names that match how we'll probably think about the API routes
 * in the app layer: seasons → events → matches → match details.
 */
export const getMatchesForTeamEvent = getEventMatchesForTeam;
export const getMatchDetails = getMatchScoreDetails;
