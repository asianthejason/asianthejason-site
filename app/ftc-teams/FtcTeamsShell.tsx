// app/ftc-teams/FtcTeamsShell.tsx
"use client";

import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import { TeamsClient } from "./TeamsClient";
import type { FtcTeam } from "@/lib/ftcEvents";

type FtcTeamsShellProps = {
  season: number;
  teams: FtcTeam[];
  loadError: string | null;
};

export function FtcTeamsShell({
  season,
  teams,
  loadError,
}: FtcTeamsShellProps) {
  const currentYear = new Date().getFullYear();

  return (
    <main className="site">
      {/* Shared header nav (same as rest of the site) */}
      <SiteHeader
        // Just show nav + Sign in/Sign up + Donate, no real auth wiring here
        authReady={true}
        user={null}
        userLabel={null}
        onOpenAuth={() => {}}
        onSignOut={() => {}}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">FTC Teams – Season {season}</h1>
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
            official API. Event data is © FIRST and used under their Events
            Data Terms of Use (non-commercial, educational use only).
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
            No teams returned after filtering. The season might be incorrect,
            you may not have access yet, or the response shape may have
            changed and the helper needs a tweak.
          </p>
        )}

        {!loadError && teams.length > 0 && (
          <TeamsClient season={season} teams={teams} />
        )}

        {/* Shared footer (same markup as the rest of the site) */}
        <footer className="site-footer">
          <span>© {currentYear} AsiantheJason</span>

          <nav className="site-footer-links">
            <Link href="/about" className="site-footer-link">
              About
            </Link>
            <Link href="/privacy-policy" className="site-footer-link">
              Privacy Policy
            </Link>
            <Link href="/terms" className="site-footer-link">
              Terms
            </Link>
            <Link href="/contact" className="site-footer-link">
              Contact
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
