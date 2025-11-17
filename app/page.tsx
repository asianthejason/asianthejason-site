"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  // When you build more games, just add them here.
  // {
  //   id: "next-game",
  //   title: "My Next Game",
  //   status: "In development",
  //   description: "Short teaser about the game.",
  //   href: "/next-game",
  //   tags: ["Coming soon"],
  // },
];

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  // Hook into global firebase (loaded via <Script> on other pages)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fb = (window as any).firebase;
    if (!fb || !fb.auth) return;

    const unsubscribe = fb.auth().onAuthStateChanged((user: any) => {
      if (user) {
        setUserDisplayName(user.displayName || user.email || "Player");
      } else {
        setUserDisplayName(null);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSignOut = () => {
    if (typeof window === "undefined") return;
    const fb = (window as any).firebase;
    if (!fb || !fb.auth) return;

    fb.auth()
      .signOut()
      .catch((err: any) => {
        console.error("Error signing out:", err);
      });
  };

  return (
    <>
      <main className="site">
        {/* Header */}
        <header className="site-header">
          <div className="site-header-inner">
            <div className="site-title">ASIANTHEJASON</div>
            <div className="site-header-spacer" />
            <div className="site-header-account">
              <Link href="/" className="account-btn subtle">
                Home
              </Link>

              {userDisplayName && (
                <span className="site-header-text">
                  Signed in as <strong>{userDisplayName}</strong>
                </span>
              )}

              {userDisplayName ? (
                <>
                  <Link href="/profile" className="account-btn subtle">
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="account-btn primary"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/profile" className="account-btn primary">
                  Login / Sign up
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Hero / title only */}
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

            {/* Replace the href with your actual donation link (PayPal, Ko-fi, etc.) */}
            <a
              href="#"
              className="home-support-btn"
              onClick={(e) => {
                if (
                  (e.currentTarget as HTMLAnchorElement).getAttribute("href") ===
                  "#"
                ) {
                  e.preventDefault();
                  alert(
                    "Replace the donation button link in app/page.tsx with your real donation URL (PayPal, Ko-fi, etc.)."
                  );
                }
              }}
            >
              ⛽ Fuel the project
            </a>
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

        {/* Footer */}
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

        /* Header */
        .site-header {
          padding: 8px 24px 12px;
        }

        .site-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .site-header-spacer {
          flex: 1;
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
        }

        .site-header-account {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .site-header-text {
          opacity: 0.9;
          font-size: 12px;
        }

        .site-header-text strong {
          font-weight: 600;
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

        /* Games panel */
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

        @media (max-width: 700px) {
          .site-header-inner {
            flex-wrap: wrap;
            row-gap: 8px;
          }

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
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
