"use client";

import { useState } from "react";
import { signInWithGoogle } from "../../lib/auth";

export default function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-google-section">
      <button
        type="button"
        className="account-btn auth-google-btn"
        onClick={startGoogleAuth}
        disabled={loading}
      >
        <span aria-hidden="true">G</span>
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <div className="auth-message auth-error">{error}</div>}
      <div className="auth-divider"><span>or use email</span></div>
      <style jsx>{`
        .auth-google-section { display: grid; gap: 10px; margin: 4px 0 12px; }
        .auth-google-btn { width: 100%; gap: 10px; padding: 9px 14px; background: #fff; color: #202124; border-color: #dadce0; font-weight: 600; }
        .auth-google-btn:hover:not(:disabled) { background: #f8f9fa; color: #202124; }
        .auth-divider { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.55); font-size: 11px; }
        .auth-divider::before, .auth-divider::after { content: ""; height: 1px; flex: 1; background: rgba(255,255,255,.14); }
      `}</style>
    </div>
  );
}
