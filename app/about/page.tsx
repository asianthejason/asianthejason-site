// app/about/page.tsx
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

export default function AboutPage() {
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
      console.warn("Firebase auth not available on window (about page)");
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

  // helper to stop key events from reaching the game (if background is listening)
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

        // Create auth user (this signs them in)
        const cred = await auth.createUserWithEmailAndPassword(
          authEmail,
          authPassword
        );
        await cred.user.updateProfile({
          displayName: rawDisplayName,
        });

        // Store user profile document
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
      console.error("Auth error (about page)", err);
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
      {/* Firebase (shared with home page) */}
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
        id="firebase-init-about"
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

        {/* About content */}
        <section className="panel-section">
          <div className="tabs-shell about-shell">
            <div className="about-header">
              <span className="about-pill">About</span>
              <h1>Hi, I&apos;m Jason — a.k.a. AsiantheJason 👋</h1>
              <p>
                I&apos;m a teacher, self-taught software dev, and animator. If
                you like what I do here, please share with your friends and
                donate if you can so I don&apos;t have to choose between eating
                or paying for the server.
              </p>
            </div>

            <div className="about-grid">
              <article className="about-card">
                <h2>What I do as a teacher</h2>
                <p>
                  I teach Computer Science and Robotics in Canada at the junior
                  high and high school level. You can find some tools I&apos;ve
                  found helpful in my work on this website. Any other
                  information is non-ya-bees-knees.
                </p>
              </article>

              <article className="about-card">
                <h2>What I do as a dev</h2>
                <p>
                  I work in the AI tech industry full time so in the little bit
                  of free time I have, I like to build games. On this site, you
                  will find some games I&apos;ve developed on my own and feel
                  free to leave a review, tell me what features you would like
                  to see.
                </p>
              </article>

              <article className="about-card">
                <h2>What I do as an animator</h2>
                <p>
                  My animation accounts go by Animated Escape. I make silly
                  skits for fun. Everything I know is self-taught so don&apos;t
                  expect Pixar here.
                </p>
                <div className="about-social-buttons">
                  {/* Update these URLs to your exact handles if needed */}
                  <a
                    href="https://www.instagram.com/animatedescapeofficial"
                    target="_blank"
                    rel="noreferrer"
                    className="account-btn subtle"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://www.tiktok.com/@animatedescape"
                    target="_blank"
                    rel="noreferrer"
                    className="account-btn subtle"
                  >
                    TikTok
                  </a>
                  <a
                    href="https://www.animatedescape.com"
                    target="_blank"
                    rel="noreferrer"
                    className="account-btn subtle"
                  >
                    Website
                  </a>
                </div>
              </article>

              <article className="about-card about-card-fun">
                <h2>Got Feedbacks?</h2>
                <p>shoot me an email in the contact page.</p>
                <Link
                  href="/contact"
                  className="account-btn primary about-contact-btn"
                >
                  Go to contact page
                </Link>
              </article>
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
                <div className="auth-modal-title">Sign in to save your runs</div>
                <div className="auth-modal-subtitle">
                  Use the same account for the game, reviews, and more
                  experiments I probably shouldn&apos;t ship yet.
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
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
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

        .site-header-account {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
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

        .about-social-buttons {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .about-contact-btn {
          margin-top: 8px;
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
          .about-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .site-header-inner {
            flex-wrap: wrap;
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
