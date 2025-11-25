// app/craftshore/page.tsx
"use client";

import Link from "next/link";

export default function CraftshoreLandingPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Craftshore
        </h1>
        <p className="text-slate-300">
          Settle your own 2D frontier, build mines and farms, train troops,
          and grow a player-driven economy in a cozy side-scrolling world.
        </p>

        <p className="text-sm text-slate-400">
          This is a pre-alpha prototype: basic 2D town, player movement,
          and a placeholder town state. We&apos;ll layer in skills,
          buildings, and multiplayer next.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/craftshore/play"
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Play Prototype
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-lg border border-slate-500 hover:bg-slate-800"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
