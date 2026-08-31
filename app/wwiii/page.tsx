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

interface ScoreDatabaseRow {
  id: string | number;
  name: string;
  distance: number;
  enemies_killed: number;
  bullets_fired: ScoreRow["bulletsFired"] | null;
  created_at: string | null;
}

interface UpdateDatabaseRow {
  id: string | number;
  text: string;
  created_at: string | null;
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

function mapUpdateRow(row: UpdateDatabaseRow): UpdateRow {
  return {
    id: String(row.id),
    text: row.text,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function rankScoreRows(rows: ScoreDatabaseRow[]): ScoreRow[] {
  return rows
    .map((row) => ({
      id: String(row.id),
      rank: 0,
      name: row.name,
      distance: row.distance,
      enemiesKilled: row.enemies_killed,
      bulletsFired: row.bullets_fired || {},
      createdAt: row.created_at ? new Date(row.created_at) : null,
    }))
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));
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
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingUpdateDraft, setEditingUpdateDraft] = useState("");
  const [updateMutatingId, setUpdateMutatingId] = useState<string | null>(null);

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
      if (!scoreResult.error) setScores(rankScoreRows((scoreResult.data || []) as ScoreDatabaseRow[]));
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
        setUpdates((updateResult.data || []).map((row) => mapUpdateRow(row as UpdateDatabaseRow)));
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
    const { data: savedScore, error } = await supabase.from("scores").insert({
      user_id: user.uid, name: displayName, distance: run.distance,
      enemies_killed: run.enemiesKilled, bullets_fired: run.bulletsFired || {},
    }).select("id,name,distance,enemies_killed,bullets_fired,created_at").single();
    if (error) throw error;
    if (savedScore) {
      setScores((current) => rankScoreRows([
        ...((current || []).map((row) => ({
          id: row.id,
          name: row.name,
          distance: row.distance,
          enemies_killed: row.enemiesKilled,
          bullets_fired: row.bulletsFired,
          created_at: row.createdAt?.toISOString() || null,
        })) as ScoreDatabaseRow[]),
        savedScore as ScoreDatabaseRow,
      ]));
    }
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
    setUpdateStatus(null);

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
      const { data: savedUpdate, error } = await supabase.from("updates").insert({
        text: trimmed,
      }).select("id,text,created_at").single();
      if (error) throw error;

      if (savedUpdate) {
        const nextUpdate = mapUpdateRow(savedUpdate as UpdateDatabaseRow);
        setUpdates((current) => [nextUpdate, ...(current || []).filter((item) => item.id !== nextUpdate.id)]);
      }
      setUpdateDraft("");
      setUpdateStatus("Update posted.");
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

  const beginEditingUpdate = (update: UpdateRow) => {
    setEditingUpdateId(update.id);
    setEditingUpdateDraft(update.text);
    setUpdateError(null);
    setUpdateStatus(null);
  };

  const cancelEditingUpdate = () => {
    setEditingUpdateId(null);
    setEditingUpdateDraft("");
  };

  const saveEditedUpdate = async (updateId: string) => {
    const trimmed = editingUpdateDraft.trim();
    setUpdateError(null);
    setUpdateStatus(null);

    if (!isAdmin) {
      setUpdateError("Only the admin account can edit updates.");
      return;
    }
    if (!trimmed) {
      setUpdateError("An update cannot be empty.");
      return;
    }

    try {
      setUpdateMutatingId(updateId);
      const { data, error } = await supabase
        .from("updates")
        .update({ text: trimmed })
        .eq("id", updateId)
        .select("id,text,created_at")
        .single();
      if (error) throw error;

      const savedUpdate = mapUpdateRow(data as UpdateDatabaseRow);
      setUpdates((current) => (current || []).map((item) => item.id === updateId ? savedUpdate : item));
      cancelEditingUpdate();
      setUpdateStatus("Update saved.");
    } catch (err) {
      console.error("Error editing update", err);
      setUpdateError("Could not edit the update. Check the Supabase admin policy.");
    } finally {
      setUpdateMutatingId(null);
    }
  };

