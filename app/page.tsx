// app/page.tsx
"use client";

import { useState } from "react";
import Script from "next/script";

type TabKey = "instructions" | "leaderboard" | "review";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");

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

        {/* Tabs beneath game */}
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
                    Sample layout only – this will be wired to the live Firebase
                    leaderboard.
                  </p>
                  <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Player</th>
                          <th>Distance</th>
                          <th>Kills</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1</td>
                          <td>WastelandKing</td>
                          <td>1,245 m</td>
                          <td>312</td>
                          <td>2025-11-10</td>
                        </tr>
                        <tr>
                          <td>2</td>
                          <td>LastSoldier</td>
                          <td>990 m</td>
                          <td>260</td>
                          <td>2025-11-09</td>
                        </tr>
                        <tr>
                          <td>3</td>
                          <td>AsiantheJason</td>
                          <td>865 m</td>
                          <td>204</td>
                          <td>2025-11-08</td>
                        </tr>
                        <tr>
                          <td>4</td>
                          <td>New Recruit</td>
                          <td>540 m</td>
                          <td>120</td>
                          <td>2025-11-07</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="leaderboard-footnote">
                    Once wired, scores will update automatically after each run.
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
                    to <strong>asianthejason</strong> on your platform of choice.
                    A proper feedback form can go here later.
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
