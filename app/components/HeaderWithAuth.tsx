// app/components/HeaderWithAuth.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import Script from "next/script";
import SiteHeader from "./SiteHeader";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

export default function HeaderWithAuth() {
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

  // During signup we temporarily hide auth header changes so
  // the user never appears as "logged in" for a split second.
  const [signupVerificationInFlight, setSignupVerificationInFlight] =
    useState(false);

  // ---------- Auth listener (same as home/WWIII) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window");
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

  // ---------- Auth submit ----------
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus(null);
    setAuthLoading(true);

    const modeAtStart = authMode;
    if (modeAtStart === "signup") {
      setSignupVerificationInFlight(true);
    }

    try {
      const w = window as any;
      const auth = w.auth;
      const db = w.db;
      const firebase = w.firebase;
      if (!auth) {
        setAuthError("Authentication is not ready. Try again in a moment.");
        return;
      }

      if (modeAtStart === "signup") {
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

        if (db && firebase?.firestore) {
          await db
            .collection("users")
            .doc(cred.user.uid)
            .set(
              {
                displayName: rawDisplayName,
                displayNameLower,
                email: authEmail.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }

        try {
          await cred.user.sendEmailVerification();
          setAuthStatus(
            "Account created. Check your inbox and junk mail for the verification email before logging in."
          );
        } catch (err: any) {
          console.error("Error sending verification email on signup", err);
          const code = err?.code || "";
          if (code === "auth/too-many-requests") {
            setAuthError(
              "Account created, but we hit a temporary email limit. Wait a bit, then use 'Log in' and we'll try sending the verification again."
            );
          } else {
            setAuthError(
              "Account created, but we couldn’t send a verification email automatically. Try again later or contact the site owner."
            );
          }
        }

        await auth.signOut();
        setAuthPassword("");
      } else {
        const cred = await auth.signInWithEmailAndPassword(
          authEmail,
          authPassword
        );

        await cred.user.reload();

        if (!cred.user.emailVerified) {
          try {
            await cred.user.sendEmailVerification();
            setAuthError(
              "You need to verify your email before logging in. We just sent a verification link to your inbox."
            );
          } catch (err: any) {
            console.error("Error sending verification email on login", err);
            const code = err?.code || "";
            if (code === "auth/too-many-requests") {
              setAuthError(
                "You need to verify your email before logging in, and we’ve temporarily hit an email limit. Wait a bit and try again."
              );
            } else {
              setAuthError(
                "You need to verify your email before logging in, and we couldn’t send a new verification email automatically."
              );
            }
          }

          await auth.signOut();
          return;
        }

        setAuthStatus("Signed in successfully.");
        setAuthPassword("");
        setShowAuthForm(false);
      }
    } catch (err: any) {
      console.error("Auth error", err);
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
      if (modeAtStart === "signup") {
        setSignupVerificationInFlight(false);
      }
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

  const headerUser = signupVerificationInFlight ? null : currentUser;
  const userLabel =
    headerUser?.displayName || headerUser?.email || "Unknown soldier";

  const stopKeyEvent = (e: any) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Shared Firebase init (same config as home/WWIII) */}
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
        id="firebase-init-shared"
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

      {/* Actual header – same props as home page */}
      <SiteHeader
        authReady={authReady}
        user={headerUser}
        userLabel={userLabel}
        onOpenAuth={() => {
          setShowAuthForm(true);
          setAuthMode("signup");
          setAuthError(null);
          setAuthStatus(null);
        }}
        onSignOut={handleSignOut}
      />

      {/* Auth modal */}
      {authReady && showAuthForm && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <div>
                <div className="auth-modal-title">Save your runs</div>
                <div className="auth-modal-subtitle">
                  Log in or sign up to appear on the leaderboard. New accounts
                  need to verify their email first.
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

      {/* Global styles for header buttons + modal (copied from home) */}
      <style jsx global>{`
        .account-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s,
            color 0.15s;
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
        }
      `}</style>
    </>
  );
}
