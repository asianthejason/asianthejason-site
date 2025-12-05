// app/ftc-teams/page.tsx
import { getAllFtcTeamsForSeason } from "@/lib/ftcEvents";
import type { FtcTeam } from "@/lib/ftcEvents";
import { TeamsClient } from "./TeamsClient";
import { headers } from "next/headers";

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
  let teams: FtcTeam[] = [];
  let loadError: string | null = null;
  let initialCountryFilter: string | null = null;

  try {
const headersList = await headers();
const countryCodeHeader =
  headersList.get("x-vercel-ip-country") ||
  headersList.get("x-country-code") ||
  headersList.get("cf-ipcountry") ||
  null;

const rawTeams = await getAllFtcTeamsForSeason(SEASON, {
  countryCode: countryCodeHeader,
});

console.log("[ftc-teams] Loaded raw teams from FTC API", {
  season: SEASON,
  countryCodeHeader,
  count: rawTeams.length,
});

// Basic cleanup (remove phantom entries, empty names, etc.)
let cleanedTeams = filterRealTeams(rawTeams);

// Server-side country filter as a fallback, in case the FTC API
// does not support country filtering natively.
if (countryCodeHeader) {
  const codeLower = countryCodeHeader.toLowerCase();

  const normalize = (value: string | null | undefined) =>
    (value ?? "").toString().trim().toLowerCase();

  const matchesCountryCode = (teamCountry: string | null | undefined) => {
    const c = normalize(teamCountry);
    if (!c) return false;

    // direct match on 2-letter code (e.g. "ca", "us")
    if (c === codeLower) return true;

    // handle common spellings / names
    if (codeLower === "us" || codeLower === "usa") {
      return (
        c === "usa" ||
        c === "united states" ||
        c === "united states of america"
      );
    }
    if (codeLower === "ca") {
      return c === "canada" || c === "ca";
    }
    if (codeLower === "gb" || codeLower === "uk") {
      return (
        c === "united kingdom" ||
        c === "great britain" ||
        c === "gb" ||
        c === "uk"
      );
    }

    // also allow values like "CA - Canada" etc.
    return (
      c.startsWith(codeLower + " ") ||
      c.endsWith(" " + codeLower) ||
      c.includes("(" + codeLower + ")")
    );
  };

  const countryFiltered = cleanedTeams.filter((t) =>
    matchesCountryCode(t.country)
  );

  if (countryFiltered.length > 0) {
    console.log("[ftc-teams] Applied server-side country filter", {
      season: SEASON,
      countryCodeHeader,
      before: cleanedTeams.length,
      after: countryFiltered.length,
    });
    cleanedTeams = countryFiltered;
  } else {
    console.log(
      "[ftc-teams] Country filter produced 0 teams; keeping global list",
      { season: SEASON, countryCodeHeader }
    );
  }
}

const sorted = sortTeams(cleanedTeams);
teams = sorted;

if (countryCodeHeader) {
  const codeLower = countryCodeHeader.toLowerCase();
  const variants: string[] = [codeLower];

  if (codeLower === "us") {
    variants.push("usa", "united states", "united states of america");
  } else if (codeLower === "ca") {
    variants.push("canada", "can");
  } else if (codeLower === "gb" || codeLower === "uk") {
    variants.push("united kingdom", "great britain", "gb", "uk");
  }

  const match = teams.find((t) => {
    const c = (t.country ?? "").toString().trim().toLowerCase();
    return c !== "" && variants.includes(c);
  });

  if (match?.country) {
    initialCountryFilter = match.country.toString().trim();
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
        <>
          {initialCountryFilter && (
            <p className="text-xs text-gray-400">
              Showing teams in{" "}
              <span className="font-semibold">{initialCountryFilter}</span>{" "}
              based on your approximate location. You can change this using the
              Country filter in the table below.
            </p>
          )}
          <TeamsClient
            season={SEASON}
            teams={teams}
            initialCountryFilter={initialCountryFilter ?? undefined}
          />
        </>
      )}
    </main>
  );
}