// app/ftc-teams/TeamsClient.tsx
"use client";

import { useMemo, useState } from "react";
import type { FtcTeam } from "@/lib/ftcEvents";

interface TeamsClientProps {
  teams: FtcTeam[];
}

function getDisplayName(t: FtcTeam): string {
  const shortName = (t.nameShort ?? "").toString().trim();
  const fullName = (t.nameFull ?? "").toString().trim();
  return shortName || fullName || "";
}

export default function TeamsClient({ teams }: TeamsClientProps) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const stateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teams
            .map((t) => (t.stateProv ?? "").toString().trim())
            .filter((s) => s !== ""),
        ),
      ).sort(),
    [teams],
  );

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teams
            .map((t) => (t.country ?? "").toString().trim())
            .filter((c) => c !== ""),
        ),
      ).sort(),
    [teams],
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
      const displayNum = (t.displayTeamNumber ?? "").toString().toLowerCase();
      const name = getDisplayName(t).toLowerCase();

      const numStr = num ? String(num) : "";

      return (
        numStr.includes(q) ||
        displayNum.includes(q) ||
        name.includes(q)
      );
    });
  }, [teams, search, stateFilter, countryFilter]);

  return (
    <section className="space-y-3">
      {/* Controls */}
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
          <label className="block text-xs text-gray-400 mb-1">State / Prov</label>
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

      {/* Table */}
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
            {filteredTeams.map((t) => (
              <tr
                key={t.teamNumber ?? Math.random()}
                className="hover:bg-white/5"
              >
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {t.teamNumber ?? ""}
                </td>
                <td className="px-3 py-1.5 align-top max-w-xs w-64 whitespace-normal break-words">
                  {getDisplayName(t)}
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