  const deleteUpdate = async (updateId: string) => {
    if (!isAdmin) {
      setUpdateError("Only the admin account can delete updates.");
      return;
    }
    if (!window.confirm("Delete this update? This cannot be undone.")) return;

    setUpdateError(null);
    setUpdateStatus(null);
    try {
      setUpdateMutatingId(updateId);
      const { error } = await supabase.from("updates").delete().eq("id", updateId);
      if (error) throw error;
      setUpdates((current) => (current || []).filter((item) => item.id !== updateId));
      if (editingUpdateId === updateId) cancelEditingUpdate();
      setUpdateStatus("Update deleted.");
    } catch (err) {
      console.error("Error deleting update", err);
      setUpdateError("Could not delete the update. Check the Supabase admin policy.");
    } finally {
      setUpdateMutatingId(null);
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
                <div className="instructions visual-instructions">
                  <section className="objective-card" aria-labelledby="objective-title">
                    <div className="objective-target" aria-hidden="true">
                      <span className="objective-target-core" />
                    </div>
                    <div className="objective-copy">
                      <span className="instruction-eyebrow">Your objective</span>
                      <h2 id="objective-title">Keep moving. Stay alive. Go farther.</h2>
                      <p>
                        Push into enemy territory, defeat attackers, collect cash,
                        and improve your loadout. Your farthest distance earns a
                        place on the leaderboard.
                      </p>
                    </div>
                    <div className="objective-route" aria-hidden="true">
                      <span className="route-soldier">●</span>
                      <span className="route-line" />
                      <span className="route-flag">⚑</span>
                    </div>
                  </section>

                  <div className="control-guide">
                    <section className="control-card keyboard-card" aria-labelledby="keyboard-title">
                      <div className="control-card-heading">
                        <span className="control-card-icon" aria-hidden="true">⌨</span>
                        <div>
                          <span className="instruction-eyebrow">Keyboard</span>
                          <h3 id="keyboard-title">Movement & actions</h3>
                        </div>
                      </div>

                      <div className="keyboard-layout" aria-label="Keyboard controls">
                        <div className="key-control key-q">
                          <kbd>Q</kbd><span>Previous weapon</span>
                        </div>
                        <div className="key-control key-w">
                          <kbd>W</kbd><span>Jump</span>
                        </div>
                        <div className="key-control key-e">
                          <kbd>E</kbd><span>Next weapon</span>
                        </div>
                        <div className="key-control key-a">
                          <kbd>A</kbd><span>Move left</span>
                        </div>
                        <div className="key-control key-d">
                          <kbd>D</kbd><span>Move right</span>
                        </div>
                        <div className="key-control key-f">
                          <kbd>F</kbd><span>Open shop</span>
                        </div>
                        <div className="key-control key-space">
                          <kbd>Space</kbd><span>Use medkit</span>
                        </div>
                      </div>
                    </section>

                    <section className="control-card mouse-card" aria-labelledby="mouse-title">
                      <div className="control-card-heading">
                        <span className="control-card-icon" aria-hidden="true">◎</span>
                        <div>
                          <span className="instruction-eyebrow">Mouse</span>
                          <h3 id="mouse-title">Aim & fire</h3>
                        </div>
                      </div>

                      <div className="mouse-demo" aria-label="Move the mouse to aim, left click to fire, and right click to reload">
                        <div className="mouse-aim" aria-hidden="true">
                          <span /><span />
                        </div>
                        <div className="mouse-shell" aria-hidden="true">
                          <span className="mouse-button mouse-button-left" />
                          <span className="mouse-button mouse-button-right" />
                          <span className="mouse-wheel" />
                        </div>
                        <div className="mouse-actions">
                          <div><span className="click-dot fire-dot" />Left click<strong>Fire</strong></div>
                          <div><span className="click-dot reload-dot" />Right click<strong>Reload</strong></div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="gameplay-loop" aria-label="Gameplay loop">
                    <div><span aria-hidden="true">➜</span><strong>Advance</strong><small>Build distance</small></div>
                    <div><span aria-hidden="true">✦</span><strong>Defeat</strong><small>Earn cash</small></div>
                    <div><span aria-hidden="true">⬆</span><strong>Upgrade</strong><small>Get stronger</small></div>
                    <div><span aria-hidden="true">↻</span><strong>Repeat</strong><small>Beat your record</small></div>
                  </div>
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
                        New update — posting is restricted to your admin account
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
                      {updateStatus && (
                        <div className="auth-message auth-success">
                          {updateStatus}
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
                            <div className="update-item-header">
                              <div className="update-item-title">
                                {formatUpdateTitle(u.createdAt ?? null)}
                              </div>
                              {isAdmin && editingUpdateId !== u.id && (
                                <div className="update-item-actions">
                                  <button
                                    type="button"
                                    className="update-action-btn"
                                    onClick={() => beginEditingUpdate(u)}
                                    disabled={updateMutatingId === u.id}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="update-action-btn update-delete-btn"
                                    onClick={() => void deleteUpdate(u.id)}
                                    disabled={updateMutatingId === u.id}
                                  >
                                    {updateMutatingId === u.id ? "Working…" : "Delete"}
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingUpdateId === u.id ? (
                              <div className="update-edit-form">
                                <textarea
                                  className="update-textarea"
                                  rows={4}
                                  value={editingUpdateDraft}
                                  onChange={(event) => setEditingUpdateDraft(event.target.value)}
                                  onKeyDown={stopKeyEvent}
                                  onKeyUp={stopKeyEvent}
                                  onKeyPress={stopKeyEvent}
                                  maxLength={5000}
                                  autoFocus
                                />
                                <div className="update-edit-actions">
                                  <button
                                    type="button"
                                    className="account-btn primary"
                                    onClick={() => void saveEditedUpdate(u.id)}
                                    disabled={updateMutatingId === u.id}
                                  >
                                    {updateMutatingId === u.id ? "Saving…" : "Save changes"}
                                  </button>
                                  <button
                                    type="button"
                                    className="account-btn"
                                    onClick={cancelEditingUpdate}
                                    disabled={updateMutatingId === u.id}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : u.text ? (
                              <p className="update-item-body">{u.text}</p>
                            ) : null}
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

        .visual-instructions {
          display: grid;
          gap: 18px;
        }

        .objective-card,
        .control-card,
        .gameplay-loop {
          border: 1px solid rgba(129, 140, 248, 0.28);
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(4, 7, 18, 0.96));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .objective-card {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) minmax(150px, 0.45fr);
          align-items: center;
          gap: 20px;
          overflow: hidden;
          padding: 22px;
          border-radius: 18px;
        }

        .objective-card::after {
          content: "";
          position: absolute;
          right: -70px;
          top: -100px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.13), transparent 68%);
          pointer-events: none;
        }

        .objective-target {
          position: relative;
          width: 76px;
          height: 76px;
          flex: 0 0 auto;
          border: 2px solid rgba(248, 113, 113, 0.9);
          border-radius: 50%;
          box-shadow: inset 0 0 0 12px rgba(248, 113, 113, 0.08), 0 0 26px rgba(248, 113, 113, 0.16);
        }

        .objective-target::before,
        .objective-target::after {
          content: "";
          position: absolute;
          background: rgba(248, 113, 113, 0.75);
        }

        .objective-target::before {
          left: 50%;
          top: -8px;
          width: 1px;
          height: calc(100% + 16px);
        }

        .objective-target::after {
          left: -8px;
          top: 50%;
          width: calc(100% + 16px);
          height: 1px;
        }

        .objective-target-core {
          position: absolute;
          inset: 25px;
          z-index: 1;
          border-radius: 50%;
          background: #fb7185;
          box-shadow: 0 0 18px rgba(251, 113, 133, 0.85);
          animation: target-pulse 1.7s ease-in-out infinite;
        }

        .instruction-eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #7dd3fc;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .objective-copy h2,
        .control-card-heading h3 {
          margin: 0;
          color: #f8fafc;
        }

        .objective-copy h2 {
          font-size: clamp(20px, 2.4vw, 28px);
        }

        .objective-copy p {
          max-width: 690px;
          margin: 8px 0 0;
          color: #cbd5e1;
        }

        .objective-route {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          color: #86efac;
        }

        .route-soldier {
          font-size: 18px;
          filter: drop-shadow(0 0 7px rgba(134, 239, 172, 0.8));
          animation: soldier-advance 2.2s ease-in-out infinite;
        }

        .route-line {
          height: 2px;
          flex: 1;
          margin: 0 8px;
          background: repeating-linear-gradient(90deg, #34d399 0 8px, transparent 8px 14px);
          background-size: 28px 2px;
          animation: route-move 1s linear infinite;
        }

        .route-flag {
          color: #fbbf24;
          font-size: 34px;
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.35));
        }

        .control-guide {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.8fr);
          gap: 18px;
        }

        .control-card {
          min-width: 0;
          padding: 20px;
          border-radius: 18px;
        }

        .control-card-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 20px;
        }

