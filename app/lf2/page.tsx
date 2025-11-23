// app/lf2/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

type TabKey = "instructions" | "leaderboard" | "review";

interface ScoreRow {
  id: string;
  rank: number;
  name: string;
  score: number;
  daysAgo: number;
}

interface ReviewRow {
  id: string;
  uid?: string;
  name: string;
  rating: number;
  comment: string;
  createdAt?: Date | null;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

export default function LF2Page() {
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");

  // Leaderboard state
  const [scores, setScores] = useState<ScoreRow[] | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

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

  const currentYear = new Date().getFullYear();

  // Stop key events from reaching the game iframe when typing
  const stopKeyEvent = (e: any) => {
    e.stopPropagation();
  };

  // ---------- Auth listener ----------
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

  const headerUser = currentUser;
  const userLabel =
    headerUser?.displayName || headerUser?.email || "Unknown fighter";

  // ---------- Leaderboard listener (lf2Scores) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsubscribe: (() => void) | undefined;

    try {
      const w = window as any;
      const db = w?.db;
      if (!db) {
        console.warn("Firestore db not found on window (lf2Scores)");
        return;
      }

      unsubscribe = db
        .collection("lf2Scores")
        .orderBy("score", "desc")
        .limit(20)
        .onSnapshot((snapshot: any) => {
          if (snapshot.empty) {
            setScores([]);
            return;
          }
          const now = Date.now();
          const rows: ScoreRow[] = snapshot.docs.map(
            (doc: any, index: number) => {
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
                rank: index + 1,
                name: d.name || "Unknown fighter",
                score: d.score ?? 0,
                daysAgo,
              };
            }
          );

          setScores(rows);
        });
    } catch (err) {
      console.error("Error setting up LF2 leaderboard listener", err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ---------- Reviews listener (lf2Reviews) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsubscribe: (() => void) | undefined;

    try {
      const w = window as any;
      const db = w?.db;
      if (!db) {
        console.warn("Firestore db not found on window (lf2Reviews)");
        setReviews([]);
        return;
      }

      unsubscribe = db
        .collection("lf2Reviews")
        .orderBy("createdAt", "desc")
        .limit(50)
        .onSnapshot((snapshot: any) => {
          if (snapshot.empty) {
            setReviews([]);
            return;
          }

          const rows: ReviewRow[] = snapshot.docs.map((doc: any) => {
            const d = doc.data() || {};
            let createdAt: Date | null = null;
            if (d.createdAt && d.createdAt.toDate) {
              createdAt = d.createdAt.toDate();
            }
            return {
              id: doc.id,
              uid: d.uid,
              name: d.name || "Unknown fighter",
              rating: d.rating ?? 0,
              comment: d.comment ?? "",
              createdAt,
            };
          });

          setReviews(rows);
        });
    } catch (err) {
      console.error("Error setting up LF2 reviews listener", err);
      setReviews([]);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ---------- Auth submit (signup / login) ----------
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus(null);
    setAuthLoading(true);

    try {
      const w = window as any;
      const auth = w.auth;
      const db = w.db;
      const firebase = w.firebase;
      if (!auth) {
        setAuthError("Authentication is not ready. Try again in a moment.");
        return;
      }

      if (authMode === "signup") {
        const rawDisplayName = authDisplayName.trim();
        if (!rawDisplayName) {
          setAuthError("Please enter a display name.");
          return;
        }
        const displayNameLower = rawDisplayName.toLowerCase();

        const cred = await auth.createUserWithEmailAndPassword(
          authEmail,
          authPassword
        );

        await cred.user.updateProfile({
          displayName: rawDisplayName,
        });

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

        setAuthStatus("Account created. You are now signed in.");
        setAuthPassword("");
      } else {
        const cred = await auth.signInWithEmailAndPassword(
          authEmail,
          authPassword
        );
        if (cred?.user) {
          setAuthStatus("Signed in successfully.");
          setAuthPassword("");
          setShowAuthForm(false);
        }
      }
    } catch (err: any) {
      console.error("LF2 auth error", err);
      const code = err?.code || "";
      let msg =
        err?.message || "Something went wrong. Please check your details.";
      if (code === "auth/email-already-in-use") {
        msg = "That email is already in use. Try logging in instead.";
      } else if (code === "auth/invalid-email") {
        msg = "That email address doesn’t look valid.";
      } else if (code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setAuthError(msg);
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

  // ---------- Review submit (lf2Reviews) ----------
  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewStatus(null);

    if (!currentUser) {
      setReviewError("You must be signed in to leave a review.");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please choose a rating from 1 to 5 stars.");
      return;
    }
    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      setReviewError("Please write a short comment about the game.");
      return;
    }

    try {
      setReviewSubmitting(true);
      const w = window as any;
      const db = w.db;
      if (!db || !w.firebase?.firestore) {
        setReviewError("Reviews are not available right now. Try again later.");
        return;
      }

      const name =
        currentUser.displayName || currentUser.email || "Unknown fighter";

      await db.collection("lf2Reviews").add({
        uid: currentUser.uid,
        name,
        rating: reviewRating,
        comment: trimmedComment,
        createdAt: w.firebase.firestore.FieldValue.serverTimestamp(),
      });

      setReviewStatus("Thanks for your review!");
      setReviewComment("");
      setReviewRating(0); // <--- reset stars to unselected after submit
    } catch (err: any) {
      console.error("Error submitting LF2 review", err);
      if (err?.code === "permission-denied") {
        setReviewError(
          "Your review was rejected by the server (permission denied). The site owner needs to update Firestore security rules for the 'lf2Reviews' collection."
        );
      } else {
        setReviewError("Could not submit your review. Please try again.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Average rating
  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  const averageRatingRounded = averageRating
    ? Math.round(averageRating * 10) / 10
    : 0;

  return (
    <>
      {/* Firebase + compat libs, same project as WWIII */}
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
        id="firebase-init-lf2"
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
          window.db = window.firebase.firestore();
          window.auth = window.firebase.auth();
        `,
        }}
      />

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

        {/* Game */}
        <section className="game-section">
          <div className="game-shell">
            <div className="game-container">
              <iframe
                src="/lf2/F.LF/game/game.html"
                className="lf2-iframe"
                title="Little Fighter 2 – Remastered"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* Game title under game, above tabs */}
        <section className="game-title-section">
          <div className="game-title-shell">
            <h1 className="game-title">Little Fighter 2 - Remastered</h1>
          </div>
        </section>

        {/* Tabs (instructions / leaderboard / review) */}
        <section className="panel-section">
          <div className="tabs-shell">
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
                    This is a browser port of the classic beat&apos;em up{" "}
                    <strong>Little Fighter 2</strong>. Choose your character,
                    fight through waves of enemies, and master combos and
                    special moves.
                  </p>
                  <p>
                    Exact controls can be changed in the in-game settings, but a
                    typical keyboard setup looks like:
                  </p>
                  <ul>
                    <li>Arrow keys – Move your character</li>
                    <li>Attack / Jump / Defend – see the key config menu</li>
                    <li>
                      Combine directions + Attack / Jump for special moves
                    </li>
                    <li>Double-tap a direction to dash</li>
                    <li>Pick up items and use them against enemies</li>
                  </ul>
                  <p>
                    From the main menu you can jump into VS Mode, Stage Mode,
                    and more. Each character has unique moves, so experiment and
                    find your favourite.
                  </p>
                </div>
              )}

              {activeTab === "leaderboard" && (
                <div className="leaderboard">
                  <h2>Top Fighters</h2>
                  <p className="leaderboard-intro">
                    These scores are stored separately from WWIII and are just
                    for Little Fighter 2 - Remastered.
                  </p>
                  <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Days Ago</th>
                          <th>Player</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores === null && (
                          <tr>
                            <td colSpan={4}>Loading…</td>
                          </tr>
                        )}

                        {scores !== null && scores.length === 0 && (
                          <tr>
                            <td colSpan={4}>
                              No scores yet. Be the first to light up the
                              battlefield.
                            </td>
                          </tr>
                        )}

                        {scores &&
                          scores.map((s) => (
                            <tr key={s.id}>
                              <td>{s.rank}</td>
                              <td>{s.daysAgo}</td>
                              <td>{s.name}</td>
                              <td>{s.score}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="leaderboard-footnote">
                    Scores come from the <code>lf2Scores</code> collection in
                    Firestore. You can populate them through the console or by
                    wiring the game to save runs later.
                  </p>
                </div>
              )}

              {activeTab === "review" && (
                <div className="review">
                  <h2>Reviews</h2>

                  {/* Average rating */}
                  <div className="review-summary">
                    {reviews === null && <span>Loading reviews…</span>}
                    {reviews !== null && reviews.length === 0 && (
                      <span>
                        No reviews yet. Be the first to rate Little Fighter 2 -
                        Remastered.
                      </span>
                    )}
                    {reviews !== null && reviews.length > 0 && (
                      <>
                        <div className="review-summary-main">
                          <span className="review-summary-score">
                            {averageRatingRounded.toFixed(1)}
                          </span>
                          <div className="review-summary-stars">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const starIndex = i + 1;
                              const filled =
                                averageRating >= starIndex - 0.5;
                              return (
                                <span
                                  key={starIndex}
                                  className={
                                    "star-display" +
                                    (filled ? " star-display-filled" : "")
                                  }
                                >
                                  ★
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="review-summary-count">
                          Based on {reviews.length}{" "}
                          {reviews.length === 1 ? "review" : "reviews"}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Review form */}
                  <div className="review-form-shell">
                    {!authReady && (
                      <p className="review-info">Checking your account…</p>
                    )}

                    {authReady && !currentUser && (
                      <div className="review-info">
                        <p>You need to be signed in to leave a review.</p>
                        <button
                          type="button"
                          className="account-btn primary"
                          onClick={() => {
                            setShowAuthForm(true);
                            setAuthMode("signup");
                            setAuthError(null);
                            setAuthStatus(null);
                          }}
                        >
                          Sign in / Sign up
                        </button>
                      </div>
                    )}

                    {authReady && currentUser && (
                      <form
                        className="review-form"
                        onSubmit={handleReviewSubmit}
                      >
                        <div className="review-stars-block">
                          <label className="review-label">Your rating</label>
                          <div className="review-stars-buttons">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const starValue = i + 1;
                              const active = starValue <= reviewRating;
                              return (
                                <button
                                  key={starValue}
                                  type="button"
                                  className={
                                    "star-btn" +
                                    (active ? " star-btn-active" : "")
                                  }
                                  onClick={() => setReviewRating(starValue)}
                                >
                                  ★
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="review-field">
                          <label className="review-label">
                            Your comment
                          </label>
                          <textarea
                            value={reviewComment}
                            onChange={(e) =>
                              setReviewComment(e.target.value)
                            }
                            onKeyDown={stopKeyEvent}
                            onKeyUp={stopKeyEvent}
                            onKeyPress={stopKeyEvent}
                            rows={5}
                            placeholder="What did you think of Little Fighter 2 - Remastered?"
                          />
                        </div>

                        {reviewError && (
                          <div className="auth-message auth-error">
                            {reviewError}
                          </div>
                        )}
                        {reviewStatus && (
                          <div className="auth-message auth-status">
                            {reviewStatus}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="account-btn primary review-submit-btn"
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting
                            ? "Submitting…"
                            : "Submit review"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Reviews list */}
                  <div className="review-list">
                    {reviews !== null && reviews.length > 0 && (
                      <>
                        <h3 className="review-list-title">
                          Player reviews
                        </h3>
                        <ul className="review-list-ul">
                          {reviews.map((r) => (
                            <li key={r.id} className="review-item">
                              <div className="review-item-header">
                                <span className="review-item-name">
                                  {r.name}
                                </span>
                                <span className="review-item-stars">
                                  {Array.from({ length: 5 }).map((_, i) => {
                                    const starValue = i + 1;
                                    const filled = starValue <= r.rating;
                                    return (
                                      <span
                                        key={starValue}
                                        className={
                                          "star-display" +
                                          (filled
                                            ? " star-display-filled"
                                            : "")
                                        }
                                      >
                                        ★
                                      </span>
                                    );
                                  })}
                                </span>
                              </div>
                              {r.comment && (
                                <p className="review-item-comment">
                                  {r.comment}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                <div className="auth-modal-title">Join the fighters</div>
                <div className="auth-modal-subtitle">
                  Log in or sign up to leave a review for Little Fighter 2 -
                  Remastered.
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
                    placeholder="e.g. StreetBrawler"
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

      {/* Styles cloned / adapted from WWIII page */}
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
          color: #ffffff;
        }

        .account-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .account-btn:disabled {
          opacity: 0.6;
          cursor: default;
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
          position: relative;
        }

        .lf2-iframe {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }

        .game-title-section {
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }

        .game-title-shell {
          width: 85vw;
          max-width: 900px;
          display: flex;
          justify-content: center;
        }

        .game-title {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-align: center;
          opacity: 0.95;
        }

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 18px;
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
        .leaderboard p,
        .review p {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .instructions ul {
          margin: 0 0 12px;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .leaderboard-intro {
          font-size: 13px;
          opacity: 0.85;
          margin-bottom: 8px;
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

        /* Review styles (same as WWIII page, adapted) */
        .review-summary {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(12, 16, 32, 0.9);
          margin-bottom: 16px;
          font-size: 14px;
        }

        .review-summary-main {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .review-summary-score {
          font-size: 26px;
          font-weight: 700;
        }

        .review-summary-stars {
          display: flex;
          gap: 2px;
        }

        .review-summary-count {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 4px;
        }

        .star-display {
          font-size: 16px;
          opacity: 0.35;
        }

        .star-display-filled {
          opacity: 1;
          color: #fbbf24;
        }

        .review-form-shell {
          margin-top: 6px;
          margin-bottom: 20px;
        }

        .review-info {
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .review-form {
          display: grid;
          gap: 12px;
        }

        .review-label {
          font-size: 12px;
          opacity: 0.85;
        }

        .review-stars-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .review-stars-buttons {
          display: inline-flex;
          gap: 4px;
        }

        .star-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(15, 23, 42, 0.9);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
        }

        .star-btn-active {
          background: #fbbf24;
          color: #111827;
          border-color: #fbbf24;
        }

        .review-field textarea {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 8px 10px;
          font-size: 13px;
          background: rgba(5, 8, 20, 0.95);
          color: #f5f5f5;
          resize: vertical;
          width: 100%;
          min-height: 110px;
        }

        .review-field textarea:focus {
          outline: none;
          border-color: #ff834a;
          box-shadow: 0 0 0 1px rgba(255, 131, 74, 0.6);
        }

        .review-submit-btn {
          margin-top: 4px;
          width: fit-content;
        }

        .review-list {
          margin-top: 4px;
        }

        .review-list-title {
          margin: 0 0 6px;
          font-size: 15px;
        }

        .review-list-ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .review-item {
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(10, 13, 26, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }

        .review-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }

        .review-item-name {
          font-weight: 600;
        }

        .review-item-stars {
          display: inline-flex;
          gap: 2px;
        }

        .review-item-comment {
          margin: 0;
          opacity: 0.9;
        }

        /* Auth modal */
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

          .game-title {
            font-size: 18px;
          }
        }
      `}</style>
    </>
  );
}
