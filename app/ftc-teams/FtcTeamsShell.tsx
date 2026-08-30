// app/ftc-teams/FtcTeamsShell.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { TeamsClient } from "./TeamsClient";
import type { FtcTeam } from "@/lib/ftcEvents";
import { useAuth } from "@/lib/useAuth";

type FtcTeamsShellProps = {
  season: number;
  initialCountry?: string;
};



export function FtcTeamsShell({ season, initialCountry }: FtcTeamsShellProps) {
  const currentYear = new Date().getFullYear();

  // ---------- Teams data (client-side) ----------
  const [teams, setTeams] = useState<FtcTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // Which country weâ€™re currently fetching from the API for.
  // "" = all countries.
  const [selectedCountryForFetch, setSelectedCountryForFetch] = useState(
    initialCountry ?? ""
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      setTeamsLoading(true);
      setTeamsError(null);

      try {
        const params = new URLSearchParams();
        if (selectedCountryForFetch) {
          params.set("country", selectedCountryForFetch);
        }
        const query = params.toString();
        const url = `/api/ftc/teams/${season}` + (query ? `?${query}` : "");

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as {
          ok: boolean;
          teams?: FtcTeam[];
          error?: string;
        };

        if (!json.ok) {
          throw new Error(json.error ?? "Failed to load teams.");
        }

        if (!cancelled) {
          setTeams(json.teams ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error loading FTC teams", err);
          setTeamsError(
            err?.message ?? "Unknown error loading FTC data."
          );
        }
      } finally {
        if (!cancelled) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, [season, selectedCountryForFetch]);
  const {
    currentUser, authReady, showAuthForm, setShowAuthForm,
    authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authDisplayName, setAuthDisplayName,
    authLoading, authError, setAuthError, authStatus, setAuthStatus,
    handleAuthSubmit, handleSignOut, userLabel,
  } = useAuth();
  // helper to stop key events from reaching the page in the modal inputs
  const stopKeyEvent = (e: any) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* --- Page UI --- */}
      <main className="site">
        {/* Shared header component (same props behavior as HomePage) */}
        <SiteHeader
          authReady={authReady}
          user={currentUser}
          userLabel={userLabel}
          onOpenAuth={() => {
            setShowAuthForm(true);
            setAuthMode("signup");
            setAuthError(null);
            setAuthStatus(null);
          }}
          onSignOut={handleSignOut}
        />

        {/* FTC content */}
        {/* <section className="home-hero">
          <div className="home-hero-text">
            <h1>FTC Teams â€“ Season {season}</h1>
          </div>
        </section> */}

        <section className="panel-section">
          <div className="tabs-shell">
            {/* <header className="home-section-header">
              <span className="home-section-pill">FTC</span>
              <div>
                <h2>Teams Directory</h2>
              </div>
            </header> */}

            {teamsError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <p className="font-semibold mb-1">Error loading FTC data</p>
                <p className="whitespace-pre-wrap">{teamsError}</p>
              </div>
            )}

            {!teamsError && teamsLoading && (
              <div className="mt-2 rounded-xl border border-white/10 bg-black/40 px-6 py-10 flex flex-col items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
                <p className="text-sm text-gray-200">
                  Loading season {season} team directoryâ€¦
                </p>
                <p className="mt-1 text-xs text-gray-400 text-center">
                  {selectedCountryForFetch
                    ? `Fetching teams in ${selectedCountryForFetch} from the FTC APIâ€¦`
                    : "Fetching teams from the FTC APIâ€¦"}
                </p>
              </div>
            )}

            {!teamsError && !teamsLoading && teams.length === 0 && (
              <p className="text-sm text-gray-300">
                No teams returned after filtering. The season might be
                incorrect, you may not have access yet, or the response shape
                may have changed and the helper needs a tweak.
              </p>
            )}

            {!teamsError && !teamsLoading && teams.length > 0 && (
              <TeamsClient
                season={season}
                teams={teams}
                authReady={authReady}
                currentUser={currentUser}
                initialCountryFilter={selectedCountryForFetch || undefined}
                onCountryFilterChange={(value) => setSelectedCountryForFetch(value)}
              />
            )}
          </div>
        </section>

        {/* Footer (identical markup to HomePage) */}
        <footer className="site-footer">
          <span>Â© {currentYear} AsiantheJason</span>

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
      </main>

      {/* Auth modal overlay (same as HomePage) */}
      {authReady && showAuthForm && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <div>
                <div className="auth-modal-title">Save your runs</div>
                <div className="auth-modal-subtitle">
                  Log in or sign up to appear on the leaderboard. New accounts
                  need to verify their email first.
                </div>
              </div>
              <button
                type="button"
                className="auth-close-btn"
                onClick={() => setShowAuthForm(false)}
              >
                Ã—
              </button>
            </div>

            <div className="auth-toggle">
              <button
                type="button"
                className={
                  "auth-toggle-btn" +
                  (authMode === "login" ? " auth-toggle-btn-active" : "")
                }
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                  setAuthStatus(null);
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={
                  "auth-toggle-btn" +
                  (authMode === "signup" ? " auth-toggle-btn-active" : "")
                }
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError(null);
                  setAuthStatus(null);
                }}
              >
                Sign up
              </button>
            </div>

            <GoogleAuthButton />
            <form onSubmit={handleAuthSubmit} className="auth-fields">
              {authMode === "signup" && (
                <div className="auth-field">
                  <label>Display name</label>
                  <input
                    type="text"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    onKeyDown={stopKeyEvent}
                    onKeyUp={stopKeyEvent}
                    onKeyPress={stopKeyEvent}
                    placeholder="e.g. WastelandKing"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={stopKeyEvent}
                  onKeyUp={stopKeyEvent}
                  onKeyPress={stopKeyEvent}
                  required
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={stopKeyEvent}
                  onKeyUp={stopKeyEvent}
                  onKeyPress={stopKeyEvent}
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <div className="auth-message auth-error">{authError}</div>
              )}
              {authStatus && (
                <div className="auth-message auth-status">{authStatus}</div>
              )}

              <button
                type="submit"
                className="account-btn primary auth-submit-btn"
                disabled={authLoading}
              >
                {authLoading
                  ? authMode === "signup"
                    ? "Creating accountâ€¦"
                    : "Signing inâ€¦"
                  : authMode === "signup"
                  ? "Create account"
                  : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global styles (copied from HomePage so header/footer + background match) */}
      <style jsx global>{`
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont,
            "SF Pro Text", sans-serif;
          background: radial-gradient(circle at top, #0b1020 0, #02040a 60%);
          color: #f5f5f5;
        }

        .site {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 16px 0 32px;
        }

        .account-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s,
            color 0.15s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .account-btn.subtle {
          border-color: rgba(255, 255, 255, 0.18);
          opacity: 0.85;
        }

        .account-btn.primary {
          border-color: #ff834a;
          background: linear-gradient(135deg, #ff784a, #ffb347);
          color: #120b06;
          font-weight: 600;
        }

        .account-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        .account-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .account-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .home-hero {
          max-width: 1400px;
          margin: 28px auto 0;
          padding: 0 24px;
        }

        .home-hero-text h1 {
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.1;
          margin: 10px 0 0;
        }

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 32px;
          padding: 0 24px;
        }

        .tabs-shell {
          width: 100%;
          max-width: 1400px;
          background: rgba(9, 12, 25, 0.9);
          border-radius: 24px;
          padding: 18px 18px 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.85);
        }

        .home-section-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .home-section-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .home-section-header p {
          margin-top: 4px;
          font-size: 14px;
          opacity: 0.9;
        }

        .home-section-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          background: rgba(79, 70, 229, 0.18);
          color: #e5e7eb;
          border: 1px solid rgba(129, 140, 248, 0.5);
          white-space: nowrap;
        }

        .site-footer {
          margin-top: auto;
          padding: 16px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          opacity: 0.7;
          flex-wrap: wrap;
        }

        .site-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .site-footer-link {
          text-decoration: none;
          color: inherit;
          opacity: 0.85;
        }

        .site-footer-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .auth-modal {
          width: 420px;
          max-width: 90vw;
          background: radial-gradient(circle at top, #11172a, #050712);
          border-radius: 24px;
          padding: 18px 20px 20px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .auth-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .auth-modal-title {
          font-size: 18px;
          font-weight: 600;
        }

        .auth-modal-subtitle {
          font-size: 13px;
          opacity: 0.75;
          margin-top: 4px;
        }

        .auth-close-btn {
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .auth-toggle {
          display: inline-flex;
          padding: 2px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 10px;
        }

        .auth-toggle-btn {
          border: none;
          background: transparent;
          color: #b7c1ff;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 999px;
          cursor: pointer;
        }

        .auth-toggle-btn-active {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-weight: 600;
        }

        .auth-fields {
          display: grid;
          gap: 8px;
          margin-top: 4px;
        }

        .auth-field {
          display: grid;
          gap: 4px;
        }

        .auth-field label {
          font-size: 12px;
          opacity: 0.85;
        }

        .auth-field input {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 6px 10px;
          font-size: 13px;
          background: rgba(5, 8, 20, 0.95);
          color: #f5f5f5;
        }

        .auth-field input:focus {
          outline: none;
          border-color: #ff834a;
          box-shadow: 0 0 0 1px rgba(255, 131, 74, 0.6);
        }

        .auth-message {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
        }

        .auth-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #fecaca;
        }

        .auth-status {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.6);
          color: #bbf7d0;
        }

        .auth-submit-btn {
          margin-top: 4px;
          width: 100%;
          justify-content: center;
        }

        @media (max-width: 700px) {
          .home-hero {
            margin-top: 20px;
          }

          .tabs-shell {
            padding: 14px 14px 16px;
          }

          .site-footer {
            flex-direction: column;
            gap: 4px;
            align-items: center;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
