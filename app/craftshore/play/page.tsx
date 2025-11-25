// app/craftshore/play/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import CraftshorePhaserGame from "../components/CraftshorePhaserGame";

type TownState = {
  townName: string;
  playerName: string;
  resources: {
    wood: number;
    stone: number;
    ore: number;
    food: number;
    gold: number;
  };
  buildings: { id: string; type: string; gridX: number }[];
  grid: {
    tileSize: number;
    widthInTiles: number;
    groundY: number;
  };
};

export default function CraftshorePlayPage() {
  const [state, setState] = useState<TownState | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const res = await fetch("/api/craftshore/state");
        const json = (await res.json()) as TownState;
        if (!cancelled) {
          setState(json);
        }
      } catch (err) {
        console.error("Failed to load Craftshore state:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stable mining handler so the Phaser game doesn't reset on E
  const handleMine = useCallback(() => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            resources: {
              ...prev.resources,
              ore: prev.resources.ore + 1,
            },
          }
        : prev
    );
  }, [setState]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Craftshore <span className="text-xs text-slate-400">pre-alpha</span>
          </h1>
          {state && (
            <p className="text-xs text-slate-400">
              Town: <span className="font-semibold">{state.townName}</span> ·
              Pioneer: <span className="font-semibold">{state.playerName}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 text-xs">
          <a
            href="/craftshore"
            className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800"
          >
            Overview
          </a>
          <a
            href="/"
            className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800"
          >
            Home
          </a>
        </div>
      </header>

      {/* HUD */}
      <section className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
        {loading && <div className="text-sm text-slate-400">Loading town…</div>}
        {state && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Wood: <span className="font-semibold">{state.resources.wood}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Stone:{" "}
              <span className="font-semibold">{state.resources.stone}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Ore: <span className="font-semibold">{state.resources.ore}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              Food: <span className="font-semibold">{state.resources.food}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Gold: <span className="font-semibold">{state.resources.gold}</span>
            </div>
          </div>
        )}
      </section>

      {/* Game canvas */}
      <section className="flex-1 flex items-center justify-center p-4">
        {state ? (
          <CraftshorePhaserGame
            gridWidthInTiles={state.grid.widthInTiles}
            tileSize={state.grid.tileSize}
            groundY={state.grid.groundY}
            buildings={state.buildings}
            onMine={handleMine}
          />
        ) : (
          !loading && (
            <div className="text-sm text-red-400">
              Failed to load town state. Check console for errors.
            </div>
          )
        )}
      </section>
    </main>
  );
}
