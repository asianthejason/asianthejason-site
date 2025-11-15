// app/page.tsx
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

            // Avoid double-init in dev
            if (!window.firebase.apps || !window.firebase.apps.length) {
              window.firebase.initializeApp(firebaseConfig);
            }
            window.db = window.firebase.firestore();
          `,
        }}
      />
      {/* Your actual Phaser game logic */}
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
    </>
  );
}
