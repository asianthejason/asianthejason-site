// app/about/page.tsx
"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="site">
      {/* Header nav */}
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-title">ASIANTHEJASON</div>
          <div className="site-header-spacer" />
          <nav className="site-header-nav">
            <Link href="/" className="site-header-link">
              Game
            </Link>
            <Link href="/about" className="site-header-link site-header-link-active">
              About
            </Link>
            <Link href="/privacy-policy" className="site-header-link">
              Privacy
            </Link>
            <Link href="/terms" className="site-header-link">
              Terms
            </Link>
            <Link href="/contact" className="site-header-link">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* About content */}
      <section className="panel-section">
        <div className="tabs-shell about-shell">
          <div className="about-header">
            <span className="about-pill">About</span>
            <h1>Hi, I&apos;m Jason — a.k.a. AsiantheJason 👋</h1>
            <p>
              I&apos;m a teacher, game dev, and professional button-masher. Online I go by{" "}
              <strong>AsiantheJason</strong>, and yes, I&apos;m the one to blame for{" "}
              <strong>WWIII — Endless Defense</strong> and <strong>Animated Escape</strong>.
            </p>
          </div>

          <div className="about-grid">
            <article className="about-card">
              <h2>What I do</h2>
              <p>
                I build games and tools that mix problem-solving, strategy, and just enough chaos
                to keep things fun. By day I teach math, computer science, and robotics; by night
                I&apos;m usually tweaking spawn rates and wondering if that boss is still too easy.
              </p>
              <p>
                My goal: games that feel good to play, backed by real engineering and a lot of
                late-night debugging.
              </p>
            </article>

            <article className="about-card">
              <h2>About WWIII — Endless Defense</h2>
              <p>
                <strong>WWIII — Endless Defense</strong> started as a “weekend” project and then
                decided to become a full web experience: online leaderboard, reviews, stats, and
                the occasional &quot;why did I die there&quot; moment.
              </p>
              <p>
                You move with <strong>WASD</strong>, you shoot stuff, you try not to panic, and
                somewhere in the middle you realize you&apos;re min-maxing ammo like it&apos;s a
                math contest.
              </p>
            </article>

            <article className="about-card">
              <h2>Animated Escape &amp; other experiments</h2>
              <p>
                I&apos;m also the creator of <strong>Animated Escape</strong>, another little
                passion project that plays with animation, timing, and “just one more run” energy.
              </p>
              <p>
                I like using games as a sandbox for ideas: physics, AI, level design, and sneaking
                in more math than most people realize. If it makes you think <em>and</em> laugh a
                little, I&apos;m happy.
              </p>
            </article>

            <article className="about-card about-card-fun">
              <h2>Fun facts (questionable importance)</h2>
              <ul>
                <li>Yes, I do read the leaderboard like sports stats.</li>
                <li>Keyboard shortcuts are my cardio. My WASD fingers are absolutely jacked.</li>
                <li>
                  If you find a bug, it&apos;s a “feature in beta.” If you find two, congratulations,
                  you&apos;re now part of QA.
                </li>
              </ul>
            </article>
          </div>

          <div className="about-cta">
            <div>
              <h3>Want to keep playing?</h3>
              <p>
                Hit the game, climb the <strong>Leaderboard</strong>, or drop your thoughts in a{" "}
                <strong>Review</strong>. I actually read them. Probably with snacks.
              </p>
            </div>
            <div className="about-cta-buttons">
              <Link href="/" className="account-btn primary">
                Back to Game
              </Link>
              <Link href="/contact" className="account-btn subtle">
                Say hi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer nav */}
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} AsiantheJason</span>
        <span>Leaderboard powered by Firebase</span>
        <nav className="site-footer-links">
          <Link href="/" className="site-footer-link">
            Game
          </Link>
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

      {/* Page-specific styling */}
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
        }

        .site-header-inner {
          max-width: 1100px;
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

        .site-header-nav {
          display: flex;
          gap: 10px;
          font-size: 13px;
        }

        .site-header-link {
          text-decoration: none;
          color: #cbd5f5;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid transparent;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }

        .site-header-link:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .site-header-link-active {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 24px;
          padding: 0 16px;
        }

        .tabs-shell {
          width: 100%;
          max-width: 900px;
          background: rgba(9, 12, 25, 0.96);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
          padding: 22px 22px 20px;
        }

        .about-shell {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .about-header h1 {
          margin: 6px 0 8px;
          font-size: 24px;
        }

        .about-header p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .about-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          opacity: 0.85;
        }

        .about-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .about-card {
          padding: 14px 14px 12px;
          border-radius: 16px;
          background: radial-gradient(circle at top left, #151a31, #060817);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          line-height: 1.6;
        }

        .about-card h2 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .about-card p {
          margin: 0 0 8px;
          opacity: 0.9;
        }

        .about-card-fun ul {
          margin: 4px 0 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.92;
        }

        .about-cta {
          margin-top: 4px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          background: rgba(6, 10, 26, 0.95);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
        }

        .about-cta h3 {
          margin: 0 0 4px;
          font-size: 15px;
        }

        .about-cta p {
          margin: 0;
          opacity: 0.9;
        }

        .about-cta-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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

        .account-btn:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .account-btn.primary:hover {
          filter: brightness(1.05);
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

        @media (max-width: 800px) {
          .about-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .site-header-inner {
            flex-wrap: wrap;
          }

          .site-header-nav {
            justify-content: flex-start;
            flex-wrap: wrap;
          }

          .site-footer {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
