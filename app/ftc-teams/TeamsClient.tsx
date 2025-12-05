// app/ftc-teams/TeamsClient.tsx
"use client";

import { useMemo, useState, useEffect, useCallback, Fragment } from "react";
import type {
  FtcTeam,
  FtcTeamEvent,
  FtcMatch,
  FtcMatchScores,
} from "@/lib/ftcEvents";

type TeamsClientProps = {
  season: number; // current season
  teams: FtcTeam[];
};

type DrilldownState = {
  // Seasons a team has played (years)
  seasons?: number[];
  loadingSeasons: boolean;
  seasonsError?: string | null;

  // Which seasons (years) are expanded
  openSeasons: Record<number, boolean>;

  // Season -> events
  eventsBySeason: Record<number, FtcTeamEvent[] | undefined>;
  loadingEventsBySeason: Record<number, boolean>;
  eventsErrorBySeason: Record<number, string | null | undefined>;

  // Which events are expanded (keyed by "season:eventKey")
  openEvents: Record<string, boolean>;

  // Event -> matches (for this team)
  matchesByEventKey: Record<string, FtcMatch[] | undefined>;
  loadingMatchesByEventKey: Record<string, boolean>;
  matchesErrorByEventKey: Record<string, string | null | undefined>;

  // Match -> score details
  scoresByMatchKey: Record<string, FtcMatchScores | null | undefined>;
  loadingScoresByMatchKey: Record<string, boolean>;
  scoresErrorByMatchKey: Record<string, string | null | undefined>;
};

// Modal state for event info
type EventInfoState = {
  open: boolean;
  seasonYear: number | null;
  eventCode: string | null;
  eventName: string | null;
  city: string | null;
  teamNumber: number | null;
  loading: boolean;
  error?: string | null;
  matches: FtcMatch[];
  rankings: any[];
};

type TeamEventDetailsItem = {
  key: string;
  match: FtcMatch | any;
  score?: FtcMatchScores | null;
};

type TeamEventDetailsState = {
  open: boolean;
  seasonYear: number | null;
  eventCode: string | null;
  eventName: string | null;
  city: string | null;
  teamNumber: number | null;
  teamName: string | null;
  loading: boolean;
  error?: string | null;
  items: TeamEventDetailsItem[];
};
type MatchDetailsState = {
  open: boolean;
  seasonYear: number | null;
  eventCode: string | null;
  eventName: string | null;
  city: string | null;
  matchLabel: string | null;
  loading: boolean;
  error?: string | null;
  score: FtcMatchScores | null;
};



function getDisplayName(t: FtcTeam): string {
  const shortName = (t.nameShort ?? "").toString().trim();
  const fullName = (t.nameFull ?? "").toString().trim();
  return shortName || fullName || "";
}

function eventKey(seasonYear: number, eventKeyPart: string) {
  return `${seasonYear}:${eventKeyPart}`;
}

function matchKey(
  seasonYear: number,
  eventCode: string,
  tournamentLevel: string,
  matchNumber: number
) {
  return `${seasonYear}:${eventCode}:${tournamentLevel}:${matchNumber}`;
}

// Build a stable key for UI state even if eventCode is blank
function getEventKeyForState(seasonYear: number, event: FtcTeamEvent): string {
  const rawCode =
    (event.eventCode ?? "").toString().trim() ||
    (event.eventName ?? "").toString().trim() ||
    `${event.city ?? ""}-${event.startDate ?? ""}`;
  return eventKey(seasonYear, rawCode);
}

// Factory to avoid stale-initial-state bugs
function createEmptyDrilldown(): DrilldownState {
  return {
    seasons: undefined,
    loadingSeasons: false,
    seasonsError: null,
    openSeasons: {},
    eventsBySeason: {},
    loadingEventsBySeason: {},
    eventsErrorBySeason: {},
    openEvents: {},
    matchesByEventKey: {},
    loadingMatchesByEventKey: {},
    matchesErrorByEventKey: {},
    scoresByMatchKey: {},
    loadingScoresByMatchKey: {},
    scoresErrorByMatchKey: {},
  };
}

// Helper: find the alliances array wherever it lives in the score payload
function getAlliancesFromScore(score: any): any[] {
  if (!score || typeof score !== "object") return [];

  if (Array.isArray(score.alliances)) {
    return score.alliances;
  }

  // Look through nested properties for an array of objects with "alliance"
  for (const v of Object.values(score)) {
    if (Array.isArray(v)) {
      const match = v.some(
        (x) => x && typeof x === "object" && "alliance" in x
      );
      if (match) return v as any[];
    }
  }

  return [];
}

// Helper: pull alliance team numbers out of a MATCH row (listing)
function getAllianceTeamsFromMatch(match: any): {
  redTeams: number[];
  blueTeams: number[];
} {
  const teamsArray: any[] =
    (Array.isArray(match.teams) && match.teams) ||
    (Array.isArray(match.Teams) && match.Teams) ||
    [];

  const redTeams: number[] = [];
  const blueTeams: number[] = [];

  for (const entry of teamsArray) {
    if (!entry || typeof entry !== "object") continue;

    const teamNumRaw =
      entry.teamNumber ??
      entry.TeamNumber ??
      entry.team?.teamNumber ??
      entry.Team?.TeamNumber ??
      null;

    if (teamNumRaw === null || teamNumRaw === undefined) continue;

    const teamNumber = Number(teamNumRaw) || 0;

    const allianceRaw =
      (entry.alliance ?? entry.Alliance ?? entry.station ?? entry.Station ?? "")
        .toString()
        .toLowerCase();

    if (allianceRaw.includes("red")) {
      redTeams.push(teamNumber);
    } else if (allianceRaw.includes("blue")) {
      blueTeams.push(teamNumber);
    }
  }

  // Ensure exactly two slots per alliance (pad / trim)
  while (redTeams.length < 2) redTeams.push(NaN);
  while (blueTeams.length < 2) blueTeams.push(NaN);

  return {
    redTeams: redTeams.slice(0, 2),
    blueTeams: blueTeams.slice(0, 2),
  };
}

function matchIncludesTeam(match: any, teamNumber: number): boolean {
  const { redTeams, blueTeams } = getAllianceTeamsFromMatch(match);
  return [...redTeams, ...blueTeams].some(
    (tn) => !Number.isNaN(tn) && tn === teamNumber
  );
}

// Helper: normalize tournament level / match level from a match row
function getTournamentLevel(match: any): string {
  return (
    match.tournamentLevel ||
    match.TournamentLevel ||
    match.matchLevel ||
    match.MatchLevel ||
    "qual"
  ).toString();
}

// Helper: get basic red/blue scores from the match listing
function getListingScores(match: any): { red: number | null; blue: number | null } {
  const redScore: number | null =
    match.redScore ??
    match.RedScore ??
    match.red?.score ??
    match.scoreRedFinal ??   // FTC Events /matches field
    match.ScoreRedFinal ??   // just in case of different casing
    null;

  const blueScore: number | null =
    match.blueScore ??
    match.BlueScore ??
    match.blue?.score ??
    match.scoreBlueFinal ??  // FTC Events /matches field
    match.ScoreBlueFinal ??  // just in case
    null;

  return { red: redScore, blue: blueScore };
}


