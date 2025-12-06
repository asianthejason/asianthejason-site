// app/ftc-teams/page.tsx
import { FtcTeamsShell } from "./FtcTeamsShell";

export const dynamic = "force-dynamic";

const SEASON = 2025;

export default function FtcTeamsPage() {
  return <FtcTeamsShell season={SEASON} />;
}
