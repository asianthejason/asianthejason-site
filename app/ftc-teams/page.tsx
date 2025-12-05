// app/ftc-teams/page.tsx
import { getAllFtcTeamsForSeason } from "@/lib/ftcEvents";
import type { FtcTeam } from "@/lib/ftcEvents";
import { headers } from "next/headers";
import { TeamsClient } from "./TeamsClient";

export const dynamic = "force-dynamic";

const SEASON = 2025;

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

    const nameShort = (t.nameShort ?? "").toString().trim();
    const nameFull = (t.nameFull ?? "").toString().trim();
    const city = (t.city ?? "").toString().trim();
    const state = (t.stateProv ?? "").toString().trim();
    const country = (t.country ?? "").toString().trim();

    const hasName = nameShort !== "" || nameFull !== "";
    const hasLocation = city !== "" || state !== "" || country !== "";

    return num > 0 && (hasName || hasLocation);
  });
}

export default async function FtcTeamsPage() {
  const hdrs = headers();
  let teams: FtcTeam[] = [];
  let loadError: string | null = null;
  let initialCountryFilter: string | null = null;

  try {
    const rawTeams = await getAllFtcTeamsForSeason(SEASON);
    teams = sortTeams(filterRealTeams(rawTeams));

    // Infer an initial country filter from Accept-Language header
    const acceptLang =
      hdrs.get("accept-language") || hdrs.get("Accept-Language") || "";
    const firstToken = acceptLang.split(",")[0]?.trim() ?? "";
    const regionMatch = firstToken.match(/-([A-Z]{2})$/i);
    const regionCode = regionMatch?.[1]?.toUpperCase();

    if (regionCode) {
      const regionToCountry: Record<string, string> = {
        US: "USA",
        CA: "Canada",
        MX: "Mexico",
        AU: "Australia",
        NZ: "New Zealand",
        GB: "United Kingdom",
        UK: "United Kingdom",
        IE: "Ireland",
        DE: "Germany",
        FR: "France",
        ES: "Spain",
        IT: "Italy",
        PT: "Portugal",
        NL: "Netherlands",
        BE: "Belgium",
        SE: "Sweden",
        NO: "Norway",
        FI: "Finland",
        DK: "Denmark",
        CH: "Switzerland",
        AT: "Austria",
        CN: "China",
        JP: "Japan",
        KR: "South Korea",
        IN: "India",
      };

      const guess = regionToCountry[regionCode];
      if (guess) {
        const hasTeamsInCountry = teams.some(
          (t) => (t.country ?? "").toString().trim() === guess
        );
        if (hasTeamsInCountry) {
          initialCountryFilter = guess;
        }
      }
    }
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
        <TeamsClient season={SEASON} teams={teams} initialCountryFilter={initialCountryFilter ?? undefined} />
      )}
    </main>
  );
}
