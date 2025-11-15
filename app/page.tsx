"use client";

import Script from "next/script";

export default function HomePage() {
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

            // Initialize Firebase & expose db
            if (!window.firebase.apps || !window.firebase.apps.length) {
              window.firebase.initializeApp(firebaseConfig);
            }
            window.db = window.firebase.firestore();
          `,
        }}
      />

      {/* Your Phaser game logic */}
      <Script src="/WWIII/main.js" strategy="afterInteractive" />

      {/* --- Page UI --- */}
      <main className="game-page">
        <header className="game-header">
          <div className="game-brand">
            <span className="game-logo">A</span>
            <div>
              <div className="game-title">AsiantheJason</div>
              <div className="game-subtitle">WWIII — Endless Defense</div>
            </div>
          </div>

          <div className="header-pill">Built with Phaser + Firebase</div>
        </header>

        <section className="game-content">
          <div className="game-info">
            <h1>Hold the Line.</h1>
            <p>
              Survive as long as you can in a ruined world at war. Upgrade your
              weapons, manage ammo, and push your distance record while the
              enemy never stops advancing.
            </p>

            <div className="game-highlight">
              <h2>How to Play</h2>
              <ul>
                <li>Move / aim with your mouse.</li>
                <li>Click to shoot, reload, and swap weapons in-game.</li>
                <li>Earn cash by surviving and killing enemies.</li>
                <li>Spend money on upgrades between runs.</li>
              </ul>
            </div>

            <div className="game-controls">
              <span className="controls-label">Tip</span>
              <span className="controls-text">
                Best experienced in fullscreen on desktop. Turn your sound on.
              </span>
            </div>
          </div>

          <div className="game-frame">
            {/* Phaser mounts its canvas into this container */}
            <div id="gameContainer" className="game-container" />
          </div>
        </section>

        <footer className="game-footer">
          <span>© {new Date().getFullYear()} AsiantheJason</span>
          <span>Leaderboard powered by Firebase</span>
        </footer>
      </main>

      {/* Page styles (scoped globally) */}
      <style jsx global>{`
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont,
            "SF Pro Text", sans-serif;
          background: radial-gradient(circle at top, #1a1a2e 0, #05070d 55%);
          color: #f5f5f5;
        }

        .game-page {
          min-height: 100vh;
          padding: 24px 20px 32px;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .game-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .game-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .game-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff4b3a, #ff9f4a);
          font-weight: 700;
          font-size: 20px;
        }

        .game-title {
          font-weight: 700;
          font-size: 18px;
        }

        .game-subtitle {
          font-size: 13px;
          opacity: 0.7;
        }

        .header-pill {
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 12px;
          white-space: nowrap;
        }

        .game-content {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
          gap: 28px;
          align-items: center;
        }

        .game-info h1 {
          font-size: 32px;
          margin: 0 0 8px;
        }

        .game-info p {
          margin: 0 0 16px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .game-highlight {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 16px;
        }

        .game-highlight h2 {
          font-size: 16px;
          margin: 0 0 8px;
        }

        .game-highlight ul {
          margin: 0;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.5;
        }

        .game-controls {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          font-size: 12px;
        }

        .controls-label {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          opacity: 0.8;
        }

        .controls-text {
          opacity: 0.9;
        }

        .game-frame {
          display: flex;
          justify-content: center;
        }

        .game-container {
          width: 100%;
          max-width: 720px;
          aspect-ratio: 16 / 9;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.85);
          background: #000;
        }

        .game-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          opacity: 0.7;
        }

        @media (max-width: 900px) {
          .game-content {
            grid-template-columns: 1fr;
          }

          .game-page {
            padding: 16px;
          }

          .game-frame {
            order: -1; /* show game above text on mobile */
          }
        }
      `}</style>
    </>
  );
}
