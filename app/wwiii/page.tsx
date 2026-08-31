// app/page.tsx
"use client";

import { useState, useEffect, useCallback, FormEvent, KeyboardEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../../lib/useAuth";
import { supabase } from "../../lib/supabase";

type TabKey = "instructions" | "updates" | "leaderboard" | "review";

interface ScoreRow {
  id: string;
  rank: number;
  name: string;
  enemiesKilled: number;
  distance: number;
  bulletsFired: {
    Pistol?: number;
    Shotgun?: number;
    Sniper?: number;
    "Machine Gun"?: number;
  };
  createdAt: Date | null;
}

interface ReviewRow {
  id: string;
  uid?: string;
  name: string;
  rating: number;
  comment: string;
  createdAt?: Date | null;
}

interface UpdateRow {
  id: string;
  text: string;
  createdAt?: Date | null;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface PendingScore {
  distance: number;
  enemiesKilled: number;
  bulletsFired: {
    Pistol?: number;
    Shotgun?: number;
    Sniper?: number;
    "Machine Gun"?: number;
  };
}

declare global {
  interface Window {
    auth?: { currentUser: AuthUser | null };
    wwiiiPendingScore?: PendingScore;
  }
}

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return String(error.code);
}

const updateDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const calendarDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatUpdateTitle(date: Date | null | undefined) {
  return date ? `${updateDateFormatter.format(date)} Update` : "Update";
}

function formatCalendarDate(date: Date | null | undefined) {
  if (!date || Number.isNaN(date.getTime())) return "Date unavailable";
  return calendarDateFormatter.format(date);
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");
  const [scores, setScores] = useState<ScoreRow[] | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  // Updates state
  const [updates, setUpdates] = useState<UpdateRow[] | null>(null);
  const [updatesLoaded, setUpdatesLoaded] = useState(false);
  const [updateDraft, setUpdateDraft] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const {
    currentUser, authReady, showAuthForm, setShowAuthForm,
    authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authDisplayName, setAuthDisplayName,
    authLoading, authError, setAuthError, authStatus, setAuthStatus,
    handleAuthSubmit, handleSignOut, userLabel,
  } = useAuth();

  // Run that the game wants to save AFTER login/signup
  const [pendingScore, setPendingScore] = useState<PendingScore | null>(null);

  // The legacy Phaser bundle reads this tiny bridge when saving a run.
  // It intentionally exposes only the current Supabase user's public fields.
  useEffect(() => {
    window.auth = { currentUser };
  }, [currentUser]);

  const isAdmin =
    currentUser?.email &&
    currentUser.email.toLowerCase() === "asianthejason@gmail.com";

  // ---------- Listen for "open auth" from Phaser ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ run?: PendingScore }>).detail;
      const run = detail?.run || window.wwiiiPendingScore;

      if (run) {
        setPendingScore({
          distance: run.distance ?? 0,
          enemiesKilled: run.enemiesKilled ?? 0,
          bulletsFired: run.bulletsFired || {},
        });
      }

      setShowAuthForm(true);
      setAuthMode("signup");
      setAuthError(null);
      setAuthStatus(null);
    };

    window.addEventListener("wwiii-open-auth", handler);
    return () => window.removeEventListener("wwiii-open-auth", handler);
  }, [setAuthError, setAuthMode, setAuthStatus, setShowAuthForm]);

  // ---------- Ensure game canvas exists; reload page if not ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timeoutId = window.setTimeout(() => {
      const container = document.getElementById("gameContainer");
      const hasCanvas = !!container?.querySelector("canvas");

      if (!hasCanvas) {
        try {
          const guardKey = "wwiiiLastReloadAt";
          const now = Date.now();
          const last = window.sessionStorage.getItem(guardKey);
          if (!last || now - Number(last) > 5000) {
            window.sessionStorage.setItem(guardKey, String(now));
            window.location.reload();
          }
        } catch {
          // If sessionStorage is unavailable, just reload once
          window.location.reload();
        }
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  // ---------- Supabase game data ----------
  useEffect(() => {
    let active = true;
    const loadScores = async () => {
      const scoreResult = await supabase.from("scores").select("id,name,distance,enemies_killed,bullets_fired,created_at").order("distance", { ascending: false }).limit(10);
      if (!active) return;
      if (!scoreResult.error) setScores((scoreResult.data || []).map((row, index) => ({
        id: String(row.id), rank: index + 1, name: row.name, distance: row.distance,
        enemiesKilled: row.enemies_killed, bulletsFired: row.bullets_fired || {},
        createdAt: row.created_at ? new Date(row.created_at) : null,
      })));
    };
    const loadReviews = async () => {
      const reviewResult = await supabase.from("reviews").select("id,user_id,name,rating,comment,created_at").order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      if (!reviewResult.error) setReviews((reviewResult.data || []).map((row) => ({
        id: String(row.id), uid: row.user_id, name: row.name, rating: row.rating,
        comment: row.comment, createdAt: new Date(row.created_at),
      })));
    };
    const loadUpdates = async () => {
      const updateResult = await supabase.from("updates").select("id,text,created_at").order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      if (!updateResult.error) {
        setUpdates((updateResult.data || []).map((row) => ({ id: String(row.id), text: row.text, createdAt: new Date(row.created_at) })));
        setUpdateError(null);
      } else setUpdateError("Could not load updates.");
      setUpdatesLoaded(true);
    };
    void Promise.all([loadScores(), loadReviews(), loadUpdates()]);
    const channel = supabase.channel("wwiii-page-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => { void loadScores(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => { void loadReviews(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "updates" }, () => { void loadUpdates(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);

  // ---------- Save pending score to Supabase ----------
  const savePendingScore = useCallback(async (user: AuthUser, run = pendingScore) => {
    if (!run) return;
    const displayName = user.displayName || user.email || "Unknown soldier";
    const { count, error: rankError } = await supabase.from("scores").select("id", { count: "exact", head: true }).gt("distance", run.distance);
    if (rankError) throw rankError;
    const rank = (count || 0) + 1;
    if ((count || 0) >= 10) {
      setPendingScore(null);
      setAuthStatus(`Your run would be #${rank}, but only the top 10 runs are saved.`);
      return;
    }
    const { error } = await supabase.from("scores").insert({
      user_id: user.uid, name: displayName, distance: run.distance,
      enemies_killed: run.enemiesKilled, bullets_fired: run.bulletsFired || {},
    });
    if (error) throw error;
    window.dispatchEvent(new CustomEvent("wwiii-run-saved", { detail: { name: displayName } }));
    setPendingScore(null);
    setAuthStatus("Run saved to leaderboard.");
  }, [pendingScore, setAuthStatus]);

  useEffect(() => {
    const handleScore = (event: Event) => {
      const run = (event as CustomEvent<{ run?: PendingScore }>).detail?.run;
      if (!run) return;
      if (currentUser) void savePendingScore(currentUser, run);
      else setPendingScore(run);
    };
    window.addEventListener("wwiii-score-ready", handleScore);
    return () => window.removeEventListener("wwiii-score-ready", handleScore);
  }, [currentUser, savePendingScore]);

  // ---------- Review submit ----------
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
      const name =
        currentUser.displayName || currentUser.email || "Unknown soldier";

      const { error } = await supabase.from("reviews").insert({
        user_id: currentUser.uid,
        name,
        rating: reviewRating,
        comment: trimmedComment,
      });
      if (error) throw error;

      setReviewStatus("Thanks for your review!");
      setReviewComment("");
    } catch (err: unknown) {
      console.error("Error submitting review", err);
      if (getErrorCode(err) === "permission-denied") {
        setReviewError(
          "Your review was rejected by the server. Please sign in and try again."
        );
      } else {
        setReviewError("Could not submit your review. Please try again.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ---------- Update submit (admin only) ----------
  const handleUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUpdateError(null);

    const trimmed = updateDraft.trim();
    if (!trimmed) {
      setUpdateError("Write something before posting an update.");
      return;
    }

    if (!isAdmin) {
      setUpdateError("Only the admin account can post updates.");
      return;
    }

    try {
      setUpdateSubmitting(true);
      const { error } = await supabase.from("updates").insert({
        text: trimmed,
      });
      if (error) throw error;

      setUpdateDraft("");
    } catch (err: unknown) {
      console.error("Error posting update", err);
      if (getErrorCode(err) === "permission-denied") {
        setUpdateError(
          "The update was rejected by the server. Check the Supabase policy."
        );
      } else {
        setUpdateError("Could not post update. Please try again.");
      }
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const headerUser = currentUser;

  // helper to stop key events from reaching the game
  const stopKeyEvent = (e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  // Average rating computation
  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  const averageRatingRounded = averageRating
    ? Math.round(averageRating * 10) / 10
    : 0;

  return (
    <>
      {/* --- External libraries --- */}
      <Script
        src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.js"
        strategy="beforeInteractive"
      />
      <Script src="/WWIII/main.js" strategy="afterInteractive" />

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

        {/* Game */}
        <section className="game-section">
          <div className="game-shell">
            <div id="gameContainer" className="game-container" />
          </div>
        </section>

        {/* NEW: Game title under game, above tabs */}
        <section className="game-title-section">
          <div className="game-title-shell">
            <h1 className="game-title">WWIII - Endless Defence</h1>
          </div>
        </section>

        {/* Tabs (instructions / updates / leaderboard / review) */}
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
                  (activeTab === "updates" ? " tab-button-active" : "")
                }
                onClick={() => setActiveTab("updates")}
              >
                Updates
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
                    <li>A / W / D for movement.</li>
                    <li>
                      Left click to fire your weapon (aim with your mouse).
                    </li>
                    <li>Right click to reload.</li>
                    <li>Q / E to switch weapons.</li>
                    <li>F to open the shop.</li>
                    <li>Pistol has unlimited reloads</li>
                    <li>Shield can be purchased in the upgrade menu. Shield will always reduce by 2 per bullet hit</li>
                    <li>
                      Shotguns fire multiple bullets at a time with a spread,
                      the bullet range is shorter
                    </li>
                    <li>
                      Sniper is extremely effective with headshots but weak
                      without. Bullets have 4 pierce
                    </li>
                    <li>
                      Machine Gun auto fires when left click is held. Bullets
                      have 2 pierce
                    </li>
                    <li>Earn cash by surviving and killing enemies.</li>
                    <li>Spend money on upgrades between runs.</li>
                  </ul>
                </div>
              )}

              {activeTab === "updates" && (
                <div className="updates">
                  <h2>Updates</h2>

                  {isAdmin && (
                    <form
                      className="update-form"
                      onSubmit={handleUpdateSubmit}
                    >
                      <label className="update-label">
                        New update (only visible to you to edit)
                      </label>
                      <textarea
                        className="update-textarea"
                        rows={4}
                        value={updateDraft}
                        onChange={(e) => setUpdateDraft(e.target.value)}
                        onKeyDown={stopKeyEvent}
                        onKeyUp={stopKeyEvent}
                        onKeyPress={stopKeyEvent}
                        placeholder="Write a short update about changes, fixes, or notes for players."
                      />
                      {updateError && (
                        <div className="auth-message auth-error">
                          {updateError}
                        </div>
                      )}
                      <button
                        type="submit"
                        className="account-btn primary update-submit-btn"
                        disabled={updateSubmitting}
                      >
                        {updateSubmitting ? "Posting…" : "Post update"}
                      </button>
                    </form>
                  )}

                  {!isAdmin && (
                    <p className="updates-info">
                      Latest updates and patch notes from the developer.
                    </p>
                  )}

                  <div className="updates-list">
                    {!updatesLoaded && <p>Loading updates…</p>}

                    {updatesLoaded &&
                      (!updates || updates.length === 0) &&
                      !updateError && (
                        <p>No updates posted yet.</p>
                      )}

                    {updatesLoaded && updates && updates.length > 0 && (
                      <ul className="updates-list-ul">
                        {updates.map((u) => (
                          <li key={u.id} className="update-item">
                            <div className="update-item-title">
                              {formatUpdateTitle(u.createdAt ?? null)}
                            </div>
                            {u.text && (
                              <p className="update-item-body">{u.text}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "leaderboard" && (
                <div className="leaderboard">
                  <h2>Top Runs</h2>
                  <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Date</th>
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
                            <td colSpan={9}>Loading…</td>
                          </tr>
                        )}

                        {scores !== null && scores.length === 0 && (
                          <tr>
                            <td colSpan={9}>
                              No scores yet. Be the first to reach the front
                              lines.
                            </td>
                          </tr>
                        )}

                        {scores &&
                          scores.map((s) => (
                            <tr key={s.id}>
                              <td>{s.rank}</td>
                              <td>{formatCalendarDate(s.createdAt)}</td>
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
                  <h2>Reviews</h2>

                  {/* Average rating */}
                  <div className="review-summary">
                    {reviews === null && <span>Loading reviews…</span>}
                    {reviews !== null && reviews.length === 0 && (
                      <span>No reviews yet. Be the first to rate the game.</span>
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
                            placeholder="What did you think of WWIII — Endless Defense?"
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
                        <h3 className="review-list-title">Player reviews</h3>
                        <ul className="review-list-ul">
                          {reviews.map((r) => (
                            <li key={r.id} className="review-item">
                              <div className="review-item-header">
                                <span className="review-item-author">
                                  <span className="review-item-name">
                                    {r.name}
                                  </span>
                                  <span className="review-item-date">
                                    {formatCalendarDate(r.createdAt)}
                                  </span>
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
          <span>© {new Date().getFullYear()} AsiantheJason</span>

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

        /* Shared button styles for header + page */
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
        }

        /* New title styles */
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
        .review h2,
        .updates h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .instructions p,
        .review p,
        .updates p {
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

        /* Updates styles */
        .update-form {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }

        .update-label {
          font-size: 12px;
          opacity: 0.85;
        }

        .update-textarea {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 8px 10px;
          font-size: 13px;
          background: rgba(5, 8, 20, 0.95);
          color: #f5f5f5;
          resize: vertical;
          width: 100%;
        }

        .update-textarea:focus {
          outline: none;
          border-color: #ff834a;
          box-shadow: 0 0 0 1px rgba(255, 131, 74, 0.6);
        }

        .update-submit-btn {
          margin-top: 4px;
          width: fit-content;
        }

        .updates-info {
          font-size: 13px;
          opacity: 0.8;
          margin-bottom: 10px;
        }

        .updates-list-ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
        }

        .update-item {
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(10, 13, 26, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }

        .update-item-title {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .update-item-body {
          margin: 0;
          white-space: pre-wrap;
          opacity: 0.92;
        }

        /* Review styles */
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

        .review-item-author {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 6px;
        }

        .review-item-date {
          font-size: 12px;
          opacity: 0.65;
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
