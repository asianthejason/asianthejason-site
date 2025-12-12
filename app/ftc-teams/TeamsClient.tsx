// app/ftc-teams/TeamsClient.tsx
"use client";

import { useMemo, useState, useEffect, useCallback, Fragment } from "react";
import type {
  FtcTeam,
  FtcTeamEvent,
  FtcMatch,
  FtcMatchScores,
} from "@/lib/ftcEvents";

type AuthUserLite = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

type TeamsClientProps = {
  season: number; // current season
  teams: FtcTeam[];
  authReady?: boolean;
  currentUser?: AuthUserLite | null;

  // NEW: initial + callback so the shell can refetch when country changes
  initialCountryFilter?: string;
  onCountryFilterChange?: (value: string) => void;
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
    match.scoreRedFinal ?? // FTC Events /matches field
    match.ScoreRedFinal ?? // just in case of different casing
    null;

  const blueScore: number | null =
    match.blueScore ??
    match.BlueScore ??
    match.blue?.score ??
    match.scoreBlueFinal ?? // FTC Events /matches field
    match.ScoreBlueFinal ?? // just in case
    null;

  return { red: redScore, blue: blueScore };
}

export function TeamsClient({
  season,
  teams,
  authReady = false,
  currentUser = null,
  initialCountryFilter,
  onCountryFilterChange,
}: TeamsClientProps) {
  // === Filters / search ===
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState(""); // "" = All

  // Start the country filter from the server-detected country, if provided.
  const [countryFilter, setCountryFilter] = useState(
    initialCountryFilter ?? ""
  );

  // Keep local state in sync if the prop changes (e.g., season change)
  useEffect(() => {
    if (initialCountryFilter !== undefined) {
      setCountryFilter(initialCountryFilter);
    }
  }, [initialCountryFilter]);

  const handleCountryFilterChange = useCallback(
    (value: string) => {
      setCountryFilter(value);
      if (onCountryFilterChange) {
        onCountryFilterChange(value);
      }
    },
    [onCountryFilterChange]
  );

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

  // === Watch list state (per user, persisted in Firestore) ===
  const [activeTab, setActiveTab] = useState<"directory" | "watchlist">(
    "directory"
  );

  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const isLoggedIn = !!currentUser;

  // Load watch list from Firestore when auth is ready / user changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!authReady || !currentUser) {
      setWatchlist([]);
      setWatchlistLoading(false);
      setWatchlistError(null);
      return;
    }

    const load = async () => {
      try {
        const w = window as any;
        const db = w.db;
        const firebase = w.firebase;

        if (!db || !firebase) {
          console.warn("Firestore not available on window for watch list");
          return;
        }

        setWatchlistLoading(true);
        setWatchlistError(null);

        const docRef = db.collection("ftcTeamWatchlists").doc(currentUser.uid);
        const snap = await docRef.get();

        if (snap.exists) {
          const data = snap.data() || {};
          const raw = Array.isArray(data.teamNumbers) ? data.teamNumbers : [];
          const cleaned = raw
            .map((n: any) => Number(n))
            .filter((n: number) => Number.isFinite(n) && n > 0);
          setWatchlist(cleaned);
        } else {
          setWatchlist([]);
        }
      } catch (err: any) {
        console.error("Error loading watch list", err);
        setWatchlistError(
          err?.message ?? "Failed to load your watch list. Try again later."
        );
      } finally {
        setWatchlistLoading(false);
      }
    };

    load();
  }, [authReady, currentUser?.uid]);

  const persistWatchlist = useCallback(
    async (teamNumbers: number[]) => {
      if (!currentUser) return;

      try {
        const w = window as any;
        const db = w.db;
        const firebase = w.firebase;
        if (!db || !firebase) {
          console.warn("Firestore not available on window for watch list save");
          return;
        }

        const docRef = db.collection("ftcTeamWatchlists").doc(currentUser.uid);
        await docRef.set(
          {
            teamNumbers,
            updatedAt: firebase.firestore.FieldValue?.serverTimestamp?.(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Error saving watch list", err);
      }
    },
    [currentUser]
  );

  const handleToggleWatchlist = useCallback(
    (teamNumber: number) => {
      if (!currentUser) return;

      setWatchlist((prev) => {
        const exists = prev.includes(teamNumber);
        const next = exists
          ? prev.filter((n) => n !== teamNumber)
          : [...prev, teamNumber];

        void persistWatchlist(next);
        return next;
      });
    },
    [currentUser, persistWatchlist]
  );

  const filteredWatchlistTeams = useMemo(() => {
    if (!watchlist || watchlist.length === 0) return [];
    const set = new Set(watchlist);
    return filteredTeams.filter((t) => {
      const num = t.teamNumber;
      return num != null && set.has(num);
    });
  }, [filteredTeams, watchlist]);

  const visibleTeams =
    activeTab === "directory" ? filteredTeams : filteredWatchlistTeams;

  const directorySummary = `Showing ${filteredTeams.length} of ${teams.length} teams`;

  const watchlistSummary = !isLoggedIn
    ? "You must log in to use the watch list feature. Your selected teams are saved to your account."
    : watchlistLoading
    ? "Loading your watch list…"
    : watchlistError
    ? watchlistError
    : watchlist.length === 0
    ? "Your watch list is empty. Go to the Team directory tab and add some teams."
    : `Showing ${visibleTeams.length} of ${watchlist.length} teams in your watch list`;

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

  const eventPerformance = useMemo(() => {
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
  }, [eventInfo.matches, teamNameMap]);

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
        matches: matchesJson.ok ? matchesJson.matches ?? [] : [],
        rankings: rankingsJson.ok ? rankingsJson.rankings ?? [] : [],
        error:
          !matchesJson.ok && !rankingsJson.ok
            ? "Failed to load event matches or rankings."
            : null,
      }));
    } catch (err: any) {
      setEventInfo((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Failed to load event details.",
      }));
    }
  }

  function handleCloseEventInfo() {
    setEventInfo((prev) => ({ ...prev, open: false }));
  }

  // === TEAM EVENT DETAILS MODAL ===
  // ... (unchanged – all your existing handlers + JSX stay the same)

  // === TEAM EXPANSION HANDLER ===
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
        `/api/ftc/team/${teamNumber}/seasons/${seasonYear}/events/${encodeURIComponent(
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

      const matchesStateBefore = getDrilldown(teamNumber);

      const matches = json.matches ?? [];

      setDrilldown(teamNumber, {
        matchesByEventKey: {
          ...matchesStateBefore.matchesByEventKey,
          [matchesKey]: matches,
        },
        loadingMatchesByEventKey: {
          ...matchesStateBefore.loadingMatchesByEventKey,
          [matchesKey]: false,
        },
      });
    } catch (err: any) {
      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        loadingMatchesByEventKey: {
          ...d2.loadingMatchesByEventKey,
          [matchesKey]: false,
        },
        matchesErrorByEventKey: {
          ...d2.matchesErrorByEventKey,
          [matchesKey]: err?.message ?? "Failed to load matches.",
        },
      });
    }
  }

  // ... all your JSX rendering for filters / tabs / lists / modals ...
  // For brevity I’ll just call out the key filter UI that needs the new handler:

  return (
    <div className="teams-page">
      {/* Filters */}
      <div className="teams-filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by team number or name"
          className="teams-search-input"
        />

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="teams-filter-select"
        >
          <option value="">All states / provinces</option>
          {stateOptions.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        <select
          value={countryFilter}
          onChange={(e) => handleCountryFilterChange(e.target.value)}
          className="teams-filter-select"
        >
          <option value="">All countries</option>
          {countryOptions.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      {/* The rest of your directory/watchlist UI, including tabs and team list,
          can stay exactly as you have it now; just make sure it uses
          `visibleTeams` rather than `teams` directly. */}
      {/* ... */}
    </div>
  );
}
