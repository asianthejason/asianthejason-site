// app/lf2/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

type TabKey = "instructions" | "about";

export default function LF2Page() {
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");

  // For this page we keep auth simple – header always shows as signed out.
  const authReady = true;
  const headerUser = null;
  const userLabel = null as any;

  const currentYear = new Date().getFullYear();

  return (
    <>
      <main className="site">
        {/* Shared header component */}
        <SiteHeader
          authReady={authReady}
          user={headerUser}
          userLabel={userLabel}
          onOpenAuth={() => {
            // Send people back home to sign in if needed
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }}
          onSignOut={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }}
        />

        {/* Game */}
        <section className="game-section">
          <div className="game-shell">
            <div className="game-container">
              <iframe
                src="/lf2/F.LF/game/game.html"
                className="lf2-iframe"
                title="Little Fighter 2 – Project F"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* Game title under game, above tabs */}
        <section className="game-title-section">
          <div className="game-title-shell">
            <h1 className="game-title">Little Fighter 2 – Project F</h1>
          </div>
        </section>

        {/* Tabs (instructions / about) */}
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
                  (activeTab === "about" ? " tab-button-active" : "")
                }
                onClick={() => setActiveTab("about")}
              >
                About / Notes
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

              {activeTab === "about" && (
                <div className="updates">
                  <h2>About this Version</h2>
                  <p>
                    This page embeds the open-source{" "}
                    <strong>Project F</strong> web engine for Little Fighter 2.
                    Everything runs in your browser &mdash; no install needed.
                  </p>
                  <p>
                    A few tips for the best experience:
                  </p>
                  <ul>
                    <li>Use a desktop browser (Chrome / Edge / Firefox).</li>
                    <li>Close heavy background tabs if performance feels slow.</li>
                    <li>
                      If your keyboard struggles with multiple keys at once,
                      plug in a gamepad and configure it in-game.
                    </li>
                  </ul>
                  <p>
                    Online multiplayer / lobbies aren&apos;t wired up on this
                    page yet, but local multiplayer and co-op modes should work
                    just like the original game.
                  </p>
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

      {/* Styles cloned from WWIII page for consistent look */}
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
        .updates h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .instructions p,
        .updates p {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .instructions ul,
        .updates ul {
          margin: 0 0 12px;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
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

        @media (max-width: 700px) {
          .tab-panel {
            padding: 14px 14px 16px;
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
