// app/ftc-teams/FtcTeamsShell.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import { TeamsClient } from "./TeamsClient";
import type { FtcTeam } from "@/lib/ftcEvents";

type FtcTeamsShellProps = {
  season: number;
  initialCountry?: string;
};

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

export function FtcTeamsShell({ season, initialCountry }: FtcTeamsShellProps) {
  const currentYear = new Date().getFullYear();

  // ---------- Teams data (client-side) ----------
  const [teams, setTeams] = useState<FtcTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // Which country we’re currently fetching from the API for.
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

  // ---------- Auth state (copied from HomePage) ----------
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  // During signup we temporarily hide auth header changes so
  // the user never appears as "logged in" for a split second.
  const [signupVerificationInFlight, setSignupVerificationInFlight] =
    useState(false);

  // ---------- Auth listener (same as HomePage) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window");
      return;
    }

    const unsub = auth.onAuthStateChanged((user: any) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  // ---------- Auth submit (same flows as HomePage) ----------
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus(null);
    setAuthLoading(true);

    const modeAtStart = authMode;
    if (modeAtStart === "signup") {
      setSignupVerificationInFlight(true);
    }

    try {
      const w = window as any;
      const auth = w.auth;
      const db = w.db;
      const firebase = w.firebase;
      if (!auth) {
        setAuthError("Authentication is not ready. Try again in a moment.");
        return;
      }

      if (modeAtStart === "signup") {
        const rawDisplayName = authDisplayName.trim();
        if (!rawDisplayName) {
          setAuthError("Please enter a display name.");
          return;
        }
        const displayNameLower = rawDisplayName.toLowerCase();

        // Create auth user (this signs them in)
        const cred = await auth.createUserWithEmailAndPassword(
          authEmail,
          authPassword
        );

        await cred.user.updateProfile({
          displayName: rawDisplayName,
        });

        // Store user profile document
        if (db && firebase?.firestore) {
          await db
            .collection("users")
            .doc(cred.user.uid)
            .set(
              {
                displayName: rawDisplayName,
                displayNameLower,
                email: authEmail.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }

        // Send verification email
        try {
          await cred.user.sendEmailVerification();
          setAuthStatus(
            "Account created. Check your inbox and junk mail for the verification email before logging in."
          );
        } catch (err: any) {
          console.error("Error sending verification email on signup", err);
          const code = err?.code || "";
          if (code === "auth/too-many-requests") {
            setAuthError(
              "Account created, but we hit a temporary email limit. Wait a bit, then use 'Log in' and we'll try sending the verification again."
            );
          } else {
            setAuthError(
              "Account created, but we couldn’t send a verification email automatically. Try again later or contact the site owner."
            );
          }
        }

        // Force them to verify before being considered logged in
        await auth.signOut();

        setAuthPassword("");
      } else {
        // Log in
        const cred = await auth.signInWithEmailAndPassword(
          authEmail,
          authPassword
        );

        // Refresh user to get up-to-date emailVerified flag
        await cred.user.reload();

        if (!cred.user.emailVerified) {
          // Try to send / re-send verification email
          try {
            await cred.user.sendEmailVerification();
            setAuthError(
              "You need to verify your email before logging in. We just sent a verification link to your inbox."
            );
          } catch (err: any) {
            console.error("Error sending verification email on login", err);
            const code = err?.code || "";
            if (code === "auth/too-many-requests") {
              setAuthError(
                "You need to verify your email before logging in, and we’ve temporarily hit an email limit. Wait a bit and try again."
              );
            } else {
              setAuthError(
                "You need to verify your email before logging in, and we couldn’t send a new verification email automatically."
              );
            }
          }

          // Don't keep them signed in if not verified
          await auth.signOut();
          return;
        }

        // Email is verified – proceed
        setAuthStatus("Signed in successfully.");
        setAuthPassword("");
        setShowAuthForm(false);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      const code = err?.code || "";
      let msg =
        err?.message || "Something went wrong. Please check your details.";
      if (code === "auth/email-already-in-use") {
        msg = "That email is already in use. Try logging in instead.";
      } else if (code === "auth/invalid-email") {
        msg = "That email address doesn’t look valid.";
      } else if (code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (code === "permission-denied") {
        msg =
          "We couldn't finish creating your account because of a permissions issue. Please try again or contact the site owner.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
      if (modeAtStart === "signup") {
        setSignupVerificationInFlight(false);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      const w = window as any;
      const auth = w.auth;
      if (!auth) return;
      await auth.signOut();
      setAuthStatus("Signed out.");
      setShowAuthForm(false);
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  // For the header, we hide auth changes during signup verification
  const headerUser = signupVerificationInFlight ? null : currentUser;
  const userLabel =
    headerUser?.displayName || headerUser?.email || "Unknown soldier";

  // helper to stop key events from reaching the page in the modal inputs
  const stopKeyEvent = (e: any) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* --- Firebase scripts (same init as HomePage) --- */}
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        id="firebase-init-ftc"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          const firebaseConfig = {
            apiKey: "AIzaSyAteayH-i26BMMYrTHecwlJF1S4DKmDPXI",
            authDomain: "wwiii-game-af0e7.firebaseapp.com",
            projectId: "wwiii-game-af0e7",
            storageBucket: "wwiii-game-af0e7.appspot.com",
            messagingSenderId: "906432978784",
            appId: "1:906432978784:web:433e23330bef1e6a3ac805"
          };

          if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
          }
          window.db = window.firebase.firestore();
          window.auth = window.firebase.auth();
        `,
        }}
      />

      {/* --- Page UI --- */}
      <main className="site">
        {/* Shared header component (same props behavior as HomePage) */}
        <SiteHeader
          authReady={authReady}
          user={headerUser}
          userLabel={userLabel}
          onOpenAuth={() => {
            setShowAuthForm(true);
            setAuthMode("signup");
            setAuthError(null);
            setAuthStatus(null);
          }}
          onSignOut={handleSignOut}
        />

        <section className="panel-section">
          <div className="tabs-shell">
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
                  Loading season {season} team directory…
                </p>
                <p className="mt-1 text-xs text-gray-400 text-center">
                  Fetching teams from the FTC API. You can stay on this
                  page while the data loads.
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
                onCountryFilterChange={(value) => {
                  setSelectedCountryForFetch(value);
                }}
              />
            )}
          </div>
        </section>

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
      </main>

      {/* Auth modal overlay */}
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
                ×
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
                    ? "Creating account…"
                    : "Signing in…"
                  : authMode === "signup"
                  ? "Create account"
                  : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
