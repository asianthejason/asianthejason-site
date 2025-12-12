// app/ftc-teams/page.tsx
import { headers } from "next/headers";
import { FtcTeamsShell } from "./FtcTeamsShell";

export const dynamic = "force-dynamic";

const SEASON = 2025;

// Map 2-letter country codes from Vercel to the string you expect
// in the FTC data / UI. Extend this as needed.
function mapCountryCodeToName(code: string | null): string | undefined {
  if (!code) return undefined;

  switch (code.toUpperCase()) {
    case "CA":
      return "Canada";
    case "US":
    case "USA":
      return "USA";
    case "MX":
      return "Mexico";
    default:
      return undefined;
  }
}

// Make the page component async so we can await headers()
export default async function FtcTeamsPage() {
  const h = await headers();
  const vercelCountryCode = h.get("x-vercel-ip-country");
  const initialCountry = mapCountryCodeToName(vercelCountryCode);

  return <FtcTeamsShell season={SEASON} initialCountry={initialCountry} />;
}
