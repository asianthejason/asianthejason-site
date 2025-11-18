// app/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "./components/SiteHeader";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

const GAMES = [
  {
    id: "wwiii",
    title: "WWIII — Endless Defense",
    status: "Live",
    description:
      "A brutal endless defense shooter. Survive waves of enemies, manage ammo, and push your distance record.",
    href: "/wwiii",
    tags: ["Shooter", "Endless", "PC Browser"],
  },
  // Add more games here later.
];

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  // ---------- Auth state ----------
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

  // ---------- Auth listener (same behavior as WWIII page) ----------
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

  // ---------- Auth submit (same flows, but no score-saving) ----------
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
      {/* --- Firebase scripts (same init as game page) --- */}
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
        id="firebase-init"
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

          if (!window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
          }
          window.db = window.firebase.firestore();
          window.auth = window.firebase.auth();
        `,
        }}
      />

      {/* --- Page UI --- */}
      <main className="site">
        {/* Shared header component */}
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

        {/* Hero / title */}
        <section className="home-hero">
          <div className="home-hero-text">
            <h1>Welcome to my little game corner on the internet 🎮</h1>
          </div>
        </section>

        {/* Support / donation section */}
        <section id="support" className="home-support">
          <div className="home-support-shell">
            <h2>Support the games</h2>
            <p>
              These games are solo-dev projects that take a lot of late nights,
              coffee, and testing. If you enjoy what I&apos;m building and want
              to help keep the projects going, any support is hugely
              appreciated.
            </p>
            <p className="home-support-small">
              I&apos;ll be adding more games, features, and polish over time —
              your support goes directly into hosting, tools, and time to keep
              improving everything.
            </p>

            {/* Now links to the new /support page */}
            <Link href="/support" className="home-support-btn">
              ⛽ Fuel the project
            </Link>
          </div>
        </section>

        {/* Games list */}
        <section className="panel-section">
          <div className="tabs-shell">
            <header className="home-section-header">
              <span className="home-section-pill">Games</span>
              <div>
                <h2>Playable now & coming soon</h2>
                <p>
                  This will grow over time as I ship more projects. For now,
                  WWIII is the main attraction.
                </p>
              </div>
            </header>

            <div className="games-grid">
              {GAMES.map((game) => (
                <article key={game.id} className="game-card">
                  <div className="game-card-top">
                    <h3 className="game-card-title">{game.title}</h3>
                    <span className="game-card-status">
                      {game.status === "Live" ? "● Live" : "○ In development"}
                    </span>
                  </div>
                  <p className="game-card-body">{game.description}</p>
                  {game.tags && game.tags.length > 0 && (
                    <ul className="game-card-tags">
                      {game.tags.map((tag) => (
                        <li key={tag} className="game-card-tag">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="game-card-actions">
                    <Link
                      href={game.href}
                      className={
                        game.status === "Live"
                          ? "game-card-primary"
                          : "game-card-secondary"
                      }
                    >
                      {game.status === "Live" ? "Play now" : "View details"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Footer (same style as game page) */}
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

      {/* Auth modal overlay (same behavior as game page) */}
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

      {/* Styles */}
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

        /* We keep button styles global so SiteHeader can use them */
        .account-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
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
        }

        .account-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .account-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        /* Hero */
        .home-hero {
          max-width: 1100px;
          margin: 28px auto 0;
          padding: 0 24px;
        }

        .home-hero-text h1 {
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.1;
          margin: 10px 0 0;
        }

        /* Support / donation */
        .home-support {
          display: flex;
          justify-content: center;
          margin-top: 32px;
          padding: 0 24px;
        }

        .home-support-shell {
          width: 100%;
          max-width: 900px;
          border-radius: 22px;
          padding: 20px 20px 22px;
          background: radial-gradient(circle at top, #11172a, #050712);
          border: 1px solid rgba(148, 163, 252, 0.35);
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.9);
        }

        .home-support-shell h2 {
          margin-top: 0;
          margin-bottom: 10px;
        }

        .home-support-shell p {
          font-size: 14px;
          opacity: 0.9;
        }

        .home-support-small {
          margin-top: 6px;
          font-size: 13px;
          opacity: 0.8;
        }

        .home-support-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 14px;
          padding: 9px 16px;
          border-radius: 999px;
          text-decoration: none;
          background: linear-gradient(135deg, #f97316, #f59e0b);
          color: #111827;
          font-weight: 500;
          font-size: 14px;
          border: none;
          cursor: pointer;
          box-shadow: 0 16px 40px rgba(249, 115, 22, 0.35);
          transition: transform 0.12s ease, box-shadow 0.18s ease;
        }

        .home-support-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 24px 60px rgba(249, 115, 22, 0.5);
        }

        /* Games list panel */
        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 32px;
          padding: 0 24px;
        }

        .tabs-shell {
          width: 100%;
          max-width: 1100px;
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

        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          margin-top: 10px;
        }

        .game-card {
          border-radius: 18px;
          padding: 14px 14px 16px;
          background: radial-gradient(circle at top left, #111827, #020617);
          border: 1px solid rgba(148, 163, 252, 0.3);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.9);
        }

        .game-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .game-card-title {
          margin: 0;
          font-size: 16px;
        }

        .game-card-status {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.12);
          color: #bbf7d0;
          border: 1px solid rgba(34, 197, 94, 0.4);
          white-space: nowrap;
        }

        .game-card-body {
          font-size: 13px;
          opacity: 0.9;
          margin: 4px 0 6px;
        }

        .game-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          list-style: none;
          padding: 0;
          margin: 4px 0 10px;
        }

        .game-card-tag {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(148, 163, 252, 0.14);
          color: #e5e7eb;
          border: 1px solid rgba(129, 140, 248, 0.5);
        }

        .game-card-actions {
          display: flex;
          justify-content: flex-end;
        }

        .game-card-primary,
        .game-card-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          text-decoration: none;
          border: 1px solid transparent;
          transition: background 0.18s ease, transform 0.12s ease,
            box-shadow 0.18s ease;
        }

        .game-card-primary {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #022c22;
          box-shadow: 0 14px 40px rgba(34, 197, 94, 0.45);
        }

        .game-card-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 60px rgba(34, 197, 94, 0.7);
        }

        .game-card-secondary {
          background: rgba(15, 23, 42, 0.9);
          color: #e5e7eb;
          border-color: rgba(148, 163, 252, 0.4);
        }

        .game-card-secondary:hover {
          background: rgba(15, 23, 42, 1);
        }

        /* Footer */
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

        /* Auth modal (copied from game page) */
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

          .home-support-shell {
            padding: 16px 14px 18px;
          }

          .tabs-shell {
            padding: 14px 14px 16px;
          }

          .games-grid {
            grid-template-columns: minmax(0, 1fr);
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
