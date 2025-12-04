// app/ftc-debug/page.tsx
import { getAllFtcTeamsForSeason } from "@/lib/ftcEvents";

export const dynamic = "force-dynamic";

export default async function FtcDebugPage() {
  const teams = await getAllFtcTeamsForSeason(2025);
  const sample = teams.slice(0, 5); // just a few

  return (
    <pre className="text-xs whitespace-pre-wrap p-4">
      {JSON.stringify(sample, null, 2)}
    </pre>
  );
}
