"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

type TabKey = "instructions" | "about";

export default function LF2Page() {
  const [activeTab, setActiveTab] = useState<TabKey>("instructions");
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0b1020_0,_#02040a_60%)] text-slate-100 flex flex-col py-4">
      {/* Header – we reuse the same component, but keep auth simple:
          clicking "Sign in / Sign up" just sends people back home. */}
      <SiteHeader
        authReady={true}
        user={null}
        userLabel={null}
        onOpenAuth={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
        onSignOut={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
      />

      <main className="flex-1 flex flex-col items-center gap-6 px-4">
        {/* Intro / hero card */}
        <section className="w-full max-w-5xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.25em] text-orange-300/80 uppercase">
                  Game
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
                  Little Fighter 2 — Project F
                </h1>
                <p className="mt-2 text-sm text-slate-300/90 max-w-xl">
                  A browser port of the classic beat&apos;em up. Pick your
                  fighter, brawl through stages, and relive the chaos —
                  straight in your browser.
                </p>
              </div>

              <div className="mt-3 sm:mt-0 flex flex-col items-start sm:items-end gap-2 text-xs text-slate-300/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium tracking-wide uppercase">
                    Live
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Best played on keyboard or gamepad in fullscreen.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Game embed */}
        <section className="w-full max-w-5xl">
          <div className="rounded-3xl border border-white/12 bg-black/40 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="relative w-full aspect-[16/9]">
              <iframe
                src="/lf2/F.LF/game/game.html"
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            If the game doesn&apos;t fit well, try opening it{" "}
            <a
              href="/lf2/F.LF/game/game.html"
              target="_blank"
              rel="noreferrer"
              className="text-orange-300 hover:text-orange-200 underline-offset-2 hover:underline"
            >
              in a new tab
            </a>{" "}
            or rotating your device.
          </p>
        </section>

        {/* Tabs */}
        <section className="w-full max-w-5xl mb-6">
          <div className="rounded-2xl border border-white/12 bg-slate-950/80 shadow-xl backdrop-blur">
            {/* Tab buttons */}
            <div className="flex border-b border-white/5 px-3 pt-2">
              <button
                className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase rounded-t-2xl transition
                  ${
                    activeTab === "instructions"
                      ? "bg-slate-900 text-white shadow-inner border-b-2 border-b-orange-400"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  }`}
                onClick={() => setActiveTab("instructions")}
              >
                Game Instructions
              </button>
              <button
                className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase rounded-t-2xl transition
                  ${
                    activeTab === "about"
                      ? "bg-slate-900 text-white shadow-inner border-b-2 border-b-orange-400"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  }`}
                onClick={() => setActiveTab("about")}
              >
                About / Notes
              </button>
            </div>

            {/* Tab content */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 text-sm leading-relaxed text-slate-200">
              {activeTab === "instructions" && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    How to Play Little Fighter 2
                  </h2>
                  <p className="text-slate-300">
                    Exact controls can be changed in the in-game settings, but a
                    typical default layout is:
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                        Player 1 (Keyboard default)
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-slate-200/90">
                        <li>Arrow keys – Move</li>
                        <li>Attack / Jump / Defend – see in-game key config</li>
                        <li>Special moves – combine directions + Attack</li>
                        <li>Double-tap a direction to dash</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                        Tips
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-slate-200/90">
                        <li>Jump and dash attacks help control space.</li>
                        <li>Many characters have combos with direction + attack.</li>
                        <li>Team up with friends using multiple players.</li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    You can explore &quot;VS&quot; and &quot;Stage&quot; modes
                    from the game&apos;s main menu.
                  </p>
                </div>
              )}

              {activeTab === "about" && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    About this version
                  </h2>
                  <p className="text-slate-300">
                    This is a browser port of{" "}
                    <span className="font-semibold">Little Fighter 2</span>,
                    powered by the open-source{" "}
                    <span className="font-semibold">Project F</span> engine.
                    It&apos;s running completely client-side — no install
                    needed.
                  </p>
                  <p className="text-slate-300">
                    Performance and input feel can vary a bit depending on your
                    browser. If things feel laggy:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-200/90">
                    <li>Try using a desktop browser (Chrome / Edge / Firefox).</li>
                    <li>Close a few heavy tabs in the background.</li>
                    <li>
                      If your keyboard doesn&apos;t register multiple keys at
                      once, try a gamepad.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 text-xs text-slate-400">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4">
          <span>© {currentYear} AsiantheJason</span>
          <nav className="flex gap-4">
            <Link href="/about" className="hover:text-slate-200">
              About
            </Link>
            <Link href="/privacy-policy" className="hover:text-slate-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-slate-200">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
