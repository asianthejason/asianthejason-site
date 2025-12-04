// app/ftc-teams/page.tsx
import { getAllFtcTeamsForSeason, FtcTeam } from "@/lib/ftcEvents";

export const dynamic = "force-dynamic"; // always fetch fresh on request

const SEASON = 2025; // change this to the season you want

function sortTeams(teams: FtcTeam[]): FtcTeam[] {
  return [...teams].sort((a, b) => {
    const aNum = a.teamNumber ?? 0;
    const bNum = b.teamNumber ?? 0;
    return aNum - bNum;
  });
}

function filterRealTeams(teams: FtcTeam[]): FtcTeam[] {
  return teams.filter((t) => {
    const num = t.teamNumber ?? 0;

    const city = (t.city as string | undefined)?.trim() ?? "";
    const state = (t.stateProv as string | undefined)?.trim() ?? "";
    const country = (t.country as string | undefined)?.trim() ?? "";

    // Keep only teams with a positive number AND at least one
    // non-empty location field. This removes the 99900+ dummy rows.
    return num > 0 && (city !== "" || state !== "" || country !== "");
  });
}

export default async function FtcTeamsPage() {
  let teams: FtcTeam[] = [];
  let loadError: string | null = null;

  try {
    const rawTeams = await getAllFtcTeamsForSeason(SEASON);
    teams = sortTeams(filterRealTeams(rawTeams));
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Unknown error loading FTC data";
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">FTC Teams – Season {SEASON}</h1>
        <p className="text-sm text-gray-400">
          Data from the{" "}
          <a
            href="https://ftc-events.firstinspires.org/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            FTC Events
          </a>{" "}
          official API. Event data is © FIRST and used under their Events Data
          Terms of Use (non-commercial, educational use only).
        </p>
        <p className="text-xs text-gray-500">
          Event Data provided by FIRST – see{" "}
          <a
            href="https://ftc-events.firstinspires.org/services/API"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            FTC Event Data API
          </a>
          .
        </p>
      </header>

      {loadError && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p className="font-semibold mb-1">Error loading FTC data</p>
          <p className="whitespace-pre-wrap">{loadError}</p>
          <p className="mt-1 opacity-80">
            Check your <code>FTC_API_USERNAME</code> /
            <code>FTC_API_TOKEN</code> env vars and that your server can reach
            <code> ftc-api.firstinspires.org</code>.
          </p>
        </div>
      )}

      {!loadError && teams.length === 0 && (
        <p className="text-sm text-gray-300">
          No teams returned after filtering. The season might be incorrect, you
          may not have access yet, or the response shape may have changed and
          the helper needs a tweak.
        </p>
      )}

      {!loadError && teams.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Team #
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
              {teams.map((t) => (
                <tr
                  key={t.teamNumber ?? Math.random()}
                  className="hover:bg-white/5"
                >
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {t.teamNumber ?? ""}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {(t.city as string) ?? ""}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {(t.stateProv as string) ?? ""}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {(t.country as string) ?? ""}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {t.rookieYear ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
