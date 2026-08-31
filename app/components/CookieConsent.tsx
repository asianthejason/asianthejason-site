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
    const timer = window.setTimeout(() => {
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
    }, 0);
    return () => window.clearTimeout(timer);
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
          padding: 16px;
          pointer-events: none;
        }

        .cookie-banner-inner {
          pointer-events: auto;
          max-width: 820px;
          width: 100%;
          border-radius: 20px;
          border: 1px solid rgba(103, 232, 249, 0.2);
          background: rgba(6, 12, 24, 0.92);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(22px) saturate(140%);
          padding: 16px 18px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .cookie-banner-text h3 {
          margin: 0 0 4px;
          color: #f8fafc;
          font-size: 13px;
        }

        .cookie-banner-text p {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .cookie-banner-actions {
          display: flex;
          flex-shrink: 0;
          gap: 8px;
        }

        .cookie-btn {
          min-height: 38px;
          border-radius: 11px;
          padding: 0 13px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          color: #f9fafb;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }

        .cookie-btn.primary {
          border-color: #67e8f9;
          background: linear-gradient(135deg, #67e8f9, #a5f3fc);
          color: #041014;
          font-weight: 600;
        }

        .cookie-btn.secondary {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(15, 23, 42, 0.72);
        }

        .cookie-btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.06);
        }

        .cookie-btn.primary:hover {
          filter: brightness(1.05);
          background: linear-gradient(135deg, #a5f3fc, #c4b5fd);
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
