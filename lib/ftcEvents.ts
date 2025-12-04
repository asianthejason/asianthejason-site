// src/lib/ftcEvents.ts
import "server-only";

const FTC_API_BASE = "https://ftc-events.firstinspires.org/v2.0";

export interface FtcTeam {
  teamNumber?: number;
  teamNameShort?: string;
  teamNameLong?: string;
  city?: string;
  stateProv?: string;
  country?: string;
  rookieYear?: number;
  [key: string]: unknown; // allow extra fields from the API
}

interface FtcTeamsResponse {
  teams?: FtcTeam[];
  count?: number;
  pageCurrent?: number;
  pageTotal?: number;
  // other metadata fields exist; we only care about these
}

function getAuthHeader(): string {
  const username = process.env.FTC_API_USERNAME;
  const token = process.env.FTC_API_TOKEN;

  if (!username || !token) {
    throw new Error(
      "Missing FTC_API_USERNAME or FTC_API_TOKEN in environment (.env.local / Vercel)",
    );
  }

  // HTTP Basic Auth: base64("username:token")
  const authString = Buffer.from(`${username}:${token}`).toString("base64");
  return `Basic ${authString}`;
}

/**
 * Low-level FTC API fetch helper.
 */
async function fetchFtc<T>(
  path: string,
  query: Record<string, string | number | undefined> = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.append(key, String(value));
  }

  const url =
    `${FTC_API_BASE}${path}` +
    (params.toString() ? `?${params.toString()}` : "");

  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `FTC API error ${res.status} ${res.statusText} for ${url}:\n${body}`,
    );
  }

  return (await res.json()) as T;
}

/**
 * Fetch ALL teams for a given season, following pagination.
 */
export async function getAllFtcTeamsForSeason(
  season: number,
): Promise<FtcTeam[]> {
  const all: FtcTeam[] = [];
  let page = 1;

  while (true) {
    const data = await fetchFtc<FtcTeamsResponse>(`/${season}/teams`, {
      page,
      size: 250, // adjust if docs say different; 250 is usually safe
    });

    const teams = data.teams ?? [];
    all.push(...teams);

    // If paging metadata is missing, just stop after one call
    if (!data.pageCurrent || !data.pageTotal) {
      break;
    }

    if (data.pageCurrent >= data.pageTotal) {
      break;
    }

    page += 1;
  }

  return all;
}
