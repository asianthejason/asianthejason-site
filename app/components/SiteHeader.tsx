"use client";

import Image from "next/image";
import Link from "next/link";

interface SiteHeaderUser { displayName: string | null; email: string | null; }
interface SiteHeaderProps {
  authReady: boolean;
  user: SiteHeaderUser | null;
  userLabel?: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export default function SiteHeader({ authReady, user, userLabel, onOpenAuth, onSignOut }: SiteHeaderProps) {
  const label = userLabel ?? user?.displayName ?? user?.email ?? "Account";

  return (
    <header className="aj-header">
      <div className="aj-header-inner">
        <Link href="/" className="aj-brand" aria-label="AsiantheJason home">
          <span className="aj-brand-logo">
            <Image src="/icon.jpg" alt="" fill sizes="42px" priority />
          </span>
          <span className="aj-brand-copy">
            <strong>AsiantheJason</strong>
            <small>CREATE · PLAY · EXPLORE</small>
          </span>
        </Link>

        <div className="aj-header-actions">
          {!authReady && <span className="aj-auth-loading">Connecting…</span>}
          {authReady && user ? (
            <div className="aj-user-menu">
              <Link href="/profile" className="aj-user-chip" title={label}>
                <span className="aj-user-avatar" aria-hidden="true">{label.charAt(0).toUpperCase()}</span>
                <span className="aj-user-label">{label}</span>
              </Link>
              <button type="button" className="aj-signout" onClick={onSignOut}>Sign out</button>
            </div>
          ) : authReady ? (
            <button type="button" className="aj-signin" onClick={onOpenAuth}>Sign in</button>
          ) : null}
          <Link href="/support" className="aj-donate-link">
            Donate <span aria-hidden="true">♥</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .aj-header { position: sticky; top: 0; z-index: 9000; padding: 18px 24px 10px; pointer-events: none; }
        .aj-header-inner {
          width: min(1240px, 100%); min-height: 66px; margin: 0 auto; padding: 10px 11px 10px 12px;
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
          border: 1px solid rgba(148,163,184,.16); border-radius: 20px; background: rgba(5,9,19,.76);
          box-shadow: 0 18px 60px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.04);
          backdrop-filter: blur(22px) saturate(140%); pointer-events: auto;
        }
        .aj-brand { min-width: 0; display: inline-flex; align-items: center; gap: 12px; color: #f8fafc; text-decoration: none; }
        .aj-brand-logo {
          position: relative; width: 43px; height: 43px; flex: 0 0 auto; overflow: hidden;
          border: 1px solid rgba(251,146,60,.45); border-radius: 13px; background: #ffb16e;
          box-shadow: 0 8px 24px rgba(251,146,60,.16);
        }
        .aj-brand-logo :global(img) { object-fit: cover; }
        .aj-brand-copy { min-width: 0; display: grid; gap: 4px; }
        .aj-brand-copy strong { font-size: 15px; letter-spacing: .035em; line-height: 1; }
        .aj-brand-copy small { color: #64748b; font: 700 8px/1 var(--font-geist-mono), monospace; letter-spacing: .17em; }
        .aj-header-actions, .aj-user-menu { display: flex; align-items: center; gap: 7px; }
        .aj-signin, .aj-signout, .aj-donate-link, .aj-user-chip {
          min-height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px;
          text-decoration: none; font: 650 12px/1 var(--font-geist-sans), sans-serif; cursor: pointer;
        }
        .aj-signin, .aj-signout { padding: 0 13px; border: 0; background: transparent; color: #cbd5e1; }
        .aj-signin:hover, .aj-signout:hover { color: #fff; background: rgba(255,255,255,.06); }
        .aj-donate-link {
          gap: 8px; padding: 0 16px; color: #170a03; background: linear-gradient(135deg,#fb923c,#fdba74);
          box-shadow: 0 9px 28px rgba(251,146,60,.22); transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .aj-donate-link:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(251,146,60,.32); }
        .aj-user-chip { max-width: 190px; gap: 8px; padding: 0 11px 0 6px; border: 1px solid rgba(148,163,184,.16); color: #e2e8f0; background: rgba(15,23,42,.56); }
        .aj-user-avatar { width: 29px; height: 29px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 8px; color: #cffafe; background: linear-gradient(135deg,#0e7490,#6d28d9); }
        .aj-user-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .aj-auth-loading { color: #64748b; font-size: 11px; }

        @media(max-width: 620px) {
          .aj-header { padding: 10px 11px 6px; }
          .aj-header-inner { min-height: 58px; padding: 7px 8px; border-radius: 17px; gap: 8px; }
          .aj-brand { gap: 8px; } .aj-brand-logo { width: 38px; height: 38px; border-radius: 11px; }
          .aj-brand-copy strong { font-size: 12px; } .aj-brand-copy small { display: none; }
          .aj-user-label, .aj-signout { display: none; } .aj-user-chip { padding-right: 6px; }
          .aj-donate-link { min-height: 38px; padding: 0 12px; }
        }
        @media(max-width: 390px) { .aj-brand-copy strong { font-size: 11px; } .aj-donate-link span { display: none; } }
      `}</style>
    </header>
  );
}
