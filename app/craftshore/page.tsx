"use client";

import Link from "next/link";
import HeaderWithAuth from "../components/HeaderWithAuth";

export default function CraftshoreLandingPage() {
  return (
    <main className="craftshore-landing">
      <HeaderWithAuth />
      <section className="craftshore-hero">
        <div className="craftshore-copy">
          <div className="craftshore-kicker"><span /> Pre-alpha world simulation</div>
          <h1>Build a frontier.<br /><span>Shape its story.</span></h1>
          <p>
            Settle a living 2D coast, build farms and mines, train troops, and grow a player-driven economy in a cozy side-scrolling world.
          </p>
          <div className="craftshore-actions">
            <Link href="/craftshore/play" className="craftshore-play">Enter the prototype <span>→</span></Link>
            <Link href="/" className="craftshore-back">Back to portfolio</Link>
          </div>
          <div className="craftshore-meta">
            <div><strong>BUILD</strong><small>Shape your town</small></div>
            <div><strong>GROW</strong><small>Develop skills</small></div>
            <div><strong>TRADE</strong><small>Power an economy</small></div>
          </div>
        </div>
        <div className="craftshore-world" aria-hidden="true">
          <div className="craftshore-sun" />
          <div className="mountain mountain-back" />
          <div className="mountain mountain-front" />
          <div className="shore-line" />
          <div className="world-card"><span>WORLD STATUS</span><strong>Frontier online</strong><small>Prototype environment</small></div>
        </div>
      </section>

      <style jsx>{`
        .craftshore-landing { min-height: 100vh; overflow: hidden; color: #f8fafc; }
        .craftshore-hero { width: min(1200px, calc(100% - 48px)); min-height: calc(100vh - 110px); margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 70px; padding: 50px 0 90px; }
        .craftshore-kicker { display: flex; align-items: center; gap: 10px; color: #a7f3d0; font: 700 11px/1 var(--font-geist-mono), monospace; letter-spacing: .13em; text-transform: uppercase; }
        .craftshore-kicker span { width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 20px #34d399; animation: aj-pulse 2.3s ease-in-out infinite; }
        h1 { margin: 24px 0 0; font-size: clamp(54px, 7vw, 92px); line-height: .92; letter-spacing: -.065em; }
        h1 span { color: transparent; background: linear-gradient(100deg, #6ee7b7, #67e8f9); background-clip: text; }
        p { max-width: 620px; margin: 28px 0 0; color: #94a3b8; font-size: 18px; line-height: 1.7; }
        .craftshore-actions { display: flex; flex-wrap: wrap; gap: 11px; margin-top: 32px; }
        .craftshore-play, .craftshore-back { min-height: 50px; padding: 0 18px; display: inline-flex; align-items: center; gap: 18px; border-radius: 14px; text-decoration: none; font-size: 13px; font-weight: 700; transition: transform 180ms ease; }
        .craftshore-play { color: #03110c; background: linear-gradient(135deg, #6ee7b7, #a7f3d0); box-shadow: 0 16px 40px rgba(52,211,153,.2); }
        .craftshore-back { border: 1px solid rgba(148,163,184,.2); color: #cbd5e1; background: rgba(15,23,42,.5); }
        .craftshore-play:hover, .craftshore-back:hover { transform: translateY(-3px); }
        .craftshore-meta { display: flex; gap: 42px; margin-top: 52px; padding-top: 24px; border-top: 1px solid rgba(148,163,184,.13); }
        .craftshore-meta div { display: grid; gap: 5px; } .craftshore-meta strong { color: #d1fae5; font: 700 11px/1 var(--font-geist-mono), monospace; letter-spacing: .15em; } .craftshore-meta small { color: #64748b; }
        .craftshore-world { position: relative; min-height: 540px; overflow: hidden; border: 1px solid rgba(110,231,183,.2); border-radius: 44px; background: linear-gradient(#10243b 0 48%, #142b2b 48% 67%, #0c2021 67%); box-shadow: 0 40px 100px rgba(0,0,0,.4), inset 0 1px rgba(255,255,255,.08); }
        .craftshore-world::after { content: ""; position: absolute; inset: 0; background: linear-gradient(120deg, transparent, rgba(103,232,249,.06), transparent 60%); }
        .craftshore-sun { position: absolute; width: 86px; height: 86px; top: 74px; right: 80px; border-radius: 50%; background: #fde68a; box-shadow: 0 0 70px rgba(253,230,138,.4); animation: aj-float 6s ease-in-out infinite; }
        .mountain { position: absolute; left: -10%; bottom: 33%; width: 75%; aspect-ratio: 1; transform: rotate(45deg); border-radius: 20px; }
        .mountain-back { left: 48%; bottom: 24%; background: #284754; opacity: .7; }
        .mountain-front { background: #1b3b3b; box-shadow: inset 30px 30px rgba(110,231,183,.05); }
        .shore-line { position: absolute; left: -5%; right: -5%; bottom: 18%; height: 120px; border-radius: 50%; border-top: 3px solid rgba(103,232,249,.5); background: linear-gradient(rgba(8,145,178,.25), rgba(3,7,17,.65)); }
        .world-card { position: absolute; z-index: 2; right: 26px; bottom: 25px; width: 210px; padding: 17px; display: grid; gap: 6px; border: 1px solid rgba(167,243,208,.25); border-radius: 17px; background: rgba(4,12,19,.76); backdrop-filter: blur(14px); }
        .world-card span { color: #6ee7b7; font: 700 9px/1 var(--font-geist-mono), monospace; letter-spacing: .15em; } .world-card strong { font-size: 15px; } .world-card small { color: #64748b; }
        @media(max-width: 850px) { .craftshore-hero { grid-template-columns: 1fr; } .craftshore-world { min-height: 420px; } }
        @media(max-width: 600px) { .craftshore-hero { width: calc(100% - 30px); padding-top: 35px; gap: 45px; } h1 { font-size: 54px; } .craftshore-meta { gap: 20px; overflow-x: auto; } .craftshore-world { min-height: 350px; border-radius: 28px; } }
      `}</style>
    </main>
  );
}
