// app/ftc-teams/TeamsClient.tsx
"use client";

import { useMemo, useState, Fragment } from "react";
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

  // Event -> matches
  matchesByEventKey: Record<string, FtcMatch[] | undefined>;
  loadingMatchesByEventKey: Record<string, boolean>;
  matchesErrorByEventKey: Record<string, string | null | undefined>;

  // Which matches are expanded (keyed by "season:eventCode:tLevel:matchNumber")
  openMatches: Record<string, boolean>;

  // Match -> score details
  scoresByMatchKey: Record<string, FtcMatchScores | null | undefined>;
  loadingScoresByMatchKey: Record<string, boolean>;
  scoresErrorByMatchKey: Record<string, string | null | undefined>;
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
    openMatches: {},
    scoresByMatchKey: {},
    loadingScoresByMatchKey: {},
    scoresErrorByMatchKey: {},
  };
}

export function TeamsClient({ season, teams }: TeamsClientProps) {
  // === Filters / search (old UI behaviour) ===
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

  // === Drilldown state ===
  const [expandedTeamNumber, setExpandedTeamNumber] = useState<number | null>(
    null
  );

  const [drilldownByTeam, setDrilldownByTeam] = useState<
    Record<number, DrilldownState>
  >({});

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

  // === SHARED SCORE-LOADING HELPER ===

  async function ensureScoreLoaded(
    teamNumber: number,
    seasonYear: number,
    eventCode: string,
    tournamentLevel: string,
    matchNumber: number
  ) {
    const key = matchKey(seasonYear, eventCode, tournamentLevel, matchNumber);
    let d = getDrilldown(teamNumber);

    // Already have data or loading in progress
    if (
      d.scoresByMatchKey[key] !== undefined ||
      d.loadingScoresByMatchKey[key]
    ) {
      return;
    }

    setDrilldown(teamNumber, {
      loadingScoresByMatchKey: {
        ...d.loadingScoresByMatchKey,
        [key]: true,
      },
      scoresErrorByMatchKey: {
        ...d.scoresErrorByMatchKey,
        [key]: undefined,
      },
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
          d = getDrilldown(teamNumber);
          setDrilldown(teamNumber, {
            scoresByMatchKey: {
              ...d.scoresByMatchKey,
              [key]: null,
            },
            loadingScoresByMatchKey: {
              ...d.loadingScoresByMatchKey,
              [key]: false,
            },
            scoresErrorByMatchKey: {
              ...d.scoresErrorByMatchKey,
              [key]: null,
            },
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

      d = getDrilldown(teamNumber);

      if (!json.ok) {
        setDrilldown(teamNumber, {
          scoresByMatchKey: {
            ...d.scoresByMatchKey,
            [key]: null,
          },
          loadingScoresByMatchKey: {
            ...d.loadingScoresByMatchKey,
            [key]: false,
          },
          scoresErrorByMatchKey: {
            ...d.scoresErrorByMatchKey,
            [key]: null,
          },
        });
        return;
      }

      setDrilldown(teamNumber, {
        scoresByMatchKey: {
          ...d.scoresByMatchKey,
          [key]: json.match ?? null,
        },
        loadingScoresByMatchKey: {
          ...d.loadingScoresByMatchKey,
          [key]: false,
        },
      });
    } catch (err: any) {
      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        loadingScoresByMatchKey: {
          ...d2.loadingScoresByMatchKey,
          [key]: false,
        },
        scoresErrorByMatchKey: {
          ...d2.scoresErrorByMatchKey,
          [key]: err?.message ?? "Failed to load score details.",
        },
      });
    }
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

  // EVENT ROW → toggle open + lazy-load matches
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
    const already = d.matchesByEventKey[matchesKey];
    const loading = d.loadingMatchesByEventKey[matchesKey];

    if (already || loading) return;

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
        )}/matches?teamNumber=${teamNumber}`
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

      // === NEW: preload all match scores in the background ===
      const eventCode = event.eventCode ?? "";
      for (const m of matches as any[]) {
        const tl = m.tournamentLevel || m.TournamentLevel || "qual";
        const mn = m.matchNumber || m.MatchNumber || 0;
        if (!mn) continue;
        // fire-and-forget; don't await, we just want the cache filled
        void ensureScoreLoaded(teamNumber, seasonYear, eventCode, tl, mn);
      }
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

  // MATCH ROW → toggle open + (if needed) ensure score is loaded
  async function handleToggleMatch(
    teamNumber: number,
    seasonYear: number,
    eventCode: string,
    tournamentLevel: string,
    matchNumber: number
  ) {
    const key = matchKey(
      seasonYear,
      eventCode,
      tournamentLevel,
      matchNumber
    );
    const d = getDrilldown(teamNumber);

    const currentlyOpen = !!d.openMatches[key];
    const nextOpen = !currentlyOpen;

    setDrilldown(teamNumber, {
      openMatches: { ...d.openMatches, [key]: nextOpen },
    });

    if (!nextOpen) return;

    // If preloading hasn't fetched yet, make sure we have the score
    await ensureScoreLoaded(
      teamNumber,
      seasonYear,
      eventCode,
      tournamentLevel,
      matchNumber
    );
  }

  // === RENDER ===

  return (
    <section className="space-y-3">
      {/* Controls – your original UI */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-400 mb-1">
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
          <label className="block text-xs text-gray-400 mb-1">
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
          <label className="block text-xs text-gray-400 mb-1">Country</label>
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

      <p className="text-xs text-gray-400">
        Showing {filteredTeams.length} of {teams.length} teams
      </p>

      {/* Table with accordion */}
      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="min-w-full text-sm">
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
            {filteredTeams.map((t) => {
              const isOpen = expandedTeamNumber === t.teamNumber;
              const d = t.teamNumber ? getDrilldown(t.teamNumber) : undefined;

              return (
                <Fragment key={t.teamNumber ?? Math.random()}>
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
                  {isOpen && t.teamNumber && (
                    <tr className="bg-black/40">
                      <td colSpan={6} className="px-4 py-3">
                        {/* Seasons / events / matches accordion */}
                        {d?.loadingSeasons && (
                          <div className="text-xs text-gray-400">
                            Loading seasons…
                          </div>
                        )}
                        {d?.seasonsError && (
                          <div className="text-xs text-red-400">
                            {d.seasonsError}
                          </div>
                        )}
                        {d?.seasons && d.seasons.length === 0 && (
                          <div className="text-xs text-gray-400">
                            No seasons found for this team.
                          </div>
                        )}

                        {d?.seasons && d.seasons.length > 0 && (
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
                                    className="w-full flex justify-between items-center text-left text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
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
                                        <div className="text-xs text-gray-400">
                                          Loading events…
                                        </div>
                                      )}
                                      {eventsError && (
                                        <div className="text-xs text-red-400">
                                          {eventsError}
                                        </div>
                                      )}
                                      {!eventsLoading &&
                                        !eventsError &&
                                        events.length === 0 && (
                                          <div className="text-xs text-gray-500">
                                            No events recorded.
                                          </div>
                                        )}

                                      {events.map((ev) => {
                                        const stateKey = getEventKeyForState(
                                          seasonYear,
                                          ev
                                        );
                                        const matches =
                                          d.matchesByEventKey[stateKey];
                                        const matchesLoading =
                                          d.loadingMatchesByEventKey[stateKey];
                                        const matchesError =
                                          d.matchesErrorByEventKey[stateKey];
                                        const eventOpen =
                                          d.openEvents[stateKey] ?? false;

                                        return (
                                          <div key={stateKey}>
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
                                              className="w-full flex justify-between items-center text-left text-xs bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded"
                                            >
                                              <span className="text-gray-100">
                                                {ev.eventName}{" "}
                                                {ev.eventCode && (
                                                  <span className="text-gray-400">
                                                    ({ev.eventCode})
                                                  </span>
                                                )}
                                              </span>
                                              <span className="flex items-center gap-2 text-gray-400 text-[10px]">
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

                                            {/* Matches */}
                                            {eventOpen && (
                                              <div className="mt-1 ml-4 border-l border-white/10 pl-3 space-y-1">
                                                {matchesLoading && (
                                                  <div className="text-[11px] text-gray-400">
                                                    Loading matches…
                                                  </div>
                                                )}
                                                {matchesError && (
                                                  <div className="text-[11px] text-red-400">
                                                    {matchesError}
                                                  </div>
                                                )}
                                                {!matchesLoading &&
                                                  !matchesError &&
                                                  matches &&
                                                  matches.length === 0 && (
                                                    <div className="text-[11px] text-gray-500">
                                                      No matches found for this
                                                      event.
                                                    </div>
                                                  )}

                                                {matches &&
                                                  matches.map((m: any) => {
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
                                                      d.scoresByMatchKey[
                                                        mKey
                                                      ];
                                                    const scoreLoading =
                                                      d
                                                        .loadingScoresByMatchKey[
                                                        mKey
                                                      ];
                                                    const scoreError =
                                                      d
                                                        .scoresErrorByMatchKey[
                                                        mKey
                                                      ];
                                                    const matchOpen =
                                                      d.openMatches[mKey] ??
                                                      false;

                                                    // Derive red/blue scores:
                                                    let redScore: number | null =
                                                      m.redScore ??
                                                      m.RedScore ??
                                                      m.red?.score ??
                                                      null;
                                                    let blueScore: number | null =
                                                      m.blueScore ??
                                                      m.BlueScore ??
                                                      m.blue?.score ??
                                                      null;

                                                    // If match listing doesn’t have scores, pull from preloaded score JSON
                                                    const alliances = Array.isArray(
                                                      (score as any)?.alliances
                                                    )
                                                      ? (score as any)
                                                          .alliances
                                                      : [];

                                                    const redAlliance =
                                                      alliances.find(
                                                        (a: any) =>
                                                          (a.alliance ?? "")
                                                            .toString()
                                                            .toLowerCase() ===
                                                          "red"
                                                      );
                                                    const blueAlliance =
                                                      alliances.find(
                                                        (a: any) =>
                                                          (a.alliance ?? "")
                                                            .toString()
                                                            .toLowerCase() ===
                                                          "blue"
                                                      );

                                                    if (
                                                      redScore == null &&
                                                      redAlliance
                                                    ) {
                                                      redScore =
                                                        redAlliance.totalPoints ??
                                                        null;
                                                    }
                                                    if (
                                                      blueScore == null &&
                                                      blueAlliance
                                                    ) {
                                                      blueScore =
                                                        blueAlliance.totalPoints ??
                                                        null;
                                                    }

                                                    return (
                                                      <div
                                                        key={mKey}
                                                        className="text-[11px]"
                                                      >
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleMatch(
                                                              t.teamNumber!,
                                                              seasonYear,
                                                              ev.eventCode ??
                                                                "",
                                                              tl,
                                                              mn
                                                            );
                                                          }}
                                                          className="w-full flex justify-between items-center text-left bg-white/[0.03] hover:bg-white/[0.07] px-2 py-1 rounded"
                                                        >
                                                          <span className="text-gray-100">
                                                            {tl.toUpperCase()}{" "}
                                                            #{mn}
                                                          </span>
                                                          <span className="text-gray-200">
                                                            {redScore ??
                                                              "?"}{" "}
                                                            <span className="text-red-400">
                                                              Red
                                                            </span>{" "}
                                                            –{" "}
                                                            <span className="text-blue-400">
                                                              Blue
                                                            </span>{" "}
                                                            {blueScore ?? "?"}
                                                          </span>
                                                        </button>

                                                        {/* Score details */}
                                                        {matchOpen && (
                                                          <div className="mt-1 ml-4 border-l border-white/10 pl-3">
                                                            {scoreLoading && (
                                                              <div className="text-[10px] text-gray-400">
                                                                Loading score
                                                                details…
                                                              </div>
                                                            )}
                                                            {scoreError && (
                                                              <div className="text-[10px] text-red-400">
                                                                {scoreError}
                                                              </div>
                                                            )}
                                                            {!scoreLoading &&
                                                              !scoreError &&
                                                              score && (
                                                                <MatchScoreTable
                                                                  score={
                                                                    score as any
                                                                  }
                                                                />
                                                              )}
                                                            {!scoreLoading &&
                                                              !scoreError &&
                                                              score ===
                                                                null && (
                                                                <div className="text-[10px] text-gray-500">
                                                                  No score
                                                                  details
                                                                  available for
                                                                  this match
                                                                  yet.
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
  );
}

/**
 * Small “chart” / scoreboard for a match:
 *   Red vs Blue, with auto / teleop / total / fouls / RP.
 */
function MatchScoreTable({ score }: { score: any }) {
  const alliances: any[] = Array.isArray(score?.alliances)
    ? score.alliances
    : [];

  const red = alliances.find(
    (a) => (a.alliance ?? "").toString().toLowerCase() === "red"
  );
  const blue = alliances.find(
    (a) => (a.alliance ?? "").toString().toLowerCase() === "blue"
  );

  const redTotal = red?.totalPoints ?? 0;
  const blueTotal = blue?.totalPoints ?? 0;

  let winner: "Red" | "Blue" | "Tie" | null = null;
  if (redTotal > blueTotal) winner = "Red";
  else if (blueTotal > redTotal) winner = "Blue";
  else if (redTotal === blueTotal && redTotal !== 0) winner = "Tie";

  const row = (
    label: string,
    redVal: any,
    blueVal: any,
    opts: { bold?: boolean } = {}
  ) => (
    <div
      className={`contents ${opts.bold ? "font-semibold text-gray-100" : ""}`}
    >
      <div className="py-0.5 pr-2 text-gray-300">{label}</div>
      <div className="py-0.5 text-red-200 text-right">
        {redVal ?? redVal === 0 ? redVal : "–"}
      </div>
      <div className="py-0.5 text-blue-200 text-right">
        {blueVal ?? blueVal === 0 ? blueVal : "–"}
      </div>
    </div>
  );

  return (
    <div className="text-[10px] text-gray-100 bg-black/60 rounded px-2 py-2 mt-1 inline-block min-w-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="uppercase tracking-wide text-[9px] text-gray-400">
          Score breakdown
        </span>
        {winner && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10">
            {winner === "Tie" ? "Tie game" : `${winner} wins`}
          </span>
        )}
      </div>

      {/* Grid “chart” */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
        <div></div>
        <div className="pb-1 text-center font-semibold text-red-300 border-b border-white/10">
          Red
        </div>
        <div className="pb-1 text-center font-semibold text-blue-300 border-b border-white/10">
          Blue
        </div>

        {row("Auto points", red?.autoPoints, blue?.autoPoints)}
        {row("Teleop points", red?.teleopPoints, blue?.teleopPoints)}
        {row(
          "Total points",
          red?.totalPoints,
          blue?.totalPoints,
          { bold: true }
        )}

        {row("Auto artifacts", red?.autoArtifactPoints, blue?.autoArtifactPoints)}
        {row(
          "Teleop artifacts",
          red?.teleopArtifactPoints,
          blue?.teleopArtifactPoints
        )}
        {row("Patterns", red?.autoPatternPoints, blue?.autoPatternPoints)}
        {row(
          "Teleop patterns",
          red?.teleopPatternPoints,
          blue?.teleopPatternPoints
        )}

        {row("Leave points", red?.autoLeavePoints, blue?.autoLeavePoints)}
        {row("Base points", red?.teleopBasePoints, blue?.teleopBasePoints)}

        {row(
          "Major fouls",
          red?.majorFouls,
          blue?.majorFouls
        )}
        {row(
          "Minor fouls",
          red?.minorFouls,
          blue?.minorFouls
        )}

        {row(
          "RP: Movement",
          red?.movementRP ? "✓" : "",
          blue?.movementRP ? "✓" : ""
        )}
        {row(
          "RP: Goal",
          red?.goalRP ? "✓" : "",
          blue?.goalRP ? "✓" : ""
        )}
        {row(
          "RP: Pattern",
          red?.patternRP ? "✓" : "",
          blue?.patternRP ? "✓" : ""
        )}
      </div>
    </div>
  );
}