        .control-card-heading h3 {
          font-size: 17px;
        }

        .control-card-icon {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(125, 211, 252, 0.3);
          border-radius: 11px;
          background: rgba(14, 165, 233, 0.09);
          color: #7dd3fc;
          font-size: 22px;
        }

        .keyboard-layout {
          display: grid;
          grid-template-columns: repeat(7, minmax(50px, 1fr));
          grid-template-rows: repeat(2, auto);
          gap: 15px 8px;
          align-items: start;
        }

        .key-control {
          display: grid;
          justify-items: center;
          gap: 7px;
          min-width: 0;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.15;
          text-align: center;
        }

        .key-control kbd {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          border: 1px solid #64748b;
          border-bottom-width: 4px;
          border-radius: 9px;
          background: linear-gradient(#263348, #111827);
          color: #f8fafc;
          font: 700 18px/1 var(--font-geist-mono), monospace;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
          animation: key-press 3.5s ease-in-out infinite;
        }

        .key-q { grid-column: 1; grid-row: 1; }
        .key-w { grid-column: 2; grid-row: 1; }
        .key-e { grid-column: 3; grid-row: 1; }
        .key-a { grid-column: 1; grid-row: 2; }
        .key-d { grid-column: 3; grid-row: 2; }
        .key-f { grid-column: 4; grid-row: 2; }
        .key-space { grid-column: 2 / span 3; grid-row: 3; }
        .key-space kbd {
          width: 150px;
          font-size: 13px;
        }
        .key-w kbd { animation-delay: -0.2s; }
        .key-a kbd { animation-delay: -1.1s; }
        .key-d kbd { animation-delay: -2.1s; }

        .mouse-demo {
          position: relative;
          display: grid;
          justify-items: center;
          min-height: 190px;
          padding-top: 4px;
        }

        .mouse-shell {
          position: relative;
          width: 92px;
          height: 124px;
          overflow: hidden;
          border: 2px solid #94a3b8;
          border-radius: 46px 46px 38px 38px;
          background: linear-gradient(145deg, #1e293b, #0f172a);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.34);
        }

        .mouse-shell::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 0;
          width: 1px;
          height: 49px;
          background: #64748b;
        }

        .mouse-button {
          position: absolute;
          top: 0;
          width: 50%;
          height: 49px;
          background: rgba(125, 211, 252, 0.04);
        }

        .mouse-button-left {
          left: 0;
          animation: mouse-left-click 2.4s ease-in-out infinite;
        }

        .mouse-button-right {
          right: 0;
          animation: mouse-right-click 2.4s ease-in-out infinite;
        }

        .mouse-wheel {
          position: absolute;
          z-index: 2;
          left: 50%;
          top: 14px;
          width: 8px;
          height: 20px;
          border: 1px solid #64748b;
          border-radius: 5px;
          background: #020617;
          transform: translateX(-50%);
        }

        .mouse-aim {
          position: absolute;
          right: 14%;
          top: 20px;
          width: 30px;
          height: 30px;
          border: 1px solid #fb7185;
          border-radius: 50%;
          animation: aim-drift 2.4s ease-in-out infinite;
        }

        .mouse-aim span {
          position: absolute;
          left: 50%;
          top: 50%;
          background: #fb7185;
          transform: translate(-50%, -50%);
        }

        .mouse-aim span:first-child { width: 38px; height: 1px; }
        .mouse-aim span:last-child { width: 1px; height: 38px; }

        .mouse-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          width: 100%;
          margin-top: 13px;
        }

