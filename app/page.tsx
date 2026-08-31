// app/page.tsx
"use client";

import { useState, KeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "./components/SiteHeader";
import GoogleAuthButton from "./components/GoogleAuthButton";
import { useAuth } from "../lib/useAuth";

type HomeTab = "games" | "dev";

const GAMES = [
  {
    id: "wwiii",
    title: "WWIII — Endless Defense",
    status: "Live",
    description:
      "A brutal endless defense shooter. Survive waves of enemies, manage ammo, and push your distance record.",
    href: "/wwiii",
    tags: ["Shooter", "Endless", "PC Browser"],
    // Thumbnail image in /public
    thumbnail: "/wwiii-image.png",
  },
  // Add more games here later.
];

const DEV_PROJECTS = [
  {
    id: "ftc-teams",
    title: "FTC Teams Directory & Watch List",
    status: "Live",
    description:
      "Browse every FTC team, filter by region, and build a personal watch list synced to your account.",
    href: "/ftc-teams",
    tags: ["FTC", "Teams", "Scouting"],
    thumbnail: "/ftc-logo.png",
  },
  {
    id: "power-trader",
    title: "Alberta Power Trader Tool",
    status: "Live",
    description:
      "Alberta energy trading tool for power traders",
    href: "/power-trader",
    tags: ["Power Trading", "Tool", "Alberta"],
    thumbnail: "/power.jpg",
  },
  // Add more dev projects here later.
];

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  const [homeTab, setHomeTab] = useState<HomeTab>("dev");

  // Use the shared auth hook
  const {
    currentUser,
    authReady,
    showAuthForm,
    setShowAuthForm,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authDisplayName,
    setAuthDisplayName,
    authLoading,
    authError,
    setAuthError,
    authStatus,
    setAuthStatus,
    handleAuthSubmit,
    handleSignOut,
    userLabel,
  } = useAuth();

  // Helper to stop key events from reaching the page in the modal inputs
  const stopKeyEvent = (e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* --- Page UI --- */}
      <main className="site">
        {/* Shared header component */}
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

        {/* Hero / title */}
        <section className="home-hero">
          <div className="home-hero-text">
            <div className="home-kicker"><span /> Independent developer portfolio</div>
            <h1>
              I build digital products that turn
              <span> complex ideas into useful experiences.</span>
            </h1>
            <p className="home-hero-lede">
              Software, data tools, robotics platforms, and interactive worlds—designed and built by Jason Huang.
            </p>
            <div className="home-hero-actions">
              <a href="#projects" className="home-hero-primary">Explore the work <span aria-hidden="true">↓</span></a>
              <Link href="/about" className="home-hero-secondary">More about Jason <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="home-proof" aria-label="Portfolio highlights">
              <div><strong>03</strong><span>Live products</span></div>
              <div><strong>Data + Play</strong><span>Across disciplines</span></div>
              <div><strong>Always</strong><span>Building & learning</span></div>
            </div>
          </div>

          <div className="home-hero-visual" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-core"><span>AJ</span><small>BUILD LAB</small></div>
            <div className="hero-float-card hero-float-code"><span>01</span><strong>PRODUCTS</strong><small>Ideas → shipped</small></div>
            <div className="hero-float-card hero-float-data"><span>02</span><strong>DATA</strong><small>Signal → clarity</small></div>
            <div className="hero-float-card hero-float-play"><span>03</span><strong>PLAY</strong><small>Systems → worlds</small></div>
          </div>
        </section>

        {/* Support / donation section */}
        <section id="support" className="home-support">
          <div className="home-support-shell">
            <h2>Support the projects</h2>
            <p>
              These are solo-dev projects that take a lot of late nights,
              coffee, and testing. If you enjoy what I&apos;m building and want
              to help keep the projects going, any support is hugely
              appreciated.
            </p>
            <p className="home-support-small">
              I&apos;ll be adding more developer tools, applications, games, and features over time —
              your support goes directly into hosting, tools, and time to keep
              improving everything.
            </p>

            {/* Now links to the new /support page */}
            <Link href="/support" className="home-support-btn">
              ⛽ Fuel the projects
            </Link>
          </div>
        </section>

        {/* Games / Dev Projects tabs */}
        <section id="projects" className="panel-section">
          <div className="tabs-shell">
            {/* Tab bar */}
            <div className="home-tabs-row" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={homeTab === "dev"}
                className={
                  "home-tab" + (homeTab === "dev" ? " home-tab-active" : "")
                }
                onClick={() => setHomeTab("dev")}
              >
                Dev Projects
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={homeTab === "games"}
                className={
                  "home-tab" + (homeTab === "games" ? " home-tab-active" : "")
                }
                onClick={() => setHomeTab("games")}
              >
                Games
              </button>
            </div>

            <header className="home-section-header">
              <span className="home-section-pill">
                {homeTab === "games" ? "Games" : "Dev projects"}
              </span>
              <div>
                <h2>
                  {homeTab === "games"
                    ? "More Games Coming Soon"
                    : "Developer tools & projects"}
                </h2>
              </div>
            </header>

            {homeTab === "games" ? (
              <div className="games-grid">
                {GAMES.map((game) => (
                  <article key={game.id} className="game-card">
                    <div className="game-card-layout">
                      {game.thumbnail && (
                        <div className="game-card-media">
                          <div className="game-card-image-wrapper">
                            <Image
                              src={game.thumbnail}
                              alt={game.title}
                              fill
                              className="game-card-image"
                              sizes="(max-width: 800px) 100vw, 320px"
                            />
                          </div>
                        </div>
                      )}

                      <div className="game-card-main">
                        <div className="game-card-top">
                          <h3 className="game-card-title">{game.title}</h3>
                          <span className="game-card-status">
                            {game.status === "Live"
                              ? "● Live"
                              : "○ In development"}
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
                            {game.status === "Live"
                              ? "Play now"
                              : "View details"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="games-grid games-grid-dev">
                {DEV_PROJECTS.map((project) => (
                  <article key={project.id} className="game-card">
                    <div className="game-card-layout">
                      {project.thumbnail && (
                        <div className="game-card-media">
                          <div className="game-card-image-wrapper">
                            <Image
                              src={project.thumbnail}
                              alt={project.title}
                              fill
                              className="game-card-image"
                              sizes="(max-width: 800px) 100vw, 320px"
                            />
                          </div>
                        </div>
                      )}

                      <div className="game-card-main">
                        <div className="game-card-top">
                          <h3 className="game-card-title">{project.title}</h3>
                          <span className="game-card-status">
                            {project.status === "Live"
                              ? "● Live"
                              : "○ In development"}
                          </span>
                        </div>
                        <p className="game-card-body">{project.description}</p>
                        {project.tags && project.tags.length > 0 && (
                          <ul className="game-card-tags">
                            {project.tags.map((tag) => (
                              <li key={tag} className="game-card-tag">
                                {tag}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="game-card-actions">
                          <Link
                            href={project.href}
                            className={
                              project.status === "Live"
                                ? "game-card-primary"
                                : "game-card-secondary"
                            }
                          >
                            {project.status === "Live"
                              ? "Open project"
                              : "View details"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
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
          padding: 0 0 32px;
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

        /* Hero */
        .home-hero {
          width: min(1200px, calc(100% - 48px));
          min-height: 620px;
          margin: 46px auto 0;
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(420px, 0.88fr);
          align-items: center;
          gap: clamp(36px, 7vw, 96px);
          padding: 44px 0 80px;
        }

        .home-hero-text h1 {
          max-width: 760px;
          margin: 22px 0 0;
          font-size: clamp(45px, 5.6vw, 78px);
          line-height: 0.98;
          letter-spacing: -0.055em;
          text-wrap: balance;
        }

        .home-hero-text h1 span {
          color: transparent;
          background: linear-gradient(100deg, #67e8f9 5%, #c4b5fd 72%);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .home-kicker {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #94a3b8;
          font: 700 11px/1 var(--font-geist-mono), monospace;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .home-kicker span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 5px rgba(52, 211, 153, 0.1), 0 0 20px rgba(52, 211, 153, 0.5);
          animation: aj-pulse 2.4s ease-in-out infinite;
        }

        .home-hero-lede {
          max-width: 650px;
          margin: 27px 0 0;
          color: #9aa8bd;
          font-size: clamp(16px, 1.6vw, 20px);
          line-height: 1.65;
        }

        .home-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 32px;
        }

        .home-hero-primary,
        .home-hero-secondary {
          min-height: 50px;
          padding: 0 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        .home-hero-primary {
          color: #031014;
          background: linear-gradient(135deg, #67e8f9, #a5f3fc);
          box-shadow: 0 16px 42px rgba(34, 211, 238, 0.2);
        }

        .home-hero-secondary {
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #dbeafe;
          background: rgba(15, 23, 42, 0.46);
        }

        .home-hero-primary:hover,
        .home-hero-secondary:hover { transform: translateY(-3px); }
        .home-hero-primary:hover { box-shadow: 0 22px 55px rgba(34, 211, 238, 0.3); }
        .home-hero-secondary:hover { border-color: rgba(103, 232, 249, 0.4); }

        .home-proof {
          display: flex;
          gap: clamp(20px, 4vw, 45px);
          margin-top: 48px;
          padding-top: 22px;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
        }

        .home-proof div { display: grid; gap: 5px; }
        .home-proof strong { color: #e2e8f0; font: 700 14px/1 var(--font-geist-mono), monospace; }
        .home-proof span { color: #64748b; font-size: 11px; }

        .home-hero-visual {
          position: relative;
          min-height: 480px;
          display: grid;
          place-items: center;
          perspective: 900px;
        }

        .home-hero-visual::before {
          content: "";
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.16), rgba(109, 40, 217, 0.08) 42%, transparent 70%);
          filter: blur(16px);
        }

        .hero-core {
          position: relative;
          width: 176px;
          aspect-ratio: 1;
          display: grid;
          place-content: center;
          gap: 8px;
          text-align: center;
          border: 1px solid rgba(103, 232, 249, 0.35);
          border-radius: 48px;
          background: linear-gradient(145deg, rgba(15, 29, 52, 0.88), rgba(7, 11, 24, 0.94));
          box-shadow: inset 0 1px rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.45), 0 0 70px rgba(34, 211, 238, 0.08);
          transform: rotate(-8deg);
        }

        .hero-core span { font-size: 57px; font-weight: 800; letter-spacing: -0.08em; color: transparent; background: linear-gradient(135deg, #fff, #67e8f9); background-clip: text; }
        .hero-core small { color: #64748b; font: 700 9px/1 var(--font-geist-mono), monospace; letter-spacing: 0.2em; }

        .hero-orbit { position: absolute; border: 1px solid rgba(148, 163, 184, 0.13); border-radius: 50%; transform: rotate(-18deg); }
        .orbit-one { width: 330px; height: 210px; }
        .orbit-two { width: 440px; height: 315px; transform: rotate(25deg); border-color: rgba(139, 92, 246, 0.13); }

        .hero-float-card {
          position: absolute;
          min-width: 148px;
          padding: 14px 16px;
          display: grid;
          gap: 4px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 16px;
          background: rgba(8, 14, 28, 0.82);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(14px);
          animation: aj-float 5s ease-in-out infinite;
        }

        .hero-float-card span { color: #67e8f9; font: 700 9px/1 var(--font-geist-mono), monospace; }
        .hero-float-card strong { font-size: 11px; letter-spacing: 0.16em; }
        .hero-float-card small { color: #64748b; font-size: 10px; }
        .hero-float-code { top: 11%; right: 1%; }
        .hero-float-data { left: 0; bottom: 17%; animation-delay: -1.7s; }
        .hero-float-play { right: 2%; bottom: 7%; animation-delay: -3.2s; }

        /* Support / donation */
        .home-support {
          display: flex;
          justify-content: center;
          margin-top: 0;
          padding: 0 24px;
        }

        .home-support-shell {
          width: 100%;
          max-width: 1200px;
          border-radius: 24px;
          padding: 26px 28px;
          display: grid;
          grid-template-columns: 0.8fr 1.8fr auto;
          align-items: center;
          gap: 26px;
          background: linear-gradient(120deg, rgba(11, 23, 43, 0.82), rgba(11, 13, 29, 0.86));
          border: 1px solid rgba(103, 232, 249, 0.16);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
        }

        .home-support-shell h2 {
          margin: 0;
          font-size: 21px;
        }

        .home-support-shell p {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        .home-support-small {
          display: none;
        }

        .home-support-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 0;
          min-height: 46px;
          padding: 0 17px;
          border-radius: 13px;
          text-decoration: none;
          background: transparent;
          color: #e2e8f0;
          font-weight: 700;
          font-size: 12px;
          border: 1px solid rgba(251, 146, 60, 0.45);
          cursor: pointer;
          box-shadow: none;
          transition: transform 0.12s ease, box-shadow 0.18s ease;
        }

        .home-support-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(251, 146, 60, 0.8);
          background: rgba(251, 146, 60, 0.08);
          box-shadow: 0 16px 40px rgba(249, 115, 22, 0.12);
        }

        /* Games / Dev projects panel */
        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 82px;
          scroll-margin-top: 110px;
          padding: 0 24px;
        }

        .tabs-shell {
          width: 100%;
          max-width: 1200px;
          background: rgba(7, 12, 24, 0.62);
          border-radius: 28px;
          padding: 12px 22px 24px;
          border: 1px solid rgba(148, 163, 184, 0.13);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(16px);
        }

        .home-tabs-row {
          display: flex;
          justify-content: flex-start;
          gap: 5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          margin-bottom: 14px;
        }

        .home-tab {
          position: relative;
          padding: 16px 14px;
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 14px;
          cursor: pointer;
        }

        .home-tab-active {
          color: #f9fafb;
          font-weight: 500;
        }

        .home-tab-active::after {
          content: "";
          position: absolute;
          left: 14px;
          bottom: -1px;
          height: 2px;
          width: calc(100% - 28px);
          border-radius: 999px;
          background: linear-gradient(90deg, #22d3ee, #8b5cf6);
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
        .games-grid-dev {
          grid-template-columns: minmax(0, 1fr);
        }


        .game-card {
          border-radius: 18px;
          padding: 14px 14px 16px;
          background: linear-gradient(145deg, rgba(15, 24, 43, 0.88), rgba(4, 8, 18, 0.94));
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.24);
          transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
        }

        .game-card:hover {
          transform: translateY(-5px);
          border-color: rgba(103, 232, 249, 0.3);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.34);
        }

        .game-card-layout {
          display: flex;
          gap: 16px;
        }

        .game-card-media {
          flex: 0 0 260px;
        }

        .game-card-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.9);
        }

        .game-card-image {
          object-fit: cover;
        }

        .game-card-main {
          flex: 1;
          min-width: 0;
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

        @media (max-width: 800px) {
          .home-hero { grid-template-columns: 1fr; min-height: auto; }
          .home-hero-visual { min-height: 420px; }
          .home-support-shell { grid-template-columns: 1fr; gap: 12px; }
          .home-support-btn { justify-self: start; }
          .game-card-layout {
            flex-direction: column;
          }

          .game-card-media {
            flex: 0 0 auto;
          }
        }

        @media (max-width: 700px) {
          .home-hero {
            width: min(100% - 30px, 1200px);
            margin-top: 18px;
            padding: 32px 0 44px;
          }

          .home-hero-text h1 { font-size: clamp(40px, 13vw, 58px); }
          .home-proof { gap: 18px; overflow-x: auto; }
          .home-proof div { min-width: max-content; }
          .home-hero-visual { min-height: 350px; transform: scale(0.86); margin: -25px -25px; }

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
