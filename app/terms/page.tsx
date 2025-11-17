// app/terms/page.tsx
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

export default function TermsPage() {
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
      console.warn("Firebase auth not available on window (terms page)");
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
      const w = window as any;
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
      console.error("Auth error (terms page)", err);
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
        id="firebase-init-terms"
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
        {/* Shared site header component */}
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
          <div className="tabs-shell terms-shell">
            <header className="terms-header">
              <span className="terms-pill">Terms of Use</span>
              <h1>Rules for playing nicely on AsiantheJason.com</h1>
              <p className="terms-updated">Last updated: 2025</p>
              <p>
                These Terms of Use (&quot;Terms&quot;) govern your access to and
                use of <strong>AsiantheJason.com</strong> (the &quot;Site&quot;)
                and games like <strong>WWIII — Endless Defense</strong>{" "}
                (collectively, the &quot;Service&quot;). By using the Site, you
                agree to these Terms. If you don&apos;t agree, please
                don&apos;t use the Service — no hard feelings.
              </p>
            </header>

            <div className="terms-grid">
              <article className="terms-card">
                <h2>1. Who&apos;s who</h2>
                <ul>
                  <li>
                    <strong>&quot;We&quot;, &quot;us&quot;,
                    &quot;our&quot;</strong> means Jason Huang, also known
                    online as <strong>AsiantheJason</strong>.
                  </li>
                  <li>
                    <strong>&quot;You&quot;</strong> means any person using the
                    Site or playing the game, whether you have an account or
                    you&apos;re just dropping in for one very chaotic run.
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>2. Using the site &amp; game</h2>
                <ul>
                  <li>
                    You may use the Service for personal, non-commercial
                    entertainment and general keyboard abuse.
                  </li>
                  <li>
                    Please don&apos;t attempt to break, reverse engineer, or
                    exploit the game, leaderboards, or any part of the Site.
                  </li>
                  <li>
                    Don&apos;t use the Service for anything illegal, harmful, or
                    wildly off-topic (for example: no scams, malware,
                    harassment, or attempts to start an actual world war).
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>3. Accounts &amp; security</h2>
                <ul>
                  <li>
                    To save runs, appear on the leaderboard, or leave reviews,
                    you&apos;ll need an account.
                  </li>
                  <li>
                    You&apos;re responsible for keeping your login details
                    secure. If your little sibling steals your account and tanks
                    your stats, that&apos;s between you and them.
                  </li>
                  <li>
                    We may suspend or remove accounts that violate these Terms
                    or abuse the Service.
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>4. Leaderboards, reviews &amp; content you submit</h2>
                <ul>
                  <li>
                    Your display name, scores, and reviews may be shown publicly
                    on the Site. That&apos;s kind of the point of a leaderboard.
                  </li>
                  <li>
                    Don&apos;t post anything abusive, hateful, spammy, or
                    otherwise gross. I reserve the right to remove content and,
                    if needed, accounts.
                  </li>
                  <li>
                    By submitting content (like reviews), you give us a
                    non-exclusive license to display it on the Site and use it
                    to improve or promote the game.
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>5. Ads &amp; third-party services</h2>
                <ul>
                  <li>
                    The Site may show ads from third-party providers (like
                    Google AdSense). Those services may collect their own data
                    as described in our{" "}
                    <Link href="/privacy-policy">Privacy Policy</Link>.
                  </li>
                  <li>
                    We&apos;re not responsible for the content of third-party
                    sites you visit after clicking an ad. Please don&apos;t
                    blame me if you end up shopping instead of grinding for a
                    new distance record.
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>6. Intellectual property</h2>
                <ul>
                  <li>
                    The game code, art, audio, and site design are owned by
                    Jason Huang (unless otherwise noted). Please don&apos;t
                    copy, redistribute, or repackage them without permission.
                  </li>
                  <li>
                    You may share screenshots, clips, and streams of gameplay.
                    If you do, that&apos;s awesome — just don&apos;t pretend you
                    built the whole thing.
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>7. Disclaimers</h2>
                <ul>
                  <li>
                    The Service is provided &quot;as is&quot; and &quot;as
                    available&quot; without warranties of any kind, express or
                    implied.
                  </li>
                  <li>
                    I try not to ship bugs, but this is software — crashes,
                    balance changes, and occasional weirdness may happen.
                  </li>
                  <li>
                    To the maximum extent allowed by law, we&apos;re not liable
                    for any indirect, incidental, or consequential damages
                    resulting from your use of the Service (including but not
                    limited to lost high scores, missed sleep, or sore WASD
                    fingers).
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>8. Termination</h2>
                <ul>
                  <li>
                    You may stop using the Service at any time. You can also{" "}
                    <Link href="/contact">reach out</Link> if you want your
                    account deleted.
                  </li>
                  <li>
                    We may suspend or terminate access to the Service at any
                    time, particularly if you violate these Terms or abuse the
                    game, other players, or the infrastructure.
                  </li>
                </ul>
              </article>

              <article className="terms-card">
                <h2>9. Changes to these Terms</h2>
                <ul>
                  <li>
                    We may update these Terms from time to time. When we do,
                    we&apos;ll adjust the &quot;Last updated&quot; date at the
                    top.
                  </li>
                  <li>
                    If the changes are significant, we&apos;ll try to give you a
                    heads-up, but in general, continuing to use the Service
                    after changes means you accept the new Terms.
                  </li>
                </ul>
              </article>
            </div>

            <div className="terms-cta">
              <div>
                <h3>Questions about the rules?</h3>
                <p>
                  If anything here is confusing, or you&apos;re wondering how a
                  specific situation fits these Terms,{" "}
                  <Link href="/contact">send me a message</Link>. I&apos;ll
                  respond like a human, not a wall of lawyer text.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer nav (no Game link) */}
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
                  Same account you use for the game and reviews — no extra
                  logins, just more fine-print reading power.
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
                    placeholder="e.g. TermsEnjoyer"
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

        .terms-shell {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .terms-header h1 {
          margin: 6px 0 4px;
          font-size: 24px;
        }

        .terms-header p {
          margin: 4px 0;
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .terms-pill {
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

        .terms-updated {
          font-size: 12px;
          opacity: 0.75;
        }

        .terms-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .terms-card {
          padding: 14px 14px 12px;
          border-radius: 16px;
          background: radial-gradient(circle at top left, #151a31, #060817);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          line-height: 1.6;
        }

        .terms-card h2 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .terms-card p {
          margin: 0 0 8px;
          opacity: 0.9;
        }

        .terms-card ul {
          margin: 4px 0 0;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.92;
        }

        .terms-card a {
          color: #93c5fd;
          text-decoration: underline;
        }

        .terms-cta {
          margin-top: 4px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          background: rgba(6, 10, 26, 0.95);
          font-size: 14px;
        }

        .terms-cta h3 {
          margin: 0 0 4px;
          font-size: 15px;
        }

        .terms-cta p {
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
          .terms-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
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
