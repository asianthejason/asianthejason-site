// app/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import Script from "next/script";

type TabKey = "instructions" | "leaderboard" | "review";

interface ScoreRow {
  id: string;
  name: string;
  enemiesKilled: number;
  distance: number;
  bulletsFired: {
    Pistol?: number;
    Shotgun?: number;
    Sniper?: number;
    "Machine Gun"?: number;
  };
  daysAgo: number;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");
  const [scores, setScores] = useState<ScoreRow[] | null>(null);

  // Auth state
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

  // ---------- Auth listener ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    // If firebase is there but auth not set, ensure we expose it
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

  // ---------- Leaderboard listener ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsubscribe: (() => void) | undefined;

    try {
      const w = window as any;
      const db = w?.db;
      if (!db) {
        console.warn("Firestore db not found on window");
        return;
      }

      unsubscribe = db
        .collection("scores")
        .orderBy("distance", "desc")
        .limit(10)
        .onSnapshot((snapshot: any) => {
          if (snapshot.empty) {
            setScores([]);
            return;
          }
          const now = Date.now();
          const rows: ScoreRow[] = snapshot.docs.map((doc: any) => {
            const d = doc.data() || {};
            const ts =
              d.createdAt && d.createdAt.toDate
                ? d.createdAt.toDate()
                : new Date();
            const daysAgo = Math.floor(
              (now - ts.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              id: doc.id,
              name: d.name || "Unknown",
              enemiesKilled: d.enemiesKilled ?? 0,
              distance: d.distance ?? 0,
              bulletsFired: d.bulletsFired || {},
              daysAgo,
            };
          });

          setScores(rows);
        });
    } catch (err) {
      console.error("Error setting up leaderboard listener", err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ---------- Auth actions ----------
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus(null);
    setAuthLoading(true);

    try {
      const w = window as any;
      const auth = w.auth;
      const db = w.db;
      if (!auth) {
        setAuthError("Authentication is not ready. Try again in a moment.");
        return;
      }

      if (authMode === "signup") {
        if (!authDisplayName.trim()) {
          setAuthError("Please enter a display name.");
          return;
        }

        const cred = await auth.createUserWithEmailAndPassword(
          authEmail,
          authPassword
        );
        await cred.user.updateProfile({
          displayName: authDisplayName.trim(),
        });

        if (db && w.firebase?.firestore) {
          await db
            .collection("users")
            .doc(cred.user.uid)
            .set(
              {
                displayName: authDisplayName.trim(),
                email: authEmail.trim(),
                createdAt: w.firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }

        setAuthStatus("Account created. You are now signed in.");
        setAuthPassword("");
      } else {
        await auth.signInWithEmailAndPassword(authEmail, authPassword);
        setAuthStatus("Signed in successfully.");
        setAuthPassword("");
      }
    } catch (err: any) {
      console.error("Auth error", err);
      setAuthError(
        err?.message || "Something went wrong. Please check your details."
      );
    } finally {
      setAuthLoading(false);
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

  const userLabel =
    currentUser?.displayName || currentUser?.email || "Unknown soldier";

  return (
    <>
      {/* --- External libraries --- */}
      <Script
        src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.js"
        strategy="beforeInteractive"
      />
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
      {/* Phaser game logic (expects parent: 'gameContainer') */}
      <Script src="/WWIII/main.js" strategy="afterInteractive" />

      {/* --- Page UI --- */}
      <main className="site">
        {/* Site header */}
        <header className="site-header">
          <div className="site-title">asianthejason</div>
        </header>

        {/* Game */}
        <section className="game-section">
          <div className="game-shell">
            <div id="gameContainer" className="game-container" />
          </div>
        </section>

        {/* Tabs + account section */}
        <section className="panel-section">
          <div className="tabs-shell">
            {/* Account bar */}
            <div className="account-bar">
              <div className="account-info">
                {!authReady && <span>Loading account…</span>}
                {authReady && currentUser && (
                  <span>
                    Signed in as <strong>{userLabel}</strong>
                  </span>
                )}
                {authReady && !currentUser && <span>Not signed in</span>}
              </div>
              <div className="account-actions">
                {authReady && currentUser && (
                  <button
                    type="button"
                    className="account-btn subtle"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                )}
                {authReady && !currentUser && (
                  <button
                    type="button"
                    className="account-btn"
                    onClick={() => setShowAuthForm((v) => !v)}
                  >
                    {showAuthForm ? "Close" : "Sign in / Sign up"}
                  </button>
                )}
              </div>
            </div>

            {/* Auth form (collapsed unless needed) */}
            {authReady && !currentUser && showAuthForm && (
              <div className="auth-form">
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
                      required
                    />
                  </div>

                  <div className="auth-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  {authError && (
                    <div className="auth-message auth-error">{authError}</div>
                  )}
                  {authStatus && (
                    <div className="auth-message auth-status">
                      {authStatus}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="account-btn primary"
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
            )}

            {/* Tabs */}
            <div className="tabs">
              <button
                className={
                  "tab-button" +
                  (activeTab === "instructions" ? " tab-button-active" : "")
                }
                onClick={() => setActiveTab("instructions")}
              >
                Game Instructions
              </button>
              <button
                className={
                  "tab-button" +
                  (activeTab === "leaderboard" ? " tab-button-active" : "")
                }
                onClick={() => setActiveTab("leaderboard")}
              >
                Leaderboard
              </button>
              <button
                className={
                  "tab-button" +
                  (activeTab === "review" ? " tab-button-active" : "")
                }
                onClick={() => setActiveTab("review")}
              >
                Review
              </button>
            </div>

            {/* Tab content */}
            <div className="tab-panel">
              {activeTab === "instructions" && (
                <div className="instructions">
                  <h2>How to Play</h2>
                  <p>
                    Survive as long as you can in a ruined world at war. Upgrade
                    your weapons, manage ammo, and push your distance record
                    while the enemy never stops advancing.
                  </p>
                  <ul>
                    <li>Move / aim with your mouse.</li>
                    <li>Click to shoot, reload, and swap weapons in-game.</li>
                    <li>Earn cash by surviving and killing enemies.</li>
                    <li>Spend money on upgrades between runs.</li>
                  </ul>
                  <div className="tip-pill">
                    <span className="tip-label">Tip</span>
                    <span>Best experienced fullscreen on desktop. Sound on.</span>
                  </div>
                </div>
              )}

              {activeTab === "leaderboard" && (
                <div className="leaderboard">
                  <h2>Top Runs</h2>
                  <p className="leaderboard-subtitle">
                    Live scores from Firestore — sorted by distance travelled.
                  </p>
                  <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Days Ago</th>
                          <th>Player</th>
                          <th>Enemies Killed</th>
                          <th>Pistol Shots</th>
                          <th>Shotgun Shots</th>
                          <th>Sniper Shots</th>
                          <th>MG Shots</th>
                          <th>Distance (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores === null && (
                          <tr>
                            <td colSpan={8}>Loading…</td>
                          </tr>
                        )}

                        {scores !== null && scores.length === 0 && (
                          <tr>
                            <td colSpan={8}>
                              No scores yet. Be the first to reach the front
                              lines.
                            </td>
                          </tr>
                        )}

                        {scores &&
                          scores.map((s) => (
                            <tr key={s.id}>
                              <td>{s.daysAgo}</td>
                              <td>{s.name}</td>
                              <td>{s.enemiesKilled}</td>
                              <td>{s.bulletsFired?.Pistol ?? 0}</td>
                              <td>{s.bulletsFired?.Shotgun ?? 0}</td>
                              <td>{s.bulletsFired?.Sniper ?? 0}</td>
                              <td>{s.bulletsFired?.["Machine Gun"] ?? 0}</td>
                              <td>{s.distance}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="leaderboard-footnote">
                    Scores update automatically when a run finishes.
                  </p>
                </div>
              )}

              {activeTab === "review" && (
                <div className="review">
                  <h2>Review the Game</h2>
                  <p>
                    Enjoying WWIII — Endless Defense? I&apos;m iterating on the
                    game and would love feedback on difficulty, pacing, and new
                    features you&apos;d like to see.
                  </p>
                  <p>
                    You can send thoughts, bug reports, or balance suggestions
                    to <strong>asianthejason</strong>. A proper feedback form
                    can go here later.
                  </p>
                  <ul>
                    <li>Is the game too easy or too hard?</li>
                    <li>Which weapons feel the best to use?</li>
                    <li>What upgrades or enemies should be added next?</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <span>© {new Date().getFullYear()} AsiantheJason</span>
          <span>Leaderboard powered by Firebase</span>
        </footer>
      </main>

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

        .site-header {
          padding: 8px 24px 12px;
          display: flex;
          justify-content: center;
        }

        .site-title {
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 18px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .game-section {
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }

        .game-shell {
          width: 85vw;
          max-width: 1200px;
        }

        .game-container {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 22px 50px rgba(0, 0, 0, 0.9);
          background: #000;
        }

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        .tabs-shell {
          width: 85vw;
          max-width: 900px;
          background: rgba(9, 12, 25, 0.96);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
          overflow: hidden;
        }

        .account-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }

        .account-info span {
          opacity: 0.9;
        }

        .account-actions {
          display: flex;
          gap: 8px;
        }

        .account-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
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

        .auth-form {
          padding: 10px 16px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.16);
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
          max-width: 420px;
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

        .tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: radial-gradient(circle at top left, #171b32, #050714);
        }

        .tab-button {
          flex: 1;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: #b7c1ff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .tab-button:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .tab-button-active {
          color: #ffffff;
          background: rgba(15, 23, 42, 0.95);
          box-shadow: inset 0 -2px 0 #ff834a;
        }

        .tab-panel {
          padding: 18px 20px 20px;
        }

        .instructions h2,
        .leaderboard h2,
        .review h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .instructions p,
        .review p {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .instructions ul,
        .review ul {
          margin: 0 0 12px;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .tip-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.18);
          font-size: 12px;
          margin-top: 4px;
        }

        .tip-label {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          opacity: 0.85;
        }

        .leaderboard-subtitle {
          margin: 0 0 10px;
          font-size: 13px;
          opacity: 0.75;
        }

        .leaderboard-table-wrapper {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(4, 6, 14, 0.9);
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .leaderboard-table th,
        .leaderboard-table td {
          padding: 8px 12px;
          text-align: left;
        }

        .leaderboard-table thead {
          background: rgba(15, 23, 42, 0.95);
        }

        .leaderboard-table tbody tr:nth-child(even) {
          background: rgba(15, 23, 42, 0.8);
        }

        .leaderboard-table tbody tr:nth-child(odd) {
          background: rgba(11, 15, 30, 0.9);
        }

        .leaderboard-table th {
          font-weight: 600;
          opacity: 0.9;
        }

        .leaderboard-table td:first-child {
          font-weight: 600;
        }

        .leaderboard-footnote {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.7;
        }

        .site-footer {
          margin-top: auto;
          padding: 16px 24px 0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          opacity: 0.7;
        }

        @media (max-width: 700px) {
          .tab-panel {
            padding: 14px 14px 16px;
          }

          .leaderboard-table th,
          .leaderboard-table td {
            padding: 6px 8px;
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
