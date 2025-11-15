// app/components/CookieConsent.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "asianthejason-cookie-consent";

type ConsentValue = "accepted" | "declined";

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<ConsentValue | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as ConsentValue | null;
      if (stored === "accepted" || stored === "declined") {
        setDecision(stored);
        setOpen(false);
      } else {
        setOpen(true);
      }
    } catch {
      // If localStorage is blocked, just show the banner
      setOpen(true);
    }
  }, []);

  const handleChoice = (value: ConsentValue) => {
    setDecision(value);
    setOpen(false);

    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }

    // 🔌 If you later wire consent into Google Analytics / other scripts,
    // you can fire custom events or call window.gtag etc. here based on `value`.
  };

  if (!open || decision) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <h3>Cookies & tracking</h3>
          <p>
            This site uses cookies and similar tech for things like game stats, basic analytics,
            and ads. By clicking{" "}
            <strong>Accept</strong>, you agree to this. You can also hit{" "}
            <strong>Decline</strong> and keep playing — no hard feelings.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="cookie-btn secondary"
            onClick={() => handleChoice("declined")}
          >
            Decline
          </button>
          <button
            type="button"
            className="cookie-btn primary"
            onClick={() => handleChoice("accepted")}
          >
            Accept
          </button>
        </div>
      </div>

      <style jsx>{`
        .cookie-banner {
          position: fixed;
          inset-inline: 0;
          bottom: 0;
          z-index: 9998;
          display: flex;
          justify-content: center;
          padding: 12px 16px;
          pointer-events: none;
        }

        .cookie-banner-inner {
          pointer-events: auto;
          max-width: 900px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: radial-gradient(circle at top left, #111827, #020617);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.8);
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .cookie-banner-text h3 {
          margin: 0 0 4px;
          font-size: 14px;
        }

        .cookie-banner-text p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .cookie-banner-actions {
          display: flex;
          flex-shrink: 0;
          gap: 8px;
        }

        .cookie-btn {
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          color: #f9fafb;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }

        .cookie-btn.primary {
          border-color: #ff834a;
          background: linear-gradient(135deg, #ff784a, #ffb347);
          color: #111827;
          font-weight: 600;
        }

        .cookie-btn.secondary {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(15, 23, 42, 0.9);
        }

        .cookie-btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.06);
        }

        .cookie-btn.primary:hover {
          filter: brightness(1.05);
          background: linear-gradient(135deg, #ff8653, #ffc35a);
        }

        @media (max-width: 640px) {
          .cookie-banner-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .cookie-banner-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
