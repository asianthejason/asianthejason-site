// components/SiteHeader.tsx
"use client";

import Link from "next/link";

interface SiteHeaderUser {
  displayName: string | null;
  email: string | null;
}

interface SiteHeaderProps {
  authReady: boolean;
  user: SiteHeaderUser | null;
  userLabel?: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export default function SiteHeader({
  authReady,
  user,
  userLabel,
  onOpenAuth,
  onSignOut,
}: SiteHeaderProps) {
  const label =
    userLabel ?? user?.displayName ?? user?.email ?? "Unknown soldier";

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-title">ASIANTHEJASON</div>
          <div className="site-header-spacer" />

          <div className="site-header-account">
            {/* top row: buttons */}
            <div className="site-header-account-top">
              <Link href="/" className="account-btn subtle">
                Home
              </Link>

              {!authReady && (
                <span className="site-header-text">Loading…</span>
              )}

              {authReady && user && (
                <>
                  <Link href="/profile" className="account-btn subtle">
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="account-btn subtle"
                    onClick={onSignOut}
                  >
                    Sign out
                  </button>
                </>
              )}

              {authReady && !user && (
                <button
                  type="button"
                  className="account-btn"
                  onClick={onOpenAuth}
                >
                  Sign in / Sign up
                </button>
              )}

              {/* Always show Donate on the far right */}
              <Link href="/support" className="account-btn primary">
                Donate
              </Link>
            </div>

            {/* second row: "Signed in as ..." */}
            {authReady && user && (
              <div className="site-header-account-bottom">
                Signed in as <strong>{label}</strong>
              </div>
            )}
          </div>
        </div>
      </header>

      <style jsx>{`
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
        }
      `}</style>
    </>
  );
}
