"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SiteHeaderUser { displayName: string | null; email: string | null; }
interface SiteHeaderProps {
  authReady: boolean;
  user: SiteHeaderUser | null;
  userLabel?: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

const NAV_LINKS = [
  { href: "/#projects", label: "Projects" },
  { href: "/ftc-teams", label: "Robotics" },
  { href: "/power-trader", label: "Energy" },
  { href: "/about", label: "About" },
];

export default function SiteHeader({ authReady, user, userLabel, onOpenAuth, onSignOut }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const label = userLabel ?? user?.displayName ?? user?.email ?? "Account";

  const isActive = (href: string) => href.startsWith("/#")
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="aj-header">
      <div className="aj-header-inner">
        <Link href="/" className="aj-brand" aria-label="AsiantheJason home" onClick={() => setMenuOpen(false)}>
          <span className="aj-brand-mark" aria-hidden="true"><span /></span>
          <span className="aj-brand-copy">
            <strong>ASIANTHEJASON</strong>
            <small>BUILDING USEFUL THINGS</small>
          </span>
        </Link>

        <button
          type="button"
          className={`aj-menu-toggle${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        ><span /><span /></button>

        <div className={`aj-nav-shell${menuOpen ? " is-open" : ""}`}>
          <nav className="aj-primary-nav" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`aj-nav-link${isActive(item.href) ? " is-active" : ""}`}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="aj-header-actions">
            {!authReady && <span className="aj-auth-loading">Connecting…</span>}
            {authReady && user ? (
              <div className="aj-user-menu">
                <Link href="/profile" className="aj-user-chip" title={label} onClick={() => setMenuOpen(false)}>
                  <span className="aj-user-avatar" aria-hidden="true">{label.charAt(0).toUpperCase()}</span>
                  <span className="aj-user-label">{label}</span>
                </Link>
                <button type="button" className="aj-signout" onClick={onSignOut}>Sign out</button>
              </div>
            ) : authReady ? (
              <button type="button" className="aj-signin" onClick={onOpenAuth}>Sign in</button>
            ) : null}
            <Link href="/support" className="aj-support-link" onClick={() => setMenuOpen(false)}>Support <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .aj-header { position: sticky; top: 0; z-index: 9000; padding: 18px 24px 10px; pointer-events: none; }
        .aj-header-inner {
          position: relative; width: min(1240px, 100%); min-height: 64px; margin: 0 auto; padding: 9px 10px 9px 14px;
          display: flex; align-items: center; gap: 24px; border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 20px;
          background: rgba(5, 9, 19, 0.74); box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28), inset 0 1px rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(22px) saturate(140%); pointer-events: auto;
        }
        .aj-brand { display: inline-flex; align-items: center; gap: 11px; color: #f8fafc; text-decoration: none; flex: 0 0 auto; }
        .aj-brand-mark {
          position: relative; width: 38px; height: 38px; display: grid; place-items: center; overflow: hidden;
          border: 1px solid rgba(103, 232, 249, 0.42); border-radius: 12px;
          background: linear-gradient(145deg, rgba(34, 211, 238, 0.18), rgba(139, 92, 246, 0.18)); box-shadow: 0 0 30px rgba(34, 211, 238, 0.12);
        }
        .aj-brand-mark::before, .aj-brand-mark span { content: ""; position: absolute; width: 17px; height: 17px; border: 2px solid #67e8f9; transform: rotate(45deg); }
        .aj-brand-mark span { width: 7px; height: 7px; border-color: #c4b5fd; }
        .aj-brand-copy { display: grid; gap: 2px; }
        .aj-brand-copy strong { font-size: 13px; letter-spacing: 0.19em; line-height: 1; }
        .aj-brand-copy small { color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: 0.16em; }
        .aj-nav-shell { min-width: 0; flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .aj-primary-nav, .aj-header-actions, .aj-user-menu { display: flex; align-items: center; }
        .aj-primary-nav { gap: 2px; } .aj-header-actions { gap: 8px; } .aj-user-menu { gap: 5px; }
        .aj-nav-link {
          position: relative; padding: 10px 12px; border-radius: 10px; color: #94a3b8; text-decoration: none;
          font-size: 12px; font-weight: 600; transition: color 180ms ease, background 180ms ease;
        }
        .aj-nav-link:hover, .aj-nav-link.is-active { color: #f8fafc; background: rgba(148, 163, 184, 0.08); }
        .aj-nav-link.is-active::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 2px; border-radius: 9px; background: linear-gradient(90deg, #22d3ee, #8b5cf6); }
        .aj-signin, .aj-signout, .aj-support-link, .aj-user-chip {
          min-height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 11px;
          text-decoration: none; font: 600 12px/1 var(--font-geist-sans), sans-serif; cursor: pointer;
        }
        .aj-signin, .aj-signout { padding: 0 12px; border: 0; background: transparent; color: #cbd5e1; }
        .aj-signin:hover, .aj-signout:hover { color: #fff; background: rgba(255, 255, 255, 0.06); }
        .aj-support-link { gap: 7px; padding: 0 15px; color: #041014; background: linear-gradient(135deg, #67e8f9, #a5f3fc); box-shadow: 0 8px 24px rgba(34, 211, 238, 0.2); transition: transform 180ms ease, box-shadow 180ms ease; }
        .aj-support-link:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(34, 211, 238, 0.3); }
        .aj-user-chip { max-width: 165px; gap: 8px; padding: 0 10px 0 6px; border: 1px solid rgba(148, 163, 184, 0.16); color: #e2e8f0; background: rgba(15, 23, 42, 0.56); }
        .aj-user-avatar { width: 27px; height: 27px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 8px; color: #cffafe; background: linear-gradient(135deg, #0e7490, #6d28d9); }
        .aj-user-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .aj-auth-loading { color: #64748b; font-size: 11px; } .aj-menu-toggle { display: none; }

        @media (max-width: 880px) {
          .aj-header { padding: 10px 12px 6px; } .aj-header-inner { min-height: 56px; padding: 8px 10px; border-radius: 17px; }
          .aj-brand-copy small { display: none; } .aj-brand-mark { width: 34px; height: 34px; }
          .aj-menu-toggle { width: 40px; height: 40px; margin-left: auto; display: grid; place-content: center; gap: 6px; border: 0; border-radius: 11px; background: rgba(148, 163, 184, 0.08); cursor: pointer; }
          .aj-menu-toggle span { width: 19px; height: 2px; border-radius: 9px; background: #e2e8f0; transition: transform 180ms ease; }
          .aj-menu-toggle.is-open span:first-child { transform: translateY(4px) rotate(45deg); } .aj-menu-toggle.is-open span:last-child { transform: translateY(-4px) rotate(-45deg); }
          .aj-nav-shell {
            position: absolute; top: calc(100% + 8px); left: 0; right: 0; padding: 10px; display: grid; gap: 10px;
            visibility: hidden; opacity: 0; transform: translateY(-8px) scale(0.98); border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 17px; background: rgba(5, 9, 19, 0.97); box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(22px); transition: opacity 180ms ease, transform 180ms ease, visibility 180ms;
          }
          .aj-nav-shell.is-open { visibility: visible; opacity: 1; transform: none; }
          .aj-primary-nav { display: grid; grid-template-columns: 1fr 1fr; } .aj-nav-link { padding: 12px; }
          .aj-header-actions { padding-top: 10px; border-top: 1px solid rgba(148, 163, 184, 0.12); flex-wrap: wrap; }
          .aj-user-menu { flex: 1; } .aj-user-chip { flex: 1; max-width: none; justify-content: flex-start; } .aj-support-link { margin-left: auto; }
        }
        @media (max-width: 460px) { .aj-brand-copy strong { font-size: 11px; letter-spacing: 0.13em; } .aj-signout { padding-inline: 8px; } }
      `}</style>
    </header>
  );
}
