// app/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface GameConfig {
  id: string;
  title: string;
  collection: string;
  scoreField: string;
  scoreLabel: string;
  scoreUnit?: string;
}

interface GameStat extends GameConfig {
  bestScore?: number;
  rank?: number;
  loading: boolean;
  error?: string;
}

// Add new games here as you build them.
const GAME_CONFIGS: GameConfig[] = [
  {
    id: "wwiii",
    title: "WWIII — Endless Defense",
    collection: "scores",
    scoreField: "distance",
    scoreLabel: "Best distance",
    scoreUnit: " m",
  },
  // Example future game:
  // {
  //   id: "space_invaders",
  //   title: "Space Invaders Redux",
  //   collection: "spaceScores",
  //   scoreField: "score",
  //   scoreLabel: "Highest score",
  // }
];

export default function ProfilePage() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Display name form
  const [displayName, setDisplayName] = useState("");
  const [displayNameLoading, setDisplayNameLoading] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameStatus, setDisplayNameStatus] = useState<string | null>(
    null
  );

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  // Game stats
  const [gameStats, setGameStats] = useState<GameStat[]>(
    GAME_CONFIGS.map((cfg) => ({ ...cfg, loading: true }))
  );

  // ---------- Auth listener ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window (profile page)");
      return;
    }

    const unsub = auth.onAuthStateChanged((user: any) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        setDisplayName(user.displayName || "");
      } else {
        setCurrentUser(null);
        setDisplayName("");
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  // ---------- Fetch per-game high scores / ranks ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!authReady || !currentUser) {
      // reset to loading when user logs out / not ready
      setGameStats(GAME_CONFIGS.map((cfg) => ({ ...cfg, loading: true })));
      return;
    }

    const w = window as any;
    const db = w.db;

    if (!db) {
      console.warn("Firestore not available on window (profile stats)");
      setGameStats((prev) =>
        prev.map((g) => ({
          ...g,
          loading: false,
          error: "Stats unavailable (database offline).",
        }))
      );
      return;
    }

    const fetchStats = async () => {
      const results: GameStat[] = [];

      for (const cfg of GAME_CONFIGS) {
        try {
          // Get all scores for this user for this game
          const userSnap = await db
            .collection(cfg.collection)
            .where("uid", "==", currentUser.uid)
            .get();

          if (userSnap.empty) {
            // No scores yet
            results.push({
              ...cfg,
              loading: false,
            });
            continue;
          }

          // Compute best score client-side to avoid composite index
          let bestScore: number | undefined;
          userSnap.forEach((doc: any) => {
            const val = doc.get(cfg.scoreField);
            if (typeof val === "number") {
              if (bestScore === undefined || val > bestScore) {
                bestScore = val;
              }
            }
          });

          if (bestScore === undefined) {
            // Docs exist but no numeric field – treat as no stats
            results.push({
              ...cfg,
              loading: false,
            });
            continue;
          }

          // Rank: count how many scores are strictly higher
          const higherSnap = await db
            .collection(cfg.collection)
            .where(cfg.scoreField, ">", bestScore)
            .get();
          const rank = higherSnap.size + 1;

          results.push({
            ...cfg,
            bestScore,
            rank,
            loading: false,
          });
        } catch (err) {
          console.error("Error fetching stats for game", cfg.id, err);
          results.push({
            ...cfg,
            loading: false,
            error: "Could not load stats.",
          });
        }
      }

      setGameStats(results);
    };

    fetchStats();
  }, [authReady, currentUser?.uid]);

  // ---------- Update display name ----------
  const handleDisplayNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDisplayNameError(null);
    setDisplayNameStatus(null);

    const trimmed = displayName.trim();
    if (!trimmed) {
      setDisplayNameError("Display name cannot be empty.");
      return;
    }

    setDisplayNameLoading(true);
    try {
      const w = window as any;
      const auth = w.auth;
      const db = w.db;
      const firebase = w.firebase;

      if (!auth || !auth.currentUser) {
        setDisplayNameError("You must be signed in to update your display name.");
        return;
      }

      const user = auth.currentUser;
      const newName = trimmed;
      const newNameLower = newName.toLowerCase();

      // Optional: enforce uniqueness (case-insensitive) against other users
      if (db && firebase?.firestore) {
        const existingSnap = await db
          .collection("users")
          .where("displayNameLower", "==", newNameLower)
          .limit(1)
          .get();

        const takenByOther =
          !existingSnap.empty && existingSnap.docs[0].id !== user.uid;

        if (takenByOther) {
          setDisplayNameError(
            "That display name is already taken. Please choose another one."
          );
          return;
        }
      }

      // Update Firebase Auth profile
      await user.updateProfile({ displayName: newName });

      // Update Firestore users/{uid} doc
      if (db && firebase?.firestore) {
        await db
          .collection("users")
          .doc(user.uid)
          .set(
            {
              displayName: newName,
              displayNameLower: newNameLower,
            },
            { merge: true }
          );
      }

      setCurrentUser((prev) =>
        prev ? { ...prev, displayName: newName } : prev
      );
      setDisplayNameStatus("Display name updated.");
    } catch (err: any) {
      console.error("Error updating display name", err);
      setDisplayNameError(
        "Could not update display name. Please try again in a moment."
      );
    } finally {
      setDisplayNameLoading(false);
    }
  };

  // ---------- Change password ----------
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password should be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const w = window as any;
      const auth = w.auth;
      const firebase = w.firebase;

      if (!auth || !auth.currentUser) {
        setPasswordError("You must be signed in to change your password.");
        return;
      }

      const user = auth.currentUser;
      if (!user.email) {
        setPasswordError(
          "Your account does not have an email address. Password cannot be changed here."
        );
        return;
      }

      const credential =
        firebase.auth.EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

      // Re-authenticate, then update password
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(newPassword);

      setPasswordStatus("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Error updating password", err);
      const code = err?.code || "";
      let msg =
        err?.message || "Could not update password. Please check your details.";

      if (code === "auth/wrong-password") {
        msg = "Your current password is incorrect.";
      } else if (code === "auth/weak-password") {
        msg = "New password is too weak. Use at least 6 characters.";
      } else if (code === "auth/requires-recent-login") {
        msg =
          "For security, please sign out and sign back in, then try changing your password again.";
      }

      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const userLabel =
    currentUser?.displayName || currentUser?.email || "Unknown soldier";

  return (
    <>
      {/* Firebase scripts (reused config from home page) */}
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
        id="firebase-init-profile"
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

          if (!window.firebase?.apps?.length) {
            window.firebase.initializeApp(firebaseConfig);
          }
          if (!window.db) {
            window.db = window.firebase.firestore();
          }
          if (!window.auth) {
            window.auth = window.firebase.auth();
          }
        `,
        }}
      />

      <main className="profile-site">
        {/* Header */}
        <header className="profile-header">
          <div className="profile-header-inner">
            <Link href="/" className="site-title-link">
              <div className="site-title">ASIANTHEJASON</div>
            </Link>
            <div className="profile-header-spacer" />
            <div className="profile-header-account">
              {!authReady && (
                <span className="profile-header-text">Loading…</span>
              )}
              {authReady && currentUser && (
                <span className="profile-header-text">
                  Signed in as <strong>{userLabel}</strong>
                </span>
              )}
              {authReady && !currentUser && (
                <span className="profile-header-text">
                  Not signed in —{" "}
                  <Link href="/" className="profile-link-inline">
                    go back to the game to sign in
                  </Link>
                  .
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="profile-section">
          <div className="profile-card-shell">
            <div className="profile-card">
              <h1>Account Settings</h1>
              <p className="profile-intro">
                Change your display name and password for the WWIII leaderboard.
              </p>

              {!authReady && (
                <p className="profile-note">Checking your session…</p>
              )}

              {authReady && !currentUser && (
                <p className="profile-note">
                  You&apos;re not signed in. Head back to the{" "}
                  <Link href="/" className="profile-link-inline">
                    main game page
                  </Link>{" "}
                  to sign in or create an account.
                </p>
              )}

              {authReady && currentUser && (
                <>
                  {/* High scores section */}
                  <div className="profile-section-block">
                    <h2>High scores</h2>
                    <p className="profile-subtext">
                      Your best runs and ranks across all games on this
                      account.
                    </p>

                    <div className="profile-games-grid">
                      {gameStats.map((stat) => (
                        <div key={stat.id} className="profile-game-card">
                          <div className="profile-game-header">
                            <span className="profile-game-title">
                              {stat.title}
                            </span>
                          </div>

                          {stat.loading && (
                            <p className="profile-game-text">Loading…</p>
                          )}

                          {!stat.loading && stat.error && (
                            <p className="profile-game-text profile-game-error">
                              {stat.error}
                            </p>
                          )}

                          {!stat.loading &&
                            !stat.error &&
                            stat.bestScore === undefined && (
                              <p className="profile-game-text">
                                No scores yet — play a round to claim your
                                spot on the leaderboard.
                              </p>
                            )}

                          {!stat.loading &&
                            !stat.error &&
                            stat.bestScore !== undefined && (
                              <>
                                <p className="profile-game-metric">
                                  {stat.scoreLabel}:{" "}
                                  <strong>
                                    {stat.bestScore}
                                    {stat.scoreUnit ?? ""}
                                  </strong>
                                </p>
                                {stat.rank && (
                                  <p className="profile-game-metric">
                                    Best rank:{" "}
                                    <strong>#{stat.rank}</strong>
                                  </p>
                                )}
                              </>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Display name form */}
                  <div className="profile-section-block">
                    <h2>Display name</h2>
                    <p className="profile-subtext">
                      This name appears on the leaderboard.
                    </p>
                    <form
                      onSubmit={handleDisplayNameSubmit}
                      className="profile-form"
                    >
                      <label className="profile-label">
                        Display name
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="profile-input"
                          placeholder="e.g. WastelandKing"
                        />
                      </label>

                      {displayNameError && (
                        <div className="profile-message profile-error">
                          {displayNameError}
                        </div>
                      )}
                      {displayNameStatus && (
                        <div className="profile-message profile-status">
                          {displayNameStatus}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="profile-btn primary"
                        disabled={displayNameLoading}
                      >
                        {displayNameLoading
                          ? "Saving…"
                          : "Update display name"}
                      </button>
                    </form>
                  </div>

                  {/* Password form */}
                  <div className="profile-section-block">
                    <h2>Password</h2>
                    <p className="profile-subtext">
                      To change your password, confirm your current one first.
                    </p>
                    <form
                      onSubmit={handlePasswordSubmit}
                      className="profile-form"
                    >
                      <label className="profile-label">
                        Current password
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="profile-input"
                        />
                      </label>

                      <label className="profile-label">
                        New password
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="profile-input"
                          minLength={6}
                        />
                      </label>

                      <label className="profile-label">
                        Confirm new password
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="profile-input"
                          minLength={6}
                        />
                      </label>

                      {passwordError && (
                        <div className="profile-message profile-error">
                          {passwordError}
                        </div>
                      )}
                      {passwordStatus && (
                        <div className="profile-message profile-status">
                          {passwordStatus}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="profile-btn"
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? "Updating…" : "Change password"}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <footer className="profile-footer">
          <span>© {new Date().getFullYear()} AsiantheJason</span>
          <span>WWIII — Endless Defense</span>
        </footer>
      </main>

      <style jsx global>{`
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont,
            "SF Pro Text", sans-serif;
          background: radial-gradient(circle at top, #0b1020 0, #02040a 60%);
          color: #f5f5f5;
        }

        .profile-site {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 16px 0 32px;
        }

        .profile-header {
          padding: 8px 24px 12px;
        }

        .profile-header-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .site-title-link {
          text-decoration: none;
        }

        .site-title {
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: 16px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f5f5f5;
        }

        .profile-header-spacer {
          flex: 1;
        }

        .profile-header-account {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .profile-header-text {
          opacity: 0.9;
        }

        .profile-link-inline {
          color: #ffb347;
          text-decoration: underline;
        }

        .profile-section {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin-top: 24px;
        }

        .profile-card-shell {
          width: 90vw;
          max-width: 700px;
        }

        .profile-card {
          background: rgba(9, 12, 25, 0.96);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
          padding: 20px 22px 22px;
        }

        .profile-card h1 {
          margin: 0 0 6px;
          font-size: 22px;
        }

        .profile-intro {
          margin: 0 0 16px;
          font-size: 14px;
          opacity: 0.85;
        }

        .profile-note {
          font-size: 14px;
          opacity: 0.8;
        }

        .profile-section-block {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .profile-section-block h2 {
          margin: 0 0 4px;
          font-size: 18px;
        }

        .profile-subtext {
          margin: 0 0 10px;
          font-size: 13px;
          opacity: 0.75;
        }

        .profile-form {
          display: grid;
          gap: 10px;
          margin-top: 4px;
        }

        .profile-label {
          font-size: 13px;
          display: grid;
          gap: 4px;
        }

        .profile-input {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 7px 10px;
          font-size: 13px;
          background: rgba(5, 8, 20, 0.95);
          color: #f5f5f5;
        }

        .profile-input:focus {
          outline: none;
          border-color: #ff834a;
          box-shadow: 0 0 0 1px rgba(255, 131, 74, 0.6);
        }

        .profile-message {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
        }

        .profile-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #fecaca;
        }

        .profile-status {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.6);
          color: #bbf7d0;
        }

        .profile-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 7px 14px;
          font-size: 13px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          width: fit-content;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        }

        .profile-btn.primary {
          border-color: #ff834a;
          background: linear-gradient(135deg, #ff784a, #ffb347);
          color: #120b06;
          font-weight: 600;
        }

        .profile-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
        }

        .profile-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .profile-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        /* High scores layout */
        .profile-games-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          margin-top: 8px;
        }

        .profile-game-card {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: radial-gradient(circle at top left, #111827 0, #020617 60%);
          padding: 10px 12px;
          font-size: 13px;
        }

        .profile-game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .profile-game-title {
          font-weight: 600;
          font-size: 14px;
        }

        .profile-game-text {
          margin: 2px 0;
          opacity: 0.85;
        }

        .profile-game-metric {
          margin: 2px 0;
        }

        .profile-game-error {
          color: #fecaca;
        }

        .profile-footer {
          margin-top: auto;
          padding: 16px 24px 0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          opacity: 0.7;
        }

        @media (max-width: 700px) {
          .profile-card {
            padding: 16px 16px 18px;
          }

          .profile-footer {
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
