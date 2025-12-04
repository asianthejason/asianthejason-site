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
  // Seasons a team has played
  seasons?: number[];
  loadingSeasons: boolean;
  seasonsError?: string | null;

  // Which seasons (years) are expanded
  openSeasons: Record<number, boolean>;

  // Season -> events
  eventsBySeason: Record<number, FtcTeamEvent[] | undefined>;
  loadingEventsBySeason: Record<number, boolean>;
  eventsErrorBySeason: Record<number, string | null | undefined>;

  // Which events are expanded (keyed by "season:eventCode")
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

export function TeamsClient({ season, teams }: TeamsClientProps) {
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [expandedTeamNumber, setExpandedTeamNumber] = useState<number | null>(
    null
  );

  const [drilldownByTeam, setDrilldownByTeam] = useState<
    Record<number, DrilldownState>
  >({});

  /* ========= FILTERED VIEW ========= */

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.country) set.add(t.country);
    });
    return Array.from(set).sort();
  }, [teams]);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.stateProv) set.add(t.stateProv);
    });
    return Array.from(set).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (countryFilter !== "ALL" && t.country !== countryFilter) return false;
      if (stateFilter !== "ALL" && t.stateProv !== stateFilter) return false;

      if (!q) return true;

      const num = String(t.teamNumber ?? "").toLowerCase();
      const nameFull = (t.nameFull ?? "").toLowerCase();
      const nameShort = (t.nameShort ?? "").toLowerCase();
      const city = (t.city ?? "").toLowerCase();

      return (
        num.includes(q) ||
        nameFull.includes(q) ||
        nameShort.includes(q) ||
        city.includes(q)
      );
    });
  }, [teams, countryFilter, stateFilter, search]);

  /* ========= DRILLDOWN STATE HELPERS ========= */

  function getDrilldown(teamNumber: number): DrilldownState {
    return (
      drilldownByTeam[teamNumber] ?? {
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
      }
    );
  }

  function setDrilldown(teamNumber: number, patch: Partial<DrilldownState>) {
    setDrilldownByTeam((prev) => ({
      ...prev,
      [teamNumber]: {
        ...getDrilldown(teamNumber),
        ...patch,
      },
    }));
  }

  function eventKey(seasonYear: number, eventCode: string) {
    return `${seasonYear}:${eventCode}`;
  }

  function matchKey(
    seasonYear: number,
    eventCode: string,
    tournamentLevel: string,
    matchNumber: number
  ) {
    return `${seasonYear}:${eventCode}:${tournamentLevel}:${matchNumber}`;
  }

  /* ========= CLICK HANDLERS ========= */

  // TEAM ROW → load list of seasons (years) and auto-open the latest season
  async function handleToggleTeam(team: FtcTeam) {
    const teamNumber = team.teamNumber;
    if (!teamNumber) return;

    // Collapse if already open
    if (expandedTeamNumber === teamNumber) {
      setExpandedTeamNumber(null);
      return;
    }

    // Open this team
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

      const seasonsList = (json.seasons ?? []).slice().sort((a, b) => a - b);

      // Update seasons + open the most recent one
      const latestSeason =
        seasonsList.length > 0 ? seasonsList[seasonsList.length - 1] : undefined;

      const prev = getDrilldown(teamNumber);

      setDrilldown(teamNumber, {
        seasons: seasonsList,
        loadingSeasons: false,
        openSeasons:
          latestSeason !== undefined
            ? { ...prev.openSeasons, [latestSeason]: true }
            : prev.openSeasons,
      });

      // If we have a latest season, immediately load its events so the user
      // sees an accordion open after a single click.
      if (latestSeason !== undefined) {
        await handleToggleSeason(team, latestSeason, {
          forceOpen: true,
          skipToggleIfAlreadyOpen: true,
        });
      }
    } catch (err: any) {
      setDrilldown(teamNumber, {
        loadingSeasons: false,
        seasonsError: err?.message ?? "Failed to load seasons.",
      });
    }
  }

  type SeasonToggleOptions = {
    forceOpen?: boolean;
    skipToggleIfAlreadyOpen?: boolean;
  };

  // SEASON ROW → toggle open + (if opening) load events for that season
  async function handleToggleSeason(
    team: FtcTeam,
    seasonYear: number,
    options: SeasonToggleOptions = {}
  ) {
    const teamNumber = team.teamNumber;
    if (!teamNumber) return;

    const d = getDrilldown(teamNumber);
    const currentlyOpen = !!d.openSeasons[seasonYear];

    const nextOpen = options.forceOpen
      ? true
      : options.skipToggleIfAlreadyOpen && currentlyOpen
      ? true
      : !currentlyOpen;

    // toggle open/close
    setDrilldown(teamNumber, {
      openSeasons: { ...d.openSeasons, [seasonYear]: nextOpen },
    });

    // If we just closed the season, nothing else to do
    if (!nextOpen) return;

    // If events already loaded or currently loading, do nothing
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

      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        eventsBySeason: {
          ...d2.eventsBySeason,
          [seasonYear]: json.events ?? [],
        },
        loadingEventsBySeason: {
          ...d2.loadingEventsBySeason,
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

  // EVENT ROW → toggle open + (if opening) load matches for that team at this event
  async function handleToggleEvent(
    teamNumber: number,
    seasonYear: number,
    event: FtcTeamEvent
  ) {
    const key = eventKey(seasonYear, event.eventCode);
    const d = getDrilldown(teamNumber);

    const currentlyOpen = !!d.openEvents[key];
    const nextOpen = !currentlyOpen;

    // toggle open/close
    setDrilldown(teamNumber, {
      openEvents: {
        ...d.openEvents,
        [key]: nextOpen,
      },
    });

    if (!nextOpen) return;

    const already = d.matchesByEventKey[key];
    const loading = d.loadingMatchesByEventKey[key];

    if (already || loading) return;

    try {
      setDrilldown(teamNumber, {
        loadingMatchesByEventKey: {
          ...d.loadingMatchesByEventKey,
          [key]: true,
        },
        matchesErrorByEventKey: {
          ...d.matchesErrorByEventKey,
          [key]: undefined,
        },
      });

      const res = await fetch(
        `/api/ftc/events/${seasonYear}/${encodeURIComponent(
          event.eventCode
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

      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        matchesByEventKey: {
          ...d2.matchesByEventKey,
          [key]: json.matches ?? [],
        },
        loadingMatchesByEventKey: {
          ...d2.loadingMatchesByEventKey,
          [key]: false,
        },
      });
    } catch (err: any) {
      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        loadingMatchesByEventKey: {
          ...d2.loadingMatchesByEventKey,
          [key]: false,
        },
        matchesErrorByEventKey: {
          ...d2.matchesErrorByEventKey,
          [key]: err?.message ?? "Failed to load matches.",
        },
      });
    }
  }

  // MATCH ROW → toggle open + (if opening) load score details
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

    // toggle open/close
    setDrilldown(teamNumber, {
      openMatches: {
        ...d.openMatches,
        [key]: nextOpen,
      },
    });

    if (!nextOpen) return;

    const already = d.scoresByMatchKey[key];
    const loading = d.loadingScoresByMatchKey[key];

    if (already || loading) return;

    try {
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
        throw new Error(json.error ?? "Failed to fetch match details");
      }

      const d2 = getDrilldown(teamNumber);
      setDrilldown(teamNumber, {
        scoresByMatchKey: {
          ...d2.scoresByMatchKey,
          [key]: json.match ?? null,
        },
        loadingScoresByMatchKey: {
          ...d2.loadingScoresByMatchKey,
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

  /* ========= RENDER ========= */

  return (
    <div className="space-y-4">
      {/* Filters / search – same simple layout as before */}
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <label className="flex items-center gap-2">
          <span className="text-gray-300">Country</span>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
          >
            <option value="ALL">All</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-gray-300">State / Prov</span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
          >
            <option value="ALL">All</option>
            {stateOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
          <span className="text-gray-300">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Team #, name, or city"
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm w-full"
          />
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-900 border-b border-neutral-700">
              <th className="px-3 py-2 text-left font-semibold text-gray-200 w-[5rem]">
                Team #
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-200 max-w-[260px]">
                Team Name
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-200">
                City
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-200 w-[6rem]">
                State / Prov
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-200 w-[7rem]">
                Country
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((t) => {
              const isOpen = expandedTeamNumber === t.teamNumber;
              const d = t.teamNumber ? getDrilldown(t.teamNumber) : undefined;

              return (
                <Fragment key={t.teamNumber}>
                  <tr
                    className={`border-b border-neutral-800 hover:bg-neutral-900 cursor-pointer ${
                      isOpen ? "bg-neutral-900/80" : ""
                    }`}
                    onClick={() => handleToggleTeam(t)}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-100">
                      {t.teamNumber}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-100 max-w-[260px] truncate">
                      {t.nameShort || t.nameFull || "(no name)"}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-200">
                      {t.city ?? ""}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-200">
                      {t.stateProv ?? ""}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-200">
                      {t.country ?? ""}
                    </td>
                  </tr>

                  {isOpen && t.teamNumber && (
                    <tr className="border-b border-neutral-800 bg-neutral-950/70">
                      <td colSpan={5} className="px-4 py-3">
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
                                    className="w-full flex justify-between items-center text-left text-xs bg-neutral-900/70 hover:bg-neutral-800 px-2 py-1 rounded"
                                  >
                                    <span className="font-semibold text-gray-200">
                                      Season {seasonYear}
                                    </span>
                                    <span className="text-gray-400">
                                      {seasonOpen ? "−" : "+"}
                                    </span>
                                  </button>

                                  {/* Events list */}
                                  {seasonOpen && (
                                    <div className="mt-1 ml-4 border-l border-neutral-800 pl-3 space-y-1">
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
                                        const eKey = eventKey(
                                          seasonYear,
                                          ev.eventCode
                                        );
                                        const matches =
                                          d.matchesByEventKey[eKey];
                                        const matchesLoading =
                                          d.loadingMatchesByEventKey[eKey];
                                        const matchesError =
                                          d.matchesErrorByEventKey[eKey];
                                        const eventOpen =
                                          d.openEvents[eKey] ?? false;

                                        return (
                                          <div key={ev.eventCode}>
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
                                              className="w-full flex justify-between items-center text-left text-xs bg-neutral-900/60 hover:bg-neutral-800 px-2 py-1 rounded"
                                            >
                                              <span className="text-gray-200">
                                                {ev.eventName}{" "}
                                                <span className="text-gray-500">
                                                  ({ev.eventCode})
                                                </span>
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
                                              <div className="mt-1 ml-4 border-l border-neutral-800 pl-3 space-y-1">
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
                                                      ev.eventCode,
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

                                                    const redScore =
                                                      m.redScore ??
                                                      m.RedScore ??
                                                      m.red?.score;
                                                    const blueScore =
                                                      m.blueScore ??
                                                      m.BlueScore ??
                                                      m.blue?.score;

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
                                                              ev.eventCode,
                                                              tl,
                                                              mn
                                                            );
                                                          }}
                                                          className="w-full flex justify-between items-center text-left bg-neutral-900/60 hover:bg-neutral-800 px-2 py-1 rounded"
                                                        >
                                                          <span className="text-gray-200">
                                                            {tl.toUpperCase()}{" "}
                                                            #{mn}
                                                          </span>
                                                          <span className="text-gray-300">
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
                                                          <div className="mt-1 ml-4 border-l border-neutral-800 pl-3">
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
                                                                <pre className="text-[10px] text-gray-300 bg-neutral-900/80 rounded px-2 py-1 overflow-x-auto">
                                                                  {JSON.stringify(
                                                                    score,
                                                                    null,
                                                                    2
                                                                  )}
                                                                </pre>
                                                              )}
                                                            {!scoreLoading &&
                                                              !scoreError &&
                                                              score ===
                                                                null && (
                                                                <div className="text-[10px] text-gray-500">
                                                                  No score
                                                                  details
                                                                  returned for
                                                                  this match.
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
    </div>
  );
}
