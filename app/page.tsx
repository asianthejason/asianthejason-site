// app/page.tsx
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

  return (
    <>
      <main className="site">
        {/* Header */}
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="site-title-link">
              <span className="site-title">ASIANTHEJASON</span>
            </Link>

            <div className="site-header-spacer" />

            <nav className="site-header-links">
              <Link href="/" className="site-header-link">
                Home
              </Link>
              <Link href="/wwiii" className="site-header-link">
                WWIII Game
              </Link>
              <Link href="/about" className="site-header-link">
                About
              </Link>
              <Link href="/contact" className="site-header-link">
                Contact
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero / intro */}
        <section className="home-hero">
          <div className="home-hero-text">
            <p className="home-pill">Indie browser games by Jason</p>
            <h1>Welcome to my little game corner on the internet 🎮</h1>
            <p className="home-hero-body">
              I&apos;m building a collection of small but ambitious web games.
              Right now there&apos;s one main game, WWIII — Endless Defense,
              and more are on the way.
            </p>
            <div className="home-hero-actions">
              <Link href="/wwiii" className="home-hero-primary">
                Play WWIII now
              </Link>
              <a href="#support" className="home-hero-secondary">
                Support the project
              </a>
            </div>
          </div>

          <div className="home-hero-highlight">
            <div className="home-hero-highlight-inner">
              <p className="home-highlight-label">Currently featured</p>
              <h2>WWIII — Endless Defense</h2>
              <p>
                An endless defense shooter with upgrades, weapons, and way too
                many enemies. Built from scratch in Phaser and Firebase.
              </p>
              <Link href="/wwiii" className="home-highlight-link">
                Jump into the battle →
              </Link>
            </div>
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
                if ((e.currentTarget as HTMLAnchorElement).getAttribute("href") === "#") {
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
                      {game.status === "Live"
                        ? "Play now"
                        : "View details"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer">
          <span>© {currentYear} ASIANTHEJASON. All rights reserved.</span>
          <div className="site-footer-links">
            <Link href="/privacy-policy" className="site-footer-link">
              Privacy Policy
            </Link>
            <Link href="/terms" className="site-footer-link">
              Terms
            </Link>
            <Link href="/contact" className="site-footer-link">
              Contact
            </Link>
          </div>
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

        .site-header {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(22px);
          background: linear-gradient(
            to bottom,
            rgba(3, 6, 19, 0.95),
            rgba(3, 6, 19, 0.75),
            transparent
          );
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .site-header-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .site-title-link {
          text-decoration: none;
          color: inherit;
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

        .site-header-links {
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 14px;
        }

        .site-header-link {
          text-decoration: none;
          color: rgba(245, 245, 245, 0.9);
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid transparent;
          transition: background 0.18s ease, border-color 0.18s ease,
            transform 0.12s ease;
          opacity: 0.9;
        }

        .site-header-link:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.16);
          transform: translateY(-1px);
        }

        .home-hero {
          max-width: 1100px;
          margin: 28px auto 0;
          padding: 0 16px;
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 32px;
          align-items: center;
        }

        .home-hero-text h1 {
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.1;
          margin: 10px 0 14px;
        }

        .home-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          background: radial-gradient(circle at top, #141d3a, #080a16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #c6cff8;
        }

        .home-hero-body {
          max-width: 520px;
          font-size: 15px;
          opacity: 0.88;
        }

        .home-hero-actions {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .home-hero-primary,
        .home-hero-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 14px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.14);
          transition: background 0.18s ease, transform 0.12s ease,
            box-shadow 0.18s ease;
        }

        .home-hero-primary {
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: #f9fafb;
          box-shadow: 0 14px 40px rgba(37, 99, 235, 0.42);
        }

        .home-hero-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 60px rgba(37, 99, 235, 0.6);
        }

        .home-hero-secondary {
          background: rgba(10, 13, 30, 0.85);
          color: #e5e7eb;
        }

        .home-hero-secondary:hover {
          background: rgba(15, 23, 42, 0.95);
        }

        .home-hero-highlight {
          display: flex;
          justify-content: flex-end;
        }

        .home-hero-highlight-inner {
          width: 100%;
          max-width: 360px;
          padding: 18px 18px 20px;
          border-radius: 20px;
          background: radial-gradient(circle at top, #11172a, #050712);
          border: 1px solid rgba(148, 163, 252, 0.4);
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.9);
        }

        .home-highlight-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          opacity: 0.7;
        }

        .home-hero-highlight-inner h2 {
          margin: 10px 0 6px;
          font-size: 18px;
        }

        .home-hero-highlight-inner p {
          font-size: 13px;
          opacity: 0.88;
        }

        .home-highlight-link {
          display: inline-flex;
          margin-top: 10px;
          font-size: 13px;
          text-decoration: none;
          color: #c7d2fe;
        }

        .home-highlight-link:hover {
          text-decoration: underline;
        }

        .home-support {
          display: flex;
          justify-content: center;
          margin-top: 40px;
          padding: 0 16px;
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

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 32px;
          padding: 0 16px;
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

        .site-footer {
          margin-top: auto;
          padding: 14px 16px 0;
          display: flex;
          justify-content: center;
        }

        .site-footer span {
          font-size: 12px;
          opacity: 0.7;
        }

        .site-footer-links {
          display: flex;
          gap: 10px;
          margin-left: 12px;
        }

        .site-footer-link {
          text-decoration: none;
          font-size: 12px;
          opacity: 0.75;
          color: #e5e7eb;
        }

        .site-footer-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .home-hero {
            grid-template-columns: minmax(0, 1fr);
          }

          .home-hero-highlight {
            justify-content: flex-start;
          }
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
            align-items: center;
            text-align: center;
            gap: 4px;
          }

          .site-footer-links {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
}
