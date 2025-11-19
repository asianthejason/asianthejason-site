// app/privacy-policy/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

export default function PrivacyPolicyPage() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  // ---------- Auth listener ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window (privacy page)");
      return;
    }

    const unsub = auth.onAuthStateChanged((user: any) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  const userLabel =
    currentUser?.displayName || currentUser?.email || "Unknown soldier";

  const stopKeyEvent = (e: any) => {
    e.stopPropagation();
  };

  // ---------- Auth actions ----------
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus(null);
    setAuthLoading(true);

    try {
      const w = (window as any) || {};
      const auth = w.auth;
      const db = w.db;
      if (!auth) {
        setAuthError("Authentication is not ready. Try again in a moment.");
        return;
      }

      if (authMode === "signup") {
        const rawDisplayName = authDisplayName.trim();
        if (!rawDisplayName) {
          setAuthError("Please enter a display name.");
          return;
        }
        const displayNameLower = rawDisplayName.toLowerCase();

        const cred = await auth.createUserWithEmailAndPassword(
          authEmail,
          authPassword
        );
        await cred.user.updateProfile({
          displayName: rawDisplayName,
        });

        if (db && w.firebase?.firestore) {
          await db
            .collection("users")
            .doc(cred.user.uid)
            .set(
              {
                displayName: rawDisplayName,
                displayNameLower,
                email: authEmail.trim(),
                createdAt: w.firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }

        setAuthStatus("Account created. You are now signed in.");
        setAuthPassword("");
        setShowAuthForm(false);
      } else {
        const cred = await auth.signInWithEmailAndPassword(
          authEmail,
          authPassword
        );
        if (cred.user) {
          setAuthStatus("Signed in successfully.");
        }
        setAuthPassword("");
        setShowAuthForm(false);
      }
    } catch (err: any) {
      console.error("Auth error (privacy page)", err);
      const code = err?.code || "";
      let msg =
        err?.message || "Something went wrong. Please check your details.";
      if (code === "auth/email-already-in-use") {
        msg = "That email is already in use. Try logging in instead.";
      } else if (code === "auth/invalid-email") {
        msg = "That email address doesn’t look valid.";
      } else if (code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (code === "permission-denied") {
        msg =
          "We couldn't finish creating your account because of a permissions issue. Please try again or contact the site owner.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const w = window as any;
      const auth = w.auth;
      if (!auth) return;
      await auth.signOut();
      setAuthStatus("Signed out.");
      setShowAuthForm(false);
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  return (
    <>
      {/* Firebase init (shared config) */}
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        id="firebase-init-privacy"
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

          if (!window.firebase?.apps?.length) {
            window.firebase.initializeApp(firebaseConfig);
          }
          window.db = window.firebase.firestore();
          window.auth = window.firebase.auth();
        `,
        }}
      />

      <main className="site">
        {/* Shared header nav */}
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

        {/* Content */}
        <section className="panel-section">
          <div className="tabs-shell policy-shell">
            <header className="policy-header">
              <span className="policy-pill">Privacy Policy</span>
              <h1>How AsiantheJason handles your data</h1>
              <p className="policy-updated">Last updated: 2025</p>
              <p>
                This Privacy Policy explains how <strong>AsiantheJason</strong>{" "}
                (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects,
                uses, and protects information when you use this website and
                play <strong>WWIII — Endless Defense</strong> and related
                features like leaderboards and reviews.
              </p>
            </header>

            <div className="policy-grid">
              <article className="policy-card">
                <h2>Information we collect</h2>
                <ul>
                  <li>
                    <strong>Account information:</strong> When you sign up, we
                    collect your email address and a display name you choose.
                  </li>
                  <li>
                    <strong>Gameplay data:</strong> Distance travelled, enemies
                    killed, shots fired, ratings, and review text. This is
                    linked to your account ID so we can display stats and
                    leaderboards.
                  </li>
                  <li>
                    <strong>Log &amp; usage data:</strong> Like most sites, we
                    may collect technical data such as IP address, browser type,
                    and pages visited for security and basic analytics.
                  </li>
                </ul>
              </article>

              <article className="policy-card">
                <h2>How we use your information</h2>
                <ul>
                  <li>To run the game, leaderboards, and review features.</li>
                  <li>To keep the site secure and prevent abuse.</li>
                  <li>
                    To communicate with you about your account if needed (for
                    example, password resets or important updates).
                  </li>
                  <li>
                    To analyse anonymised usage so we can improve gameplay and
                    site experience without turning it into a surveillance
                    horror game.
                  </li>
                </ul>
              </article>

              <article className="policy-card">
                <h2>Cookies &amp; advertising</h2>
                <p>
                  This site uses cookies and similar technologies to keep you
                  signed in, remember your preferences, and improve gameplay and
                  site performance.
                </p>
                <p>
                  We also use third-party vendors, including{" "}
                  <strong>Google</strong>, to show advertisements on this site.
                  These vendors may use cookies to serve ads based on your
                  visits to this and other websites.
                </p>
                <p>
                  Google&apos;s use of advertising cookies enables it and its
                  partners to serve ads based on your visit to this site and/or
                  other sites on the Internet. You can learn more about how
                  Google uses data and how to control ad personalisation in your{" "}
                  <a
                    href="https://policies.google.com/technologies/ads"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Ads settings
                  </a>
                  .
                </p>
              </article>

              <article className="policy-card">
                <h2>Data sharing</h2>
                <ul>
                  <li>
                    We <strong>do not sell</strong> your personal information.
                  </li>
                  <li>
                    We may share limited data with trusted service providers who
                    help us host the site, store data, or show ads (for example,
                    Firebase and Google AdSense). They can only use your data to
                    provide services to us.
                  </li>
                  <li>
                    We may share information if required by law, or to protect
                    our rights, players, or the security of the site.
                  </li>
                </ul>
              </article>

              <article className="policy-card">
                <h2>Data retention</h2>
                <ul>
                  <li>
                    We keep account, leaderboard, and review data for as long as
                    your account exists or as long as needed to operate the
                    site.
                  </li>
                  <li>
                    If you request account deletion, we will remove or anonymise
                    personal data where reasonably possible, except where we
                    must keep certain information for legal or security reasons.
                  </li>
                </ul>
              </article>

              <article className="policy-card">
                <h2>Your choices</h2>
                <ul>
                  <li>
                    You can update your display name and some account details on
                    your <Link href="/profile">profile page</Link>.
                  </li>
                  <li>
                    You can choose not to create an account; you&apos;ll still
                    be able to play, just without saving runs to the
                    leaderboard.
                  </li>
                  <li>
                    You can control cookies and ad personalisation through your
                    browser settings and your Google account settings.
                  </li>
                  <li>
                    If you have questions or want to request data deletion, you
                    can <Link href="/contact">contact me</Link>. I&apos;m one
                    human, not a call centre.
                  </li>
                </ul>
              </article>
            </div>

            <div className="policy-cta">
              <div>
                <h3>Questions about privacy?</h3>
                <p>
                  If something here isn&apos;t clear, or you&apos;re just
                  curious what data a math teacher / game dev actually keeps,{" "}
                  <Link href="/contact">send me a message</Link>. I&apos;ll do
                  my best to answer without replying in legalese.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer nav */}
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
                <div className="auth-modal-title">Sign in to your account</div>
                <div className="auth-modal-subtitle">
                  Same account for the game, reviews, and future experiments
                  that may or may not involve more explosions.
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
                    placeholder="e.g. PrivacyPal"
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

        /* Shared header styles (match other pages) */
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

        .site-title-link {
          text-decoration: none;
          color: inherit;
        }

        .site-header-account {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          font-size: 13px;
        }

        .site-header-account-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .site-header-account-bottom {
          font-size: 12px;
          opacity: 0.9;
          text-align: right;
        }

        .site-header-text {
          opacity: 0.9;
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

        .policy-shell {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .policy-header h1 {
          margin: 6px 0 4px;
          font-size: 24px;
        }

        .policy-header p {
          margin: 4px 0;
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .policy-pill {
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

        .policy-updated {
          font-size: 12px;
          opacity: 0.75;
        }

        .policy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .policy-card {
          padding: 14px 14px 12px;
          border-radius: 16px;
          background: radial-gradient(circle at top left, #151a31, #060817);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          line-height: 1.6;
        }

        .policy-card h2 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .policy-card p {
          margin: 0 0 8px;
          opacity: 0.9;
        }

        .policy-card ul {
          margin: 4px 0 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.92;
        }

        .policy-card a {
          color: #93c5fd;
          text-decoration: underline;
        }

        .policy-cta {
          margin-top: 4px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          background: rgba(6, 10, 26, 0.95);
          font-size: 14px;
        }

        .policy-cta h3 {
          margin: 0 0 4px;
          font-size: 15px;
        }

        .policy-cta p {
          margin: 0;
          opacity: 0.9;
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

        @media (max-width: 800px) {
          .policy-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .site-header-inner {
            flex-wrap: wrap;
            row-gap: 8px;
          }

          .site-header-account {
            align-items: flex-start;
          }

          .site-header-account-bottom {
            text-align: left;
          }

          .site-footer {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