export function TeamsClient({ season, teams }: TeamsClientProps) {
  // === Filters / search ===
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState(""); // "" = All
  const [countryFilter, setCountryFilter] = useState(""); // "" = All

  const stateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teams
            .map((t) => (t.stateProv ?? "").toString().trim())
            .filter((s) => s !== "")
        )
      ).sort(),
    [teams]
  );

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teams
            .map((t) => (t.country ?? "").toString().trim())
            .filter((c) => c !== "")
        )
      ).sort(),
    [teams]
  );

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();

    return teams.filter((t) => {
      const state = (t.stateProv ?? "").toString().trim();
      const country = (t.country ?? "").toString().trim();

      if (stateFilter && state !== stateFilter) return false;
      if (countryFilter && country !== countryFilter) return false;

      if (!q) return true;

      const num = t.teamNumber ?? 0;
      const displayNum = (t.displayTeamNumber ?? "")
        .toString()
        .toLowerCase();
      const name = getDisplayName(t).toLowerCase();

      const numStr = num ? String(num) : "";

      return (
        numStr.includes(q) ||
        displayNum.includes(q) ||
        name.includes(q)
      );
    });
  }, [teams, search, stateFilter, countryFilter]);


  const teamNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teams) {
      const num = t.teamNumber;
      if (num == null) continue;
      const name = getDisplayName(t);
      if (name) {
        map.set(num, name);
      }
    }
    return map;
  }, [teams]);

  // === Drilldown state (per-team) ===
  const [expandedTeamNumber, setExpandedTeamNumber] =
    useState<number | null>(null);

  const [drilldownByTeam, setDrilldownByTeam] = useState<
    Record<number, DrilldownState>
  >({});

  // Event info modal state
  const [eventInfo, setEventInfo] = useState<EventInfoState>({
    open: false,
    seasonYear: null,
    eventCode: null,
    eventName: null,
    city: null,
    teamNumber: null,
    loading: false,
    error: null,
    matches: [],
    rankings: [],
  });


  const [teamEventDetails, setTeamEventDetails] =
    useState<TeamEventDetailsState>({
      open: false,
      seasonYear: null,
      eventCode: null,
      eventName: null,
      city: null,
      teamNumber: null,
      teamName: null,
      loading: false,
      error: null,
      items: [],
    });


  const [matchDetails, setMatchDetails] = useState<MatchDetailsState>({
    open: false,
    seasonYear: null,
    eventCode: null,
    eventName: null,
    city: null,
    matchLabel: null,
    loading: false,
    error: null,
    score: null,
  });


  const eventPerformance = useMemo(
    () => {
      const result: {
        teamNumber: number;
        wins: number;
        losses: number;
        name: string;
      }[] = [];

      if (!eventInfo.matches || eventInfo.matches.length === 0) {
        return result;
      }

      const perf: Record<number, { wins: number; losses: number }> = {};

      const qualMatches = eventInfo.matches.filter((m: any) => {
        const lvl = (
          m.tournamentLevel ||
          m.TournamentLevel ||
          m.matchLevel ||
          m.MatchLevel ||
          ""
        )
          .toString()
          .toLowerCase();
        return lvl.startsWith("qual");
      });

      for (const m of qualMatches as any[]) {
        const { redTeams, blueTeams } = getAllianceTeamsFromMatch(m);
        const { red, blue } = getListingScores(m);

        if (red == null || blue == null) continue;

        let winner: "red" | "blue" | "tie" = "tie";
        if (red > blue) winner = "red";
        else if (blue > red) winner = "blue";

        if (winner === "tie") continue;

        const addResult = (tn: number, didWin: boolean) => {
          if (!tn || Number.isNaN(tn)) return;
          if (!perf[tn]) perf[tn] = { wins: 0, losses: 0 };
          if (didWin) perf[tn].wins += 1;
          else perf[tn].losses += 1;
        };

        for (const tn of redTeams) {
          addResult(tn, winner === "red");
        }
        for (const tn of blueTeams) {
          addResult(tn, winner === "blue");
        }
      }

      for (const [numStr, wl] of Object.entries(perf)) {
        const num = Number(numStr);
        result.push({
          teamNumber: num,
          wins: wl.wins,
          losses: wl.losses,
          name: teamNameMap.get(num) ?? "",
        });
      }

      result.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.teamNumber - b.teamNumber;
      });

      return result;
    },
    [eventInfo.matches, teamNameMap]
  );

  // For reading in render and in handlers
  function getDrilldown(teamNumber: number): DrilldownState {
    return drilldownByTeam[teamNumber] ?? createEmptyDrilldown();
  }

  // For updating without clobbering other fields
  function setDrilldown(teamNumber: number, patch: Partial<DrilldownState>) {
    setDrilldownByTeam((prev) => {
      const base = prev[teamNumber] ?? createEmptyDrilldown();
      return {
        ...prev,
        [teamNumber]: {
          ...base,
          ...patch,
        },
      };
    });
  }

  // === SCORE-LOADING HELPER (never called from render) ===
  // Simpler version: we rely on the MatchCard effect guard to avoid refetching.
  const ensureScoreLoaded = useCallback(
    async (
      teamNumber: number,
      seasonYear: number,
      eventCode: string,
      tournamentLevel: string,
      matchNumber: number
    ) => {
      const key = matchKey(
        seasonYear,
        eventCode,
        tournamentLevel,
        matchNumber
      );

      // Mark as loading + clear previous error.
      setDrilldownByTeam((prev) => {
        const base = prev[teamNumber] ?? createEmptyDrilldown();
        return {
          ...prev,
          [teamNumber]: {
            ...base,
            loadingScoresByMatchKey: {
              ...base.loadingScoresByMatchKey,
              [key]: true,
            },
            scoresErrorByMatchKey: {
              ...base.scoresErrorByMatchKey,
              [key]: undefined,
            },
          },
        };
      });

      try {
        const res = await fetch(
          `/api/ftc/events/${seasonYear}/${encodeURIComponent(
            eventCode
          )}/matches/${tournamentLevel}/${matchNumber}`
        );

        // If FTC API throws 404/500 for some matches, treat as “no data yet”
        if (!res.ok) {
          if (res.status === 404 || res.status === 500) {
            setDrilldownByTeam((prev) => {
              const base = prev[teamNumber] ?? createEmptyDrilldown();
              return {
                ...prev,
                [teamNumber]: {
                  ...base,
                  scoresByMatchKey: {
                    ...base.scoresByMatchKey,
                    [key]: null,
                  },
                  loadingScoresByMatchKey: {
                    ...base.loadingScoresByMatchKey,
                    [key]: false,
                  },
                  scoresErrorByMatchKey: {
                    ...base.scoresErrorByMatchKey,
                    [key]: null,
                  },
                },
              };
            });
            return;
          }

          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as {
          ok: boolean;
          match?: FtcMatchScores | null;
          error?: string;
        };

        setDrilldownByTeam((prev) => {
          const base = prev[teamNumber] ?? createEmptyDrilldown();

          if (!json.ok) {
            return {
              ...prev,
              [teamNumber]: {
                ...base,
                scoresByMatchKey: {
                  ...base.scoresByMatchKey,
                  [key]: null,
                },
                loadingScoresByMatchKey: {
                  ...base.loadingScoresByMatchKey,
                  [key]: false,
                },
                scoresErrorByMatchKey: {
                  ...base.scoresErrorByMatchKey,
                  [key]: null,
                },
              },
            };
          }

          return {
            ...prev,
            [teamNumber]: {
              ...base,
              scoresByMatchKey: {
                ...base.scoresByMatchKey,
                [key]: json.match ?? null,
              },
              loadingScoresByMatchKey: {
                ...base.loadingScoresByMatchKey,
                [key]: false,
              },
            },
          };
        });
      } catch (err: any) {
        setDrilldownByTeam((prev) => {
          const base = prev[teamNumber] ?? createEmptyDrilldown();
          return {
            ...prev,
            [teamNumber]: {
              ...base,
              loadingScoresByMatchKey: {
                ...base.loadingScoresByMatchKey,
                [key]: false,
              },
              scoresErrorByMatchKey: {
                ...base.scoresErrorByMatchKey,
                [key]:
                  err?.message ?? "Failed to load score details.",
              },
            },
          };
        });
      }
    },
    []
  );

  // === EVENT INFO MODAL HANDLERS ===

  async function handleOpenEventInfo(
    teamNumber: number,
    seasonYear: number,
    event: FtcTeamEvent
  ) {
    const eventCode = (event.eventCode ?? "").toString().trim();

    setEventInfo({
      open: true,
      seasonYear,
      teamNumber,
      eventCode: eventCode || null,
      eventName: (event.eventName ?? "").toString() || null,
      city: (event.city ?? "").toString() || null,
      loading: true,
      error: null,
      matches: [],
      rankings: [],
    });

    if (!eventCode) {
      setEventInfo((prev) => ({
        ...prev,
        loading: false,
        error:
          "This event does not have an event code, so detailed info is not available.",
      }));
      return;
    }

    try {
      const [matchesRes, rankingsRes] = await Promise.all([
        fetch(
          `/api/ftc/events/${seasonYear}/${encodeURIComponent(
            eventCode
          )}/matches`
        ),
        fetch(
          `/api/ftc/events/${seasonYear}/${encodeURIComponent(
            eventCode
          )}/rankings`
        ),
      ]);

      if (!matchesRes.ok && !rankingsRes.ok) {
        throw new Error("Failed to load event info.");
      }

      const matchesJson = matchesRes.ok
        ? ((await matchesRes.json()) as {
            ok: boolean;
            matches?: FtcMatch[];
            error?: string;
          })
        : { ok: false };

      const rankingsJson = rankingsRes.ok
        ? ((await rankingsRes.json()) as {
            ok: boolean;
            rankings?: any[];
            error?: string;
          })
        : { ok: false };

      setEventInfo((prev) => ({
        ...prev,
        loading: false,
        error:
          (!matchesJson.ok && matchesJson.error) ||
          (!rankingsJson.ok && rankingsJson.error) ||
          null,
        matches: matchesJson.ok && matchesJson.matches
          ? matchesJson.matches
          : [],
        rankings: rankingsJson.ok && rankingsJson.rankings
          ? rankingsJson.rankings
          : [],
      }));
    } catch (err: any) {
      setEventInfo((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Failed to load event info.",
      }));
    }
  }

  function handleCloseEventInfo() {
    setEventInfo((prev) => ({ ...prev, open: false }));
  }



  async function openTeamEventDetailsFor(
    teamNumberInEvent: number,
    seasonYear: number,
    eventCode: string,
    eventName: string | null,
    city: string | null,
    matchesSource: FtcMatch[] | undefined | null
  ) {
    const matchesWithTeam = (matchesSource ?? []).filter((m) =>
      matchIncludesTeam(m, teamNumberInEvent)
    );

    const team = teams.find((t) => t.teamNumber === teamNumberInEvent);
    const teamName = team ? getDisplayName(team) : "";

    const items: TeamEventDetailsItem[] = matchesWithTeam.map((m, idx) => {
      const tl = getTournamentLevel(m);
      const mn = (m.matchNumber ?? m.MatchNumber ?? idx + 1) as number;
      const key = matchKey(seasonYear, eventCode, tl, mn);
      return { key, match: m, score: undefined };
    });

    setTeamEventDetails({
      open: true,
      seasonYear,
      eventCode,
      eventName,
      city,
      teamNumber: teamNumberInEvent,
      teamName: teamName || null,
      loading: true,
      error: null,
      items,
    });

    if (items.length === 0) {
      setTeamEventDetails((prev) => ({
        ...prev,
        loading: false,
      }));
      return;
    }

    try {
      const scores = await Promise.all(
        items.map(async (item, idx) => {
          const m = item.match as any;
          const tl = getTournamentLevel(m);
          const mn = (m.matchNumber ?? m.MatchNumber ?? idx + 1) as number;

          const res = await fetch(
            `/api/ftc/events/${seasonYear}/${encodeURIComponent(
              eventCode
            )}/matches/${tl}/${mn}`
          );

          if (!res.ok) {
            return null;
          }

          const json = (await res.json()) as {
            ok: boolean;
            match?: FtcMatchScores | null;
            error?: string;
          };

          if (!json.ok) {
            return null;
          }

          return json.match ?? null;
        })
      );

      setTeamEventDetails((prev) => {
        if (!prev.open) return prev;
        const updatedItems = prev.items.map((item, idx) => ({
          ...item,
          score: scores[idx],
        }));
        return {
          ...prev,
          loading: false,
          items: updatedItems,
        };
      });
    } catch (err: any) {
      setTeamEventDetails((prev) => ({
        ...prev,
        loading: false,
        error:
          err?.message ??
          "Failed to load detailed scores for this team at this event.",
      }));
    }
  }

  async function handleOpenTeamEventDetails(teamNumberInEvent: number) {
    if (!eventInfo.seasonYear || !eventInfo.eventCode) {
      return;
    }

    await openTeamEventDetailsFor(
      teamNumberInEvent,
      eventInfo.seasonYear,
      eventInfo.eventCode,
      eventInfo.eventName,
      eventInfo.city,
      eventInfo.matches
    );
  }

  function handleCloseTeamEventDetails() {
    setTeamEventDetails((prev) => ({ ...prev, open: false }));
  }

  async function handleOpenTeamEventDetailsFromDrilldown(
    teamNumberInEvent: number,
    seasonYear: number,
    event: FtcTeamEvent,
    matchesForEvent: FtcMatch[] | undefined
  ) {
    const eventCode = (event.eventCode ?? "").toString().trim();
    if (!eventCode) {
      return;
    }

    await openTeamEventDetailsFor(
      teamNumberInEvent,
      seasonYear,
      eventCode,
      (event.eventName ?? "").toString() || null,
      (event.city ?? "").toString() || null,
      matchesForEvent ?? []
    );
  }


  async function handleOpenMatchDetails(match: any, idx: number) {
    if (!eventInfo.seasonYear || !eventInfo.eventCode) {
      return;
    }

    const seasonYear = eventInfo.seasonYear;
    const eventCode = eventInfo.eventCode;

    const lvlRaw = (
      match.tournamentLevel ||
      match.TournamentLevel ||
      match.matchLevel ||
      match.MatchLevel ||
      ""
    )
      .toString()
      .toUpperCase();
    const prettyLevel =
      lvlRaw === "QUAL" || lvlRaw === "QUALIFICATION"
        ? "QUALIFICATION"
        : lvlRaw || "MATCH";

    const matchNum =
      match.matchNumber || match.MatchNumber || idx + 1;

    const tournamentLevel = getTournamentLevel(match);
    const matchNumber = (match.matchNumber ?? match.MatchNumber ?? idx + 1) as number;

    setMatchDetails({
      open: true,
      seasonYear,
      eventCode,
      eventName: eventInfo.eventName,
      city: eventInfo.city,
      matchLabel: `${prettyLevel} #${matchNum}`,
      loading: true,
      error: null,
      score: null,
    });

    try {
      const res = await fetch(
        `/api/ftc/events/${seasonYear}/${encodeURIComponent(
          eventCode
        )}/matches/${tournamentLevel}/${matchNumber}`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        match?: FtcMatchScores | null;
        error?: string;
      };

      if (!json.ok) {
        throw new Error(json.error ?? "Failed to load match details.");
      }

      setMatchDetails((prev) => ({
        ...prev,
        loading: false,
        score: json.match ?? null,
      }));
    } catch (err: any) {
      setMatchDetails((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Failed to load match details.",
        score: null,
      }));
    }
  }

  function handleCloseMatchDetails() {
    setMatchDetails((prev) => ({ ...prev, open: false }));
  }

  // === CLICK HANDLERS ===

  // TEAM ROW → toggle accordion + lazy-load seasons
  async function handleToggleTeam(team: FtcTeam) {
    const teamNumber = team.teamNumber;
    if (!teamNumber) return;

    // collapse if already open
    if (expandedTeamNumber === teamNumber) {
      setExpandedTeamNumber(null);
      return;
    }

    // open this team
    setExpandedTeamNumber(teamNumber);

    const d = getDrilldown(teamNumber);
    if (d.seasons || d.loadingSeasons) return;

    try {
      setDrilldown(teamNumber, {
        loadingSeasons: true,
        seasonsError: null,
      });

      const rookieYear = team.rookieYear ?? "";
      const res = await fetch(
        `/api/ftc/team/${teamNumber}/seasons?rookieYear=${rookieYear}&currentSeason=${season}`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        seasons?: number[];
        error?: string;
      };

      if (!json.ok) {
        throw new Error(json.error ?? "Failed to fetch seasons");
      }

      // Most recent season first
      const seasonsList = (json.seasons ?? [])
        .slice()
        .sort((a, b) => b - a);

      setDrilldown(teamNumber, {
        seasons: seasonsList,
        loadingSeasons: false,
      });
    } catch (err: any) {
      setDrilldown(teamNumber, {
        loadingSeasons: false,
        seasonsError: err?.message ?? "Failed to load seasons.",
      });
    }
  }

  // SEASON ROW → toggle open + lazy-load events
  async function handleToggleSeason(team: FtcTeam, seasonYear: number) {
    const teamNumber = team.teamNumber;
    if (!teamNumber) return;

    const d = getDrilldown(teamNumber);
    const currentlyOpen = !!d.openSeasons[seasonYear];
    const nextOpen = !currentlyOpen;

    setDrilldown(teamNumber, {
      openSeasons: { ...d.openSeasons, [seasonYear]: nextOpen },
    });

    if (!nextOpen) return; // closing, nothing else

    const already = d.eventsBySeason[seasonYear];
    const loading = d.loadingEventsBySeason[seasonYear];
    if (already || loading) return;

    try {
      setDrilldown(teamNumber, {
        loadingEventsBySeason: {
          ...d.loadingEventsBySeason,
          [seasonYear]: true,
        },
        eventsErrorBySeason: {
          ...d.eventsErrorBySeason,
          [seasonYear]: null,
        },
      });

      const res = await fetch(
        `/api/ftc/team/${teamNumber}/seasons/${seasonYear}/events`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        events?: FtcTeamEvent[];
        error?: string;
      };

      if (!json.ok) {
        throw new Error(json.error ?? "Failed to fetch events");
      }

      const matchesStateBefore = getDrilldown(teamNumber);

      const events = json.events ?? [];

      setDrilldown(teamNumber, {
        eventsBySeason: {
          ...matchesStateBefore.eventsBySeason,
          [seasonYear]: events,
        },
        loadingEventsBySeason: {
          ...matchesStateBefore.loadingEventsBySeason,
          [seasonYear]: false,
        },
      });
    } catch (err: any) {
      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        loadingEventsBySeason: {
          ...d2.loadingEventsBySeason,
          [seasonYear]: false,
        },
        eventsErrorBySeason: {
          ...d2.eventsErrorBySeason,
          [seasonYear]: err?.message ?? "Failed to load events.",
        },
      });
    }
  }

  // EVENT ROW → toggle open + lazy-load matches (scores are loaded by MatchCard)
  async function handleToggleEvent(
    teamNumber: number,
    seasonYear: number,
    event: FtcTeamEvent
  ) {
    const stateKey = getEventKeyForState(seasonYear, event);
    const d = getDrilldown(teamNumber);

    const currentlyOpen = !!d.openEvents[stateKey];
    const nextOpen = !currentlyOpen;

    setDrilldown(teamNumber, {
      openEvents: { ...d.openEvents, [stateKey]: nextOpen },
    });

    if (!nextOpen) return;

    const matchesKey = stateKey; // same key for matchesByEventKey
    const alreadyMatches = d.matchesByEventKey[matchesKey];
    const loadingMatches = d.loadingMatchesByEventKey[matchesKey];

    if (alreadyMatches || loadingMatches) {
      // We already have (or are loading) the match list; scores will load per card.
      return;
    }

    try {
      setDrilldown(teamNumber, {
        loadingMatchesByEventKey: {
          ...d.loadingMatchesByEventKey,
          [matchesKey]: true,
        },
        matchesErrorByEventKey: {
          ...d.matchesErrorByEventKey,
          [matchesKey]: undefined,
        },
      });

      const res = await fetch(
        `/api/ftc/events/${seasonYear}/${encodeURIComponent(
          event.eventCode ?? ""
        )}/matches`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        matches?: FtcMatch[];
        error?: string;
      };

      if (!json.ok) {
        throw new Error(json.error ?? "Failed to fetch matches");
      }

      const matches = json.matches ?? [];

      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        matchesByEventKey: {
          ...d2.matchesByEventKey,
          [matchesKey]: matches,
        },
        loadingMatchesByEventKey: {
          ...d2.loadingMatchesByEventKey,
          [matchesKey]: false,
        },
      });
    } catch (err: any) {
      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        loadingMatchesByEventKey: {
          ...d2.loadingMatchesByEventKey,
          [stateKey]: false,
        },
        matchesErrorByEventKey: {
          ...d2.matchesErrorByEventKey,
          [stateKey]: err?.message ?? "Failed to load matches.",
        },
      });
    }
  }

  // === RENDER ===

  return (
    <>
      <section className="space-y-3 text-[14px]">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[14px] text-gray-400 mb-1">
              Search by team # or name
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. 12345 or Techno Chix"
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-white/40"
            />
          </div>

          <div className="min-w-[140px]">
            <label className="block text-[14px] text-gray-400 mb-1">
              State / Prov
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-white/40"
            >
              <option value="">All</option>
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-[14px] text-gray-400 mb-1">
              Country
            </label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-white/40"
            >
              <option value="">All</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[14px] text-gray-400">
          Showing {filteredTeams.length} of {teams.length} teams
        </p>

        {/* Table with accordion */}
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="min-w-full text-[14px]">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Team #
                </th>
                <th className="px-3 py-2 text-left font-semibold max-w-xs w-64">
                  Team Name
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  City
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  State / Prov
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Country
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Rookie Year
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTeams.map((t, idx) => {
                const isOpen = expandedTeamNumber === t.teamNumber;
                const d = t.teamNumber ? getDrilldown(t.teamNumber) : undefined;

                return (
                  <Fragment key={t.teamNumber ?? `team-${idx}`}>
                    {/* Team row */}
                    <tr
                      className="hover:bg-white/5 cursor-pointer"
                      onClick={() => handleToggleTeam(t)}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {t.teamNumber ?? ""}
                      </td>
                      <td className="px-3 py-1.5 align-top max-w-xs w-64 whitespace-normal break-words">
                        {getDisplayName(t) || "(no name)"}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {(t.city ?? "").toString()}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {(t.stateProv ?? "").toString()}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {(t.country ?? "").toString()}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {t.rookieYear ?? ""}
                      </td>
                    </tr>

                    {/* Drilldown row */}
                    {isOpen && t.teamNumber && d && (
                      <tr className="bg-black/40">
                        <td colSpan={6} className="px-4 py-3">
                          {/* Seasons / events / matches accordion */}
                          {d.loadingSeasons && (
                            <div className="text-[14px] text-gray-400">
                              Loading seasons…
                            </div>
                          )}
                          {d.seasonsError && (
                            <div className="text-[14px] text-red-400">
                              {d.seasonsError}
                            </div>
                          )}
                          {d.seasons && d.seasons.length === 0 && (
                            <div className="text-[14px] text-gray-400">
                              No seasons found for this team.
                            </div>
                          )}

                          {d.seasons && d.seasons.length > 0 && (
                            <div className="space-y-2">
                              {d.seasons.map((seasonYear) => {
                                const events =
                                  d.eventsBySeason[seasonYear] ?? [];
                                const eventsLoading =
                                  d.loadingEventsBySeason[seasonYear];
                                const eventsError =
                                  d.eventsErrorBySeason[seasonYear];
                                const seasonOpen =
                                  d.openSeasons[seasonYear] ?? false;

                                return (
                                  <div key={seasonYear}>
                                    {/* Season header */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSeason(t, seasonYear);
                                      }}
                                      className="w-full flex justify-between items-center text-left text-[14px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
                                    >
                                      <span className="font-semibold text-gray-100">
                                        Season {seasonYear}
                                      </span>
                                      <span className="text-gray-300">
                                        {seasonOpen ? "−" : "+"}
                                      </span>
                                    </button>

                                    {/* Events list */}
                                    {seasonOpen && (
                                      <div className="mt-1 ml-4 border-l border-white/10 pl-3 space-y-1">
                                        {eventsLoading && (
                                          <div className="text-[14px] text-gray-400">
                                            Loading events…
                                          </div>
                                        )}
                                        {eventsError && (
                                          <div className="text-[14px] text-red-400">
                                            {eventsError}
                                          </div>
                                        )}
                                        {!eventsLoading &&
                                          !eventsError &&
                                          events.length === 0 && (
                                            <div className="text-[14px] text-gray-500">
                                              No events recorded.
                                            </div>
                                          )}

                                        {events.map((ev) => {
                                          const stateKey =
                                            getEventKeyForState(
                                              seasonYear,
                                              ev
                                            );
                                          const matches =
                                            d.matchesByEventKey[stateKey];
                                          const matchesLoading =
                                            d.loadingMatchesByEventKey[
                                              stateKey
                                            ];
                                          const matchesError =
                                            d.matchesErrorByEventKey[
                                              stateKey
                                            ];
                                          const eventOpen =
                                            d.openEvents[stateKey] ?? false;

                                          return (
                                            <div key={stateKey}>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleEvent(
                                                      t.teamNumber!,
                                                      seasonYear,
                                                      ev
                                                    );
                                                  }}
                                                  className="flex-1 flex justify-between items-center text-left text-[14px] bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded"
                                                >
                                                  <span className="text-gray-100">
                                                    {ev.eventName}{" "}
                                                    {ev.eventCode && (
                                                      <span className="text-gray-400">
                                                        ({ev.eventCode})
                                                      </span>
                                                    )}
                                                  </span>
                                                  <span className="flex items-center gap-2 text-gray-400 text-[14px]">
                                                    {ev.city && (
                                                      <span>
                                                        {ev.city}
                                                        {ev.stateProv && ", "}
                                                        {ev.stateProv}
                                                      </span>
                                                    )}
                                                    <span>
                                                      {eventOpen ? "−" : "+"}
                                                    </span>
                                                  </span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEventInfo(
                                                      t.teamNumber!,
                                                      seasonYear,
                                                      ev
                                                    );
                                                  }}
                                                  className="text-[14px] px-2 py-1 rounded border border-white/15 bg-black/40 hover:bg-white/10 text-gray-200"
                                                >
                                                  Event info
                                                </button>
                                              </div>

                                              {/* Match cards (this team only) */}
                                              {eventOpen && (
                                                <div className="mt-2 ml-4 border-l border-white/10 pl-3">
                                                  {matchesLoading && (
                                                    <div className="text-[14px] text-gray-400">
                                                      Loading matches…
                                                    </div>
                                                  )}
                                                  {matchesError && (
                                                    <div className="text-[14px] text-red-400">
                                                      {matchesError}
                                                    </div>
                                                  )}
                                                  {!matchesLoading &&
                                                    !matchesError &&
                                                    matches &&
                                                    matches.length === 0 && (
                                                      <div className="text-[14px] text-gray-500">
                                                        No matches found for
                                                        this event.
                                                      </div>
                                                    )}

                                                  {!matchesLoading &&
                                                    !matchesError &&
                                                    matches &&
                                                    matches.length > 0 &&
                                                    !(matches as any[]).some((m) =>
                                                      matchIncludesTeam(m, t.teamNumber!)
                                                    ) && (
                                                      <div className="text-[14px] text-gray-500">
                                                        This team has no recorded matches for this event.
                                                      </div>
                                                    )}

                                                  {!matchesLoading &&
                                                    !matchesError &&
                                                    matches &&
                                                    (matches as any[]).some((m) =>
                                                      matchIncludesTeam(m, t.teamNumber!)
                                                    ) && (
                                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {(matches as any[])
                                                          .filter((m) =>
                                                            matchIncludesTeam(m, t.teamNumber!)
                                                          )
                                                          .map((m: any) => {
                                                            const tl =
                                                              m.tournamentLevel ||
                                                              m.TournamentLevel ||
                                                              "qual";
                                                            const mn =
                                                              m.matchNumber ||
                                                              m.MatchNumber ||
                                                              0;
                                                            const mKey = matchKey(
                                                              seasonYear,
                                                              ev.eventCode ?? "",
                                                              tl,
                                                              mn
                                                            );

                                                            const score =
                                                              d.scoresByMatchKey[mKey];
                                                            const scoreLoading =
                                                              d.loadingScoresByMatchKey[mKey] || false;
                                                            const scoreError =
                                                              d.scoresErrorByMatchKey[mKey] ?? null;

                                                            return (
                                                              <MatchCard
                                                                key={mKey}
                                                                teamNumber={t.teamNumber!}
                                                                seasonYear={seasonYear}
                                                                eventCode={ev.eventCode ?? ""}
                                                                tournamentLevel={tl}
                                                                matchNumber={mn}
                                                                match={m}
                                                                score={score}
                                                                scoreLoading={scoreLoading}
                                                                scoreError={scoreError}
                                                                ensureScoreLoaded={ensureScoreLoaded}
                                                                onTeamClick={(teamNumberInEvent) => {
                                                                  void handleOpenTeamEventDetailsFromDrilldown(
                                                                    teamNumberInEvent,
                                                                    seasonYear,
                                                                    ev,
                                                                    matches
                                                                  );
                                                                }}
                                                              />
                                                            );
                                                          })}
                                                      </div>
                                                    )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      
      {/* EVENT INFO MODAL */}
      {eventInfo.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-gray-100">
                  Event info
                </div>
                <div className="text-[14px] text-gray-400">
                  {eventInfo.eventName || "Unknown event"}
                  {eventInfo.city && ` • ${eventInfo.city}`}
                  {eventInfo.seasonYear && ` • ${eventInfo.seasonYear}`}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEventInfo}
                className="rounded-md px-2 py-1 text-[14px] text-gray-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto px-4 py-3 space-y-4 text-[14px]">
              {eventInfo.loading && (
                <div className="text-gray-300">Loading event details…</div>
              )}

              {!eventInfo.loading && eventInfo.error && (
                <div className="text-red-400">{eventInfo.error}</div>
              )}

              {/* Only render tables when we have data and no error */}
              {!eventInfo.loading && !eventInfo.error && (
                <>
                  {/* Event matches table */}
                  <div className="w-full">
                    <h3 className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-gray-300">
                      Event matches
                    </h3>
                    {eventInfo.matches.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No matches found for this event.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/50">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-800/80">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-300">
                                Match
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-300">
                                Red teams
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-300">
                                Blue teams
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-300">
                                Final score
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {eventInfo.matches.map((m, idx) => {
                              const levelRaw = getTournamentLevel(m).toUpperCase();
                              let level = "QUAL";
                              if (
                                levelRaw.startsWith("PLAYOFF") ||
                                levelRaw.startsWith("EL")
                              ) {
                                level = "ELIM";
                              } else if (
                                levelRaw.startsWith("SF") ||
                                levelRaw.includes("SEMIFINAL")
                              ) {
                                level = "SF";
                              } else if (
                                levelRaw.startsWith("QF") ||
                                levelRaw.includes("QUARTERFINAL")
                              ) {
                                level = "QF";
                              } else if (levelRaw.startsWith("F")) {
                                level = "F";
                              }

                              const matchLevel = level;
                              const matchNumber =
                                (m.matchNumber ?? m.MatchNumber ?? idx + 1) as number;

                              const { red: redScoreRaw, blue: blueScoreRaw } =
                                getListingScores(m);
                              const redScore = redScoreRaw ?? 0;
                              const blueScore = blueScoreRaw ?? 0;

                              const { redTeams, blueTeams } = getAllianceTeamsFromMatch(m);

                              const renderTeamNumber = (tn: number) => {
                                if (!tn || Number.isNaN(tn)) return null;
                                return (
                                  <button
                                    key={tn}
                                    className="inline-flex items-center rounded border border-transparent px-1.5 py-0.5 text-xs font-medium text-blue-300 hover:border-blue-400 hover:bg-blue-900/30"
                                    onClick={() => handleOpenTeamEventDetails(tn)}
                                  >
                                    {tn}
                                  </button>
                                );
                              };

                              return (
                                <tr
                                  key={`${levelRaw}-${matchNumber}-${idx}`}
                                  className="hover:bg-gray-800/60 cursor-pointer"
                                  onClick={() => handleOpenMatchDetails(m, idx)}
                                >
                                  <td className="whitespace-nowrap px-3 py-2 text-gray-200">
                                    {matchLevel} {matchNumber}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-red-200">
                                    {redTeams.some((tn) => !Number.isNaN(tn) && tn) ? (
                                      <div className="flex flex-wrap gap-1">
                                        {redTeams
                                          .filter((tn) => !Number.isNaN(tn) && tn)
                                          .map((tn) => renderTeamNumber(tn))}
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-blue-200">
                                    {blueTeams.some((tn) => !Number.isNaN(tn) && tn) ? (
                                      <div className="flex flex-wrap gap-1">
                                        {blueTeams
                                          .filter((tn) => !Number.isNaN(tn) && tn)
                                          .map((tn) => renderTeamNumber(tn))}
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold">
                                    <span
                                      className={
                                        redScore > blueScore
                                          ? "text-red-300"
                                          : redScore < blueScore
                                          ? "text-blue-300"
                                          : "text-gray-300"
                                      }
                                    >
                                      {redScore}-{blueScore}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Team win/loss summary (qualification matches only) */}
                  {eventPerformance.length > 0 && (
                    <div className="w-full">
                      <h3 className="mt-4 mb-2 text-[14px] font-semibold uppercase tracking-wide text-gray-300">
                        Team win / loss summary
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/50">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-800/80">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-300">
                                Team #
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-300">
                                Team name
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-300">
                                Wins
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-300">
                                Losses
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-300">
                                Record
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {eventPerformance.map((row) => (
                              <tr key={row.teamNumber}>
                                <td className="whitespace-nowrap px-3 py-2 text-gray-200">
                                  {row.teamNumber}
                                </td>
                                <td className="px-3 py-2 text-gray-200">
                                  {row.name || "—"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-200">
                                  {row.wins}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-200">
                                  {row.losses}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-300">
                                  {row.wins}-{row.losses}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MATCH DETAILS MODAL */}
      {matchDetails.open && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-gray-100">
                  {matchDetails.matchLabel ?? "Match details"}
                </div>
                <div className="text-[14px] text-gray-400">
                  {matchDetails.eventName || "Unknown event"}
                  {matchDetails.city && ` • ${matchDetails.city}`}
                  {matchDetails.seasonYear && ` • ${matchDetails.seasonYear}`}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseMatchDetails}
                className="rounded-md px-2 py-1 text-[14px] text-gray-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-4 py-3 space-y-4 text-[14px]">
              {matchDetails.loading && (
                <div className="text-gray-300">
                  Loading match score breakdown…
                </div>
              )}

              {!matchDetails.loading && matchDetails.error && (
                <div className="text-red-400">{matchDetails.error}</div>
              )}

              {!matchDetails.loading &&
                !matchDetails.error &&
                matchDetails.score === null && (
                  <div className="text-gray-500">
                    No score details available for this match yet.
                  </div>
                )}

              {!matchDetails.loading &&
                !matchDetails.error &&
                matchDetails.score && (
                  <MatchScoreTable score={matchDetails.score} />
                )}
            </div>
          </div>
        </div>
      )}
      {/* TEAM-IN-EVENT DETAILS MODAL */}
      {teamEventDetails.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-gray-100">
                  Team {teamEventDetails.teamNumber ?? ""}{" "}
                  {teamEventDetails.teamName
                    ? `– ${teamEventDetails.teamName}`
                    : ""}
                </div>
                <div className="text-[14px] text-gray-400">
                  {teamEventDetails.eventName || "Unknown event"}
                  {teamEventDetails.city && ` • ${teamEventDetails.city}`}
                  {teamEventDetails.seasonYear &&
                    ` • ${teamEventDetails.seasonYear}`}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseTeamEventDetails}
                className="rounded-md px-2 py-1 text-[14px] text-gray-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-4 py-3 space-y-4 text-[14px]">
              {teamEventDetails.loading && (
                <div className="text-gray-300">
                  Loading detailed scores for this team…
                </div>
              )}

              {!teamEventDetails.loading && teamEventDetails.error && (
                <div className="text-red-400">{teamEventDetails.error}</div>
              )}

              {!teamEventDetails.loading &&
                !teamEventDetails.error &&
                teamEventDetails.items.length === 0 && (
                  <div className="text-gray-500">
                    This team has no recorded matches for this event.
                  </div>
                )}

              {!teamEventDetails.loading &&
                !teamEventDetails.error &&
                teamEventDetails.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {teamEventDetails.items.map((item, idx) => {
                      const m: any = item.match;
                      const lvlRaw = getTournamentLevel(m).toUpperCase();
                      const prettyLevel =
                        lvlRaw === "QUAL" || lvlRaw === "QUALIFICATION"
                          ? "QUALIFICATION"
                          : lvlRaw || "MATCH";
                      const matchNum =
                        (m.matchNumber ?? m.MatchNumber ?? idx + 1) as number;

                      const { redTeams, blueTeams } =
                        getAllianceTeamsFromMatch(m);

                      const renderTeamList = (teams: number[]) =>
                        teams
                          .filter((tn) => !Number.isNaN(tn) && tn)
                          .join(", ");

                      return (
                        <div
                          key={item.key}
                          className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 h-full"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="text-[14px] font-semibold text-gray-100">
                              {prettyLevel} #{matchNum}
                            </div>
                            <div className="text-[14px] text-gray-300">
                              <span className="text-red-300">
                                Red: {renderTeamList(redTeams)}
                              </span>
                              <span className="mx-2 text-gray-500">vs</span>
                              <span className="text-blue-300">
                                Blue: {renderTeamList(blueTeams)}
                              </span>
                            </div>
                          </div>

                          {item.score === undefined && (
                            <div className="text-[14px] text-gray-400">
                              Loading score breakdown…
                            </div>
                          )}

                          {item.score === null && (
                            <div className="text-[14px] text-gray-500">
                              No score details available for this match yet.
                            </div>
                          )}

                          {item.score && <MatchScoreTable score={item.score} />}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Match card (loads its own score once and keeps it) ---------- */

type MatchCardProps = {
  teamNumber: number;
  seasonYear: number;
  eventCode: string;
  tournamentLevel: string;
  matchNumber: number;
  match: any;
  score: FtcMatchScores | null | undefined;
  scoreLoading: boolean;
  scoreError: string | null;
  ensureScoreLoaded: (
    teamNumber: number,
    seasonYear: number,
    eventCode: string,
    tournamentLevel: string,
    matchNumber: number
  ) => Promise<void>;
  onTeamClick: (teamNumberInEvent: number) => void;
};

function MatchCard(props: MatchCardProps) {
  const {
    teamNumber,
    seasonYear,
    eventCode,
    tournamentLevel,
    matchNumber,
    match,
    score,
    scoreLoading,
    scoreError,
    ensureScoreLoaded,
    onTeamClick,
  } = props;

  // Ensure we load the detailed score exactly once per match when needed
  useEffect(() => {
    if (score === undefined && !scoreLoading && !scoreError) {
      void ensureScoreLoaded(
        teamNumber,
        seasonYear,
        eventCode,
        tournamentLevel,
        matchNumber
      );
    }
  }, [
    score,
    scoreLoading,
    scoreError,
    ensureScoreLoaded,
    teamNumber,
    seasonYear,
    eventCode,
    tournamentLevel,
    matchNumber,
  ]);

  // Basic info about this match
  const tl = tournamentLevel;
  const mn = matchNumber;

  // Pull quick listing scores from the match object (used as a fallback)
  const { red: listingRedScore, blue: listingBlueScore } =
    getListingScores(match);

  // If we have a detailed score, use that instead for the totals
  const alliances = score ? getAlliancesFromScore(score as any) : [];
  const redAlliance = alliances.find(
    (a) =>
      (a.alliance ?? a.Alliance ?? "")
        .toString()
        .toLowerCase()
        .startsWith("red")
  );
  const blueAlliance = alliances.find(
    (a) =>
      (a.alliance ?? a.Alliance ?? "")
        .toString()
        .toLowerCase()
        .startsWith("blue")
  );

  const redTotal =
    (redAlliance as any)?.totalPoints ?? listingRedScore ?? null;
  const blueTotal =
    (blueAlliance as any)?.totalPoints ?? listingBlueScore ?? null;

  let winner: "Red" | "Blue" | "Tie" | null = null;
  if (redTotal != null && blueTotal != null) {
    if (redTotal > blueTotal) winner = "Red";
    else if (blueTotal > redTotal) winner = "Blue";
    else winner = "Tie";
  }

  const matchLevelRaw = (
    match.matchLevel ||
    match.MatchLevel ||
    tl ||
    ""
  )
    .toString()
    .toUpperCase();

  let matchLevelShort = "QUAL";
  if (matchLevelRaw.startsWith("PLAYOFF") || matchLevelRaw.startsWith("EL")) {
    matchLevelShort = "ELIM";
  } else if (
    matchLevelRaw.startsWith("SF") ||
    matchLevelRaw.includes("SEMIFINAL")
  ) {
    matchLevelShort = "SF";
  } else if (
    matchLevelRaw.startsWith("QF") ||
    matchLevelRaw.includes("QUARTERFINAL")
  ) {
    matchLevelShort = "QF";
  } else if (matchLevelRaw.startsWith("F")) {
    matchLevelShort = "F";
  }

  const matchNumberDisplay =
    match.matchNumber || match.MatchNumber || mn || "–";

  // Extract team numbers for both alliances
  const { redTeams, blueTeams } = getAllianceTeamsFromMatch(match);

  const renderTeamNumber = (tn: number, alliance: "red" | "blue") => {
    const isPrimary = tn === teamNumber;
    const baseClasses =
      "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium";
    const colorClasses =
      alliance === "red"
        ? "text-red-200 border-red-500/40 hover:border-red-400 hover:bg-red-900/40"
        : "text-blue-200 border-blue-500/40 hover:border-blue-400 hover:bg-blue-900/40";
    const highlight = isPrimary ? " ring-1 ring-yellow-300/70" : "";

    return (
      <button
        key={tn}
        className={baseClasses + " " + colorClasses + highlight}
        onClick={() => onTeamClick(tn)}
      >
        {tn}
      </button>
    );
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[13px] uppercase tracking-wide text-gray-400">
            {matchLevelShort} {matchNumberDisplay}
          </div>
          <div className="text-[12px] text-gray-500">
            {tl && mn ? `Match ${mn}` : null}
          </div>
        </div>
        <div className="text-right text-[14px] font-semibold">
          {redTotal != null && blueTotal != null ? (
            <span>
              <span
                className={
                  winner === "Red"
                    ? "text-red-300"
                    : winner === "Tie"
                    ? "text-gray-300"
                    : "text-gray-500"
                }
              >
                {redTotal}
              </span>
              <span className="text-gray-400"> - </span>
              <span
                className={
                  winner === "Blue"
                    ? "text-blue-300"
                    : winner === "Tie"
                    ? "text-gray-300"
                    : "text-gray-500"
                }
              >
                {blueTotal}
              </span>
            </span>
          ) : (
            <span className="text-[13px] text-gray-500">
              Score not available yet
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 text-[13px] md:flex-row md:items-start md:justify-between">
        <div className="md:flex-1">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-red-300">
            Red alliance
          </div>
          {redTeams.length ? (
            <div className="flex flex-wrap gap-1.5">
              {redTeams.map((tn) => renderTeamNumber(tn, "red"))}
            </div>
          ) : (
            <div className="text-[12px] text-gray-500">No red teams</div>
          )}
        </div>
        <div className="md:flex-1 md:text-right">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-blue-300">
            Blue alliance
          </div>
          {blueTeams.length ? (
            <div className="flex flex-wrap justify-start md:justify-end gap-1.5">
              {blueTeams.map((tn) => renderTeamNumber(tn, "blue"))}
            </div>
          ) : (
            <div className="text-[12px] text-gray-500">No blue teams</div>
          )}
        </div>
      </div>

      {scoreLoading && !scoreError && (
        <div className="text-[13px] text-gray-400">
          Loading detailed score breakdown...
        </div>
      )}
      {!scoreLoading && scoreError && (
        <div className="text-[13px] text-red-400">{scoreError}</div>
      )}
      {!scoreLoading && !scoreError && score && (
        <MatchScoreTable score={score as any} />
      )}
      {!scoreLoading && !scoreError && score === null && (
        <div className="text-[13px] text-gray-500">
          No score details available for this match yet.
        </div>
      )}
    </div>
  );
}

/* ---------- Dynamic score table helpers ---------- */

/**
 * Turn a raw alliance key like "autoArtifactPoints" into a nice label.
 * Handles RP keys specially.
 */
function humanizeKey(key: string): string {
  if (key === "movementRP") return "RP: Movement";
  if (key === "goalRP") return "RP: Goal";
  if (key === "patternRP") return "RP: Pattern";

  // Generic "ends with RP" heuristic
  if (key.endsWith("RP")) {
    const base = key.slice(0, -2);
    const spaced = base
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .trim();
    const titled = spaced
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return `RP: ${titled}`;
  }

  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

  return spaced
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Compact score breakdown used inside each match card.
 * Categories are derived dynamically from whatever the API returns.
 */
function MatchScoreTable({ score }: { score: any }) {
  const alliances = getAlliancesFromScore(score);

  const red = alliances.find(
    (a) => (a.alliance ?? "").toString().toLowerCase() === "red"
  );
  const blue = alliances.find(
    (a) => (a.alliance ?? "").toString().toLowerCase() === "blue"
  );

  if (!red && !blue) {
    return null;
  }

  // Collect all scalar keys (numbers / booleans / strings) across red + blue
  const keySet = new Set<string>();

  const addKeysFrom = (obj: any) => {
    if (!obj) return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === undefined || v === null) continue;
      // Ignore obviously structural fields
      if (k === "alliance" || k === "team") continue;
      // Only show primitive values, not arrays/objects
      if (typeof v === "object") continue;
      keySet.add(k);
    }
  };

  addKeysFrom(red);
  addKeysFrom(blue);

  const allKeys = Array.from(keySet);

  if (allKeys.length === 0) {
    return null;
  }

  // Preferred ordering for common FTC stats; rest go alphabetically.
  const preferredOrder = [
    "autoPoints",
    "teleopPoints",
    "totalPoints",
    "autoArtifactPoints",
    "teleopArtifactPoints",
    "autoPatternPoints",
    "teleopPatternPoints",
    "autoLeavePoints",
    "leavePoints",
    "teleopBasePoints",
    "basePoints",
    "foulPointsCommitted",
    "majorFouls",
    "minorFouls",
    "movementRP",
    "goalRP",
    "patternRP",
  ];

  const orderedKeys: string[] = [];
  for (const key of preferredOrder) {
    if (allKeys.includes(key)) orderedKeys.push(key);
  }
  const remainingKeys = allKeys.filter((k) => !preferredOrder.includes(k));
  remainingKeys.sort((a, b) => a.localeCompare(b));
  orderedKeys.push(...remainingKeys);

  const boldKeys = new Set<string>([
    "autoPoints",
    "teleopPoints",
    "totalPoints",
  ]);

  const formatVal = (val: any) => {
    if (typeof val === "boolean") return val ? "✓" : "";
    if (val === 0) return 0;
    return val ?? "–";
  };

  const row = (key: string) => {
    const redVal = red ? (red as any)[key] : undefined;
    const blueVal = blue ? (blue as any)[key] : undefined;
    const label = humanizeKey(key);
    const bold = boldKeys.has(key);

    return (
      <div
        key={key}
        className={`contents ${bold ? "font-semibold text-gray-100" : ""}`}
      >
        <div className="py-0.5 pr-2 text-gray-300">{label}</div>
        <div className="py-0.5 text-red-200 text-right">
          {formatVal(redVal)}
        </div>
        <div className="py-0.5 text-blue-200 text-right">
          {formatVal(blueVal)}
        </div>
      </div>
    );
  };

  return (
    <div className="text-[14px] text-gray-100 bg-black/50 rounded px-2 py-2 mt-1">
      <div className="flex items-center justify-between mb-1">
        <span className="uppercase tracking-wide text-[9px] text-gray-400">
          Score breakdown
        </span>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
        <div></div>
        <div className="pb-1 text-center font-semibold text-red-300 border-b border-white/10">
          Red
        </div>
        <div className="pb-1 text-center font-semibold text-blue-300 border-b border-white/10">
          Blue
        </div>

        {orderedKeys.map(row)}
      </div>
    </div>
  );
}