        .mouse-actions div {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 2px 7px;
          color: #94a3b8;
          font-size: 10px;
        }

        .mouse-actions strong {
          grid-column: 2;
          color: #e2e8f0;
          font-size: 13px;
        }

        .click-dot {
          grid-row: 1 / span 2;
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .fire-dot { background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
        .reload-dot { background: #fb7185; box-shadow: 0 0 8px #fb7185; }

        .gameplay-loop {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-radius: 16px;
        }

        .gameplay-loop div {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 2px 10px;
          padding: 15px 18px;
        }

        .gameplay-loop div:not(:last-child)::after {
          content: "›";
          position: absolute;
          right: -5px;
          top: 50%;
          z-index: 1;
          color: #64748b;
          font-size: 22px;
          transform: translateY(-50%);
        }

        .gameplay-loop span {
          grid-row: 1 / span 2;
          align-self: center;
          color: #7dd3fc;
          font-size: 20px;
        }

        .gameplay-loop strong { color: #e2e8f0; font-size: 13px; }
        .gameplay-loop small { color: #94a3b8; font-size: 10px; }

        @keyframes target-pulse {
          50% { transform: scale(0.72); opacity: 0.65; }
        }

        @keyframes route-move {
          to { background-position: 28px 0; }
        }

        @keyframes soldier-advance {
          50% { transform: translateX(8px); }
        }

        @keyframes key-press {
          0%, 88%, 100% { transform: translateY(0); border-bottom-width: 4px; color: #f8fafc; }
          92%, 96% { transform: translateY(3px); border-bottom-width: 1px; color: #7dd3fc; box-shadow: 0 0 18px rgba(56, 189, 248, 0.25); }
        }

        @keyframes mouse-left-click {
          0%, 16%, 100% { background: rgba(125, 211, 252, 0.04); }
          7% { background: rgba(56, 189, 248, 0.55); transform: translateY(2px); }
        }

        @keyframes mouse-right-click {
          0%, 54%, 70%, 100% { background: rgba(251, 113, 133, 0.04); }
          62% { background: rgba(251, 113, 133, 0.55); transform: translateY(2px); }
        }

        @keyframes aim-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, 12px); }
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
        }

        .update-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
        }

        .update-item-actions,
        .update-edit-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .update-action-btn {
          border: 1px solid rgba(125, 211, 252, 0.42);
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(14, 116, 144, 0.12);
          color: #bae6fd;
          cursor: pointer;
          font: inherit;
        }

        .update-action-btn:hover:not(:disabled) {
          border-color: #7dd3fc;
          background: rgba(14, 116, 144, 0.25);
        }

        .update-delete-btn {
          border-color: rgba(248, 113, 113, 0.45);
          background: rgba(127, 29, 29, 0.16);
          color: #fecaca;
        }

        .update-delete-btn:hover:not(:disabled) {
          border-color: #f87171;
          background: rgba(127, 29, 29, 0.32);
        }

        .update-action-btn:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .update-edit-form {
          display: grid;
          gap: 10px;
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

          .objective-card {
            grid-template-columns: auto 1fr;
            gap: 14px;
            padding: 17px;
          }

          .objective-target {
            width: 58px;
            height: 58px;
          }

          .objective-target-core {
            inset: 19px;
          }

          .objective-route {
            grid-column: 1 / -1;
            padding: 0 10px;
          }

          .control-guide {
            grid-template-columns: 1fr;
          }

          .keyboard-layout {
            grid-template-columns: repeat(7, minmax(34px, 1fr));
            gap: 14px 3px;
          }

          .key-control kbd {
            width: 38px;
            height: 38px;
            font-size: 15px;
          }

          .key-space kbd {
            width: 110px;
            font-size: 12px;
          }

          .key-control span {
            font-size: 9px;
          }

          .gameplay-loop {
            grid-template-columns: 1fr 1fr;
          }

          .gameplay-loop div:nth-child(2)::after {
            display: none;
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

        @media (prefers-reduced-motion: reduce) {
          .objective-target-core,
          .route-soldier,
          .route-line,
          .key-control kbd,
          .mouse-button,
          .mouse-aim {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
