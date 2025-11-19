// app/contact/page.tsx
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

export default function ContactPage() {
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

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactStatus, setContactStatus] = useState<string | null>(null);

  // ---------- Auth listener ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window (contact page)");
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

  // Prefill contact form name/email once when user is known
  useEffect(() => {
    if (!authReady || !currentUser) return;

    setContactName((prev) => prev || currentUser.displayName || "");
    setContactEmail((prev) => prev || currentUser.email || "");
  }, [authReady, currentUser]);

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
      console.error("Auth error (contact page)", err);
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

  // ---------- Contact form submit (Resend via /api/contact) ----------
  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactStatus(null);

    const subject = contactSubject.trim();
    const message = contactMessage.trim();
    const name = contactName.trim();
    const email = contactEmail.trim();

    if (!subject || !message) {
      setContactError("Please add both a subject and a message.");
      return;
    }

    try {
      setContactSubmitting(true);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Anonymous player",
          email: email || null,
          subject,
          message,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse errors – we'll just rely on res.ok
      }

      if (!res.ok || (data && data.ok === false)) {
        const errMsg =
          (data && data.error) ||
          "Could not send your message. Please try again.";
        throw new Error(errMsg);
      }

      setContactStatus(
        "Thanks for reaching out! Your message has been sent to my inbox."
      );
      setContactSubject("");
      setContactMessage("");
      // leave name/email so they don't have to retype
    } catch (err: any) {
      console.error("Error sending contact message", err);
      setContactError(
        err?.message || "Could not send your message. Please try again."
      );
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <>
      {/* Firebase compat scripts (used for auth / user profile, not for contact send) */}
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
        id="firebase-init-contact"
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

        {/* Contact content */}
        <section className="panel-section">
          <div className="tabs-shell contact-shell">
            <header className="contact-header">
              <span className="contact-pill">Contact</span>
              <h1>Say hi, send feedback, or report a bug 🐛</h1>
              <p>
                Whether you found a bug, have an idea for WWIII — Endless
                Defense, or just want to tell me your distance PB, drop a
                message here. I read them personally (usually with coffee).
              </p>
            </header>

            <div className="contact-grid">
              <div className="contact-main-card">
                <h2>Send a message</h2>
                <form className="contact-form" onSubmit={handleContactSubmit}>
                  <div className="contact-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      onKeyDown={stopKeyEvent}
                      onKeyUp={stopKeyEvent}
                      onKeyPress={stopKeyEvent}
                      placeholder="Your name or in-game alias"
                    />
                  </div>

                  <div className="contact-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      onKeyDown={stopKeyEvent}
                      onKeyUp={stopKeyEvent}
                      onKeyPress={stopKeyEvent}
                      placeholder="Where I can reply (optional but helpful)"
                    />
                  </div>

                  <div className="contact-field">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      onKeyDown={stopKeyEvent}
                      onKeyUp={stopKeyEvent}
                      onKeyPress={stopKeyEvent}
                      placeholder="Bug report, feedback, or just 'hi'"
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label>Message</label>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      onKeyDown={stopKeyEvent}
                      onKeyUp={stopKeyEvent}
                      onKeyPress={stopKeyEvent}
                      rows={6}
                      placeholder="Tell me what's up. Details help if you're reporting a bug!"
                      required
                    />
                  </div>

                  {contactError && (
                    <div className="auth-message auth-error">
                      {contactError}
                    </div>
                  )}
                  {contactStatus && (
                    <div className="auth-message auth-status">
                      {contactStatus}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="account-btn primary contact-submit-btn"
                    disabled={contactSubmitting}
                  >
                    {contactSubmitting ? "Sending..." : "Send message"}
                  </button>
                </form>
              </div>

              <aside className="contact-side-card">
                <h2>Helpful details (optional)</h2>
                <ul>
                  <li>
                    What platform &amp; browser you&apos;re on (e.g. Windows +
                    Chrome).
                  </li>
                  <li>
                    If it&apos;s a bug: what you were doing right before things
                    went sideways.
                  </li>
                  <li>
                    If it&apos;s feedback: what you&apos;d love to see next —
                    new weapons, balance tweaks, or extra chaos.
                  </li>
                </ul>
                <p>
                  You can also reach me through any links listed in your{" "}
                  <Link href="/about">About</Link> / profile ecosystem if I add
                  more later.
                </p>
              </aside>
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
                  Same login you use for the game and reviews — no extra
                  accounts, just easier feedback.
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
                    placeholder="e.g. BugHunter9000"
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

        .contact-shell {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .contact-header h1 {
          margin: 6px 0 8px;
          font-size: 24px;
        }

        .contact-header p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .contact-pill {
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

        .contact-grid {
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
          gap: 16px;
        }

        .contact-main-card,
        .contact-side-card {
          padding: 14px 14px 12px;
          border-radius: 16px;
          background: radial-gradient(circle at top left, #151a31, #060817);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          line-height: 1.6;
        }

        .contact-main-card h2,
        .contact-side-card h2 {
          margin: 0 0 8px;
          font-size: 16px;
        }

        .contact-side-card ul {
          margin: 4px 0 8px;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.92;
        }

        .contact-form {
          display: grid;
          gap: 10px;
        }

        .contact-field {
          display: grid;
          gap: 4px;
        }

        .contact-field label {
          font-size: 12px;
          opacity: 0.85;
        }

        .contact-field input,
        .contact-field textarea {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 7px 10px;
          font-size: 13px;
          background: rgba(5, 8, 20, 0.95);
          color: #f5f5f5;
        }

        .contact-field input:focus,
        .contact-field textarea:focus {
          outline: none;
          border-color: #ff834a;
          box-shadow: 0 0 0 1px rgba(255, 131, 74, 0.6);
        }

        .contact-submit-btn {
          margin-top: 4px;
          width: fit-content;
        }

        .contact-side-card a {
          color: #93c5fd;
          text-decoration: underline;
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
          .contact-grid {
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
