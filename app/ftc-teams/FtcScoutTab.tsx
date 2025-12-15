// app/ftc-teams/FtcScoutTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoutEvent, ScoutTeamPerformance } from "@/lib/ftcScout";

type FtcScoutTabProps = {
  season: number;
};

type EventGroup = {
  label: string; // e.g. "Canada", "United States", "Mexico", etc.
  events: ScoutEvent[];
};

type SelectedEvent = {
  season: number;
  event: ScoutEvent;
};

export function FtcScoutTab({ season }: FtcScoutTabProps) {
  const [events, setEvents] = useState<ScoutEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("");

  const [selected, setSelected] = useState<SelectedEvent | null>(null);

  // Load events when tab first used
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/ftc-scout/events?season=${encodeURIComponent(season)}`
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setEvents(data.events ?? []);
        }
      } catch (err: any) {
        console.error("Error loading FTCScout events", err);
        if (!cancelled) {
          setError(
            err?.message ??
              "Failed to load FTCScout events. Try again later or check the API docs."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [season]);

  const countryOptions = useMemo(() => {
    return Array.from(
      new Set(
        events
          .map((e) => (e.country || "").toString().trim())
          .filter((c) => c !== "")
      )
    ).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    const s = search.trim().toLowerCase();
    return events.filter((e) => {
      if (countryFilter && (e.country || "") !== countryFilter) return false;

      if (!s) return true;

      const haystack = [
        e.name || "",
        e.eventKey || "",
        e.city || "",
        e.stateProv || "",
        e.country || "",
        e.region || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(s);
    });
  }, [events, search, countryFilter]);

  const groupedByCountry: EventGroup[] = useMemo(() => {
    const map = new Map<string, ScoutEvent[]>();

    for (const e of filteredEvents) {
      const label = (e.country || e.region || "Unknown region").toString();
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(e);
    }

    const groups: EventGroup[] = Array.from(map.entries()).map(
      ([label, groupEvents]) => ({
        label,
        events: groupEvents.sort((a, b) => {
          const aDate = a.startDate ? Date.parse(a.startDate) : 0;
          const bDate = b.startDate ? Date.parse(b.startDate) : 0;
          return aDate - bDate;
        }),
      })
    );

    groups.sort((a, b) => a.label.localeCompare(b.label));
    return groups;
  }, [filteredEvents]);

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return "Date TBA";

    const fmt = new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
    });

    const safeParse = (d?: string | null) =>
      d ? new Date(d) : undefined;

    const s = safeParse(start);
    const e = safeParse(end);

    if (s && e) {
      if (s.toDateString() === e.toDateString()) {
        return fmt.format(s);
      }
      return `${fmt.format(s)} – ${fmt.format(e)}`;
    }
    if (s) return fmt.format(s);
    if (e) return fmt.format(e);
    return "Date TBA";
  };

  return (
    <div className="space-y-4">
      {/* Filters for events */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[14px] text-gray-400 mb-1">
            Search events
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Event name, code, city…"
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-white/40"
          />
        </div>

        <div className="min-w-[160px]">
          <label className="block text-[14px] text-gray-400 mb-1">
            Country / Region
          </label>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-white/40"
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

      {/* Status / errors */}
      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p className="font-semibold mb-1">Error loading FTCScout events</p>
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="rounded-xl border border-white/10 px-6 py-10 flex flex-col items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
          <p className="text-sm text-gray-200">
            Loading FTCScout events for season {season}…
          </p>
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <p className="text-sm text-gray-300">
          No events found for the current filters. Try clearing the search or
          country filter, or double-check the FTCScout query parameters in
          <code className="ml-1 px-1 rounded bg-black/40 text-xs">
            lib/ftcScout.ts
          </code>
          .
        </p>
      )}

      {/* Grouped event list */}
      {!loading && !error && filteredEvents.length > 0 && (
        <div className="space-y-4">
          {groupedByCountry.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200">
                {group.label}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.events.map((e) => (
                  <button
                    key={e.eventKey}
                    type="button"
                    onClick={() => setSelected({ season, event: e })}
                    className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white truncate">
                        {e.name}
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/20 text-gray-200">
                        {e.eventKey}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-300">
                      {formatDateRange(e.startDate, e.endDate)}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {[e.city, e.stateProv, e.country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {e.region && (
                      <div className="mt-1 text-[11px] text-indigo-200">
                        {e.region}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-indigo-200">
                      Click to view team performance →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <EventTeamsModal
          selected={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ========= Modal for team performance ========= */

type EventTeamsModalProps = {
  selected: SelectedEvent;
  onClose: () => void;
};

function EventTeamsModal({ selected, onClose }: EventTeamsModalProps) {
  const { event, season } = selected;
  const [teams, setTeams] = useState<ScoutTeamPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/ftc-scout/events/${encodeURIComponent(
            event.eventKey
          )}/teams?season=${encodeURIComponent(season)}`
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setTeams(data.teams ?? []);
        }
      } catch (err: any) {
        console.error("Error loading FTCScout teams for event", err);
        if (!cancelled) {
          setError(
            err?.message ??
              "Failed to load team performance from FTCScout for this event."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [event.eventKey, season]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#050608]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">
              FTCScout · Season {season}
            </div>
            <h2 className="text-sm font-semibold text-white">
              {event.name}{" "}
              <span className="ml-2 text-xs font-normal text-gray-300">
                ({event.eventKey})
              </span>
            </h2>
            <div className="mt-1 text-xs text-gray-400">
              {[event.city, event.stateProv, event.country]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-4 pb-5 overflow-auto max-h-[70vh]">
          {error && (
            <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading && !error && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
              <p className="text-sm text-gray-200">
                Loading team performance from FTCScout…
              </p>
            </div>
          )}

          {!loading && !error && teams.length === 0 && (
            <p className="text-sm text-gray-300">
              No team performance data returned. Double-check the FTCScout
              endpoint mapping in
              <code className="ml-1 px-1 rounded bg-black/40 text-xs">
                lib/ftcScout.ts
              </code>
              .
            </p>
          )}

          {!loading && !error && teams.length > 0 && (
            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <table className="min-w-full text-[13px]">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      Team #
                    </th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      Team Name
                    </th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      Rank
                    </th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      MP
                    </th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      W–L–T
                    </th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      OPR
                    </th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      DPR
                    </th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      CCWM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.teamNumber} className="border-t border-white/5">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {t.teamNumber}
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate">
                        {t.teamName || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.rank ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.matchesPlayed ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {[
                          t.wins ?? 0,
                          t.losses ?? 0,
                          t.ties ?? 0,
                        ].join("-")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.opr !== null && t.opr !== undefined
                          ? t.opr.toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.dpr !== null && t.dpr !== undefined
                          ? t.dpr.toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.ccwm !== null && t.ccwm !== undefined
                          ? t.ccwm.toFixed(2)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
