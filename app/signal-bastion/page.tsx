"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HeaderWithAuth from "../components/HeaderWithAuth";
import { useAuth } from "../../lib/useAuth";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import "./signal-bastion.css";

type TowerKind = "rail" | "arc" | "cryo" | "miner";
type TargetMode =
  "first" | "last" | "strongest" | "weakest" | "closest" | "unslowed";
type Evolution =
  | "siege"
  | "pierce"
  | "storm"
  | "overload"
  | "deep"
  | "shatter"
  | "recycler"
  | "salvager";
type EnemyKind =
  | "grunt"
  | "runner"
  | "juggernaut"
  | "swarm"
  | "regenerator"
  | "disruptor"
  | "shield"
  | "phase"
  | "boss";
type Pad = { id: number; x: number; y: number };
type Tower = {
  pad: number;
  kind: TowerKind;
  level: number;
  cooldown: number;
  target: TargetMode;
  evolution?: Evolution;
};
type Enemy = {
  id: number;
  kind: EnemyKind;
  progress: number;
  hp: number;
  maxHp: number;
  shield: number;
  speed: number;
  reward: number;
  boss: boolean;
  slow: number;
  phaseClock: number;
  slowFactor?: number;
  hitAt?: number;
};
type Shot = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  color: string;
};
type GamePhase = "ready" | "playing" | "gameover";
type DoctrineId = "longshot" | "relay" | "permafrost" | "deepBore";
type MetaProfile = {
  cores: number;
  research: Record<DoctrineId, number>;
  equipped: DoctrineId | null;
  rewardedRuns: string[];
};
type Snapshot = {
  wave: number;
  lives: number;
  energy: number;
  scrap: number;
  killed: number;
  bosses: number;
  phase: GamePhase;
  pads: Pad[];
  towers: Tower[];
  generatorLevel: number;
  storageLevel: number;
  extractionLevel: number;
  clickLevel: number;
  coreLevel: number;
  shieldLevel: number;
  combo: number;
  heat: number;
  threat: string;
  cooldowns: Record<string, number>;
  nextWaveIn: number;
  coreShield: number;
  maxLives: number;
  threatPending: boolean;
  revival: boolean;
  pulseLevel: number;
  emergencyLevel: number;
  elapsed: number;
  doctrine: DoctrineId | null;
  doctrineLevel: number;
};
type ScoreRow = {
  id: number;
  name: string;
  waves: number;
  enemies_defeated: number;
  bosses_defeated?: number;
  run_seconds?: number;
  modifiers?: string[];
  created_at?: string;
  run_id?: string;
  player_level?: number;
};

const W = 960,
  H = 560;
const PATH = [
  { x: -25, y: 105 },
  { x: 145, y: 105 },
  { x: 145, y: 255 },
  { x: 355, y: 255 },
  { x: 355, y: 90 },
  { x: 575, y: 90 },
  { x: 575, y: 355 },
  { x: 790, y: 355 },
  { x: 790, y: 465 },
  { x: 985, y: 465 },
];
const GENERATOR = { x: 455, y: 450, radius: 38 };
const TOWER_DATA: Record<
  TowerKind,
  {
    name: string;
    cost: number;
    color: string;
    range: number;
    damage: number;
    rate: number;
  }
> = {
  rail: {
    name: "Railgun",
    cost: 90,
    color: "#ffbd5a",
    range: 150,
    damage: 24,
    rate: 1.05,
  },
  arc: {
    name: "Arc Coil",
    cost: 140,
    color: "#6cf4ff",
    range: 125,
    damage: 13,
    rate: 0.62,
  },
  cryo: {
    name: "Cryo Node",
    cost: 120,
    color: "#9d8cff",
    range: 135,
    damage: 8,
    rate: 0.82,
  },
  miner: {
    name: "Scrap Harvester",
    cost: 95,
    color: "#66f2a6",
    range: 0,
    damage: 0,
    rate: 0,
  },
};
const TOWER_MAX_RANGE: Record<Exclude<TowerKind, "miner">, number> = {
  rail: 220,
  arc: 175,
  cryo: 185,
};
const TARGET_HINTS: Record<TargetMode, string> = {
  first: "Enemy closest to the core",
  last: "Enemy farthest from the core",
  strongest: "Enemy with the most health",
  weakest: "Enemy with the least health",
  closest: "Enemy nearest this tower",
  unslowed: "Enemy not already slowed",
};

const DOCTRINES: Record<
  DoctrineId,
  { name: string; tower: TowerKind; effect: string }
> = {
  longshot: {
    name: "Longshot Array",
    tower: "rail",
    effect: "+4% range · 3% slower fire per level",
  },
  relay: {
    name: "Relay Lattice",
    tower: "arc",
    effect: "More chain targets · −3% damage per level",
  },
  permafrost: {
    name: "Permafrost Mix",
    tower: "cryo",
    effect: "+4% slow chance · −4% damage per level",
  },
  deepBore: {
    name: "Deep-Bore Rig",
    tower: "miner",
    effect: "+7% extraction · +6% build cost per level",
  },
};
const EMPTY_META: MetaProfile = {
  cores: 0,
  research: { longshot: 0, relay: 0, permafrost: 0, deepBore: 0 },
  equipped: null,
  rewardedRuns: [],
};
function readMetaProfile(): MetaProfile {
  try {
    const saved = JSON.parse(localStorage.getItem("signalBastionMetaV1") || "{}");
    const legacy = (Object.keys(DOCTRINES) as DoctrineId[]).filter((id) =>
      Array.isArray(saved.unlocked) ? saved.unlocked.includes(id) : false,
    );
    const research = Object.fromEntries(
      (Object.keys(DOCTRINES) as DoctrineId[]).map((id) => [
        id,
        Math.max(0, Math.min(5, Math.floor(Number(saved.research?.[id]) || (legacy.includes(id) ? 5 : 0)))),
      ]),
    ) as Record<DoctrineId, number>;
    return {
      cores: Math.max(0, Math.floor(Number(saved.cores) || 0)),
      research,
      equipped: research[saved.equipped as DoctrineId] > 0 ? saved.equipped : null,
      rewardedRuns: Array.isArray(saved.rewardedRuns)
        ? saved.rewardedRuns.filter((id: unknown) => typeof id === "string").slice(-100)
        : [],
    };
  } catch {
    return { ...EMPTY_META };
  }
}
function writeMetaProfile(profile: MetaProfile) {
  try {
    localStorage.setItem("signalBastionMetaV1", JSON.stringify(profile));
  } catch {}
}
const coreReward = (completedWaves: number, bosses: number) =>
  Math.floor(completedWaves / 5) + bosses * 2;
const playerLevel = (profile: MetaProfile) =>
  Object.values(profile.research).reduce((total, level) => total + level, 0);
const researchCost = (level: number) => level + 1;
const towerCost = (kind: TowerKind, doctrine: DoctrineId | null, doctrineLevel = 0) =>
  Math.ceil(TOWER_DATA[kind].cost * (kind === "miner" && doctrine === "deepBore" ? 1 + doctrineLevel * 0.06 : 1));
const towerRangeCap = (kind: TowerKind) =>
  kind === "miner" ? 0 : TOWER_MAX_RANGE[kind];
const towerRange = (tower: Tower, doctrine: DoctrineId | null, doctrineLevel = 0) =>
  tower.kind === "miner"
    ? 0
    : Math.min(
        towerRangeCap(tower.kind),
        TOWER_DATA[tower.kind].range *
          (1 + (tower.level - 1) * 0.08) *
          (tower.kind === "rail" && doctrine === "longshot" ? 1 + doctrineLevel * 0.04 : 1),
      );

const cryoChance = (level: number) => Math.min(0.75, 0.18 + (level - 1) * 0.09);
const minerRate = (level: number) => 0.45 * (1 + (level - 1) * 0.65);
const energyCapacity = (level: number) =>
  Math.floor(1200 * Math.pow(1.75, level));
const storageUpgradeCost = (level: number) =>
  Math.floor(120 * Math.pow(1.7, level));
const generatorOutput = (level: number) => 3 + level;
const extractionMultiplier = (level: number) => 1 + level * 0.18;
const generatorUpgradeCost = (level: number) =>
  Math.floor(45 * Math.pow(1.72, level));
const extractionUpgradeCost = (level: number) =>
  Math.floor(135 * Math.pow(1.68, level));
const clickDamage = (level: number, wave: number) =>
  12 + level * 7 + wave * 0.35;
const clickUpgradeCost = (level: number) =>
  Math.floor(55 * Math.pow(1.65, level));
const coreUpgradeCost = (level: number) =>
  Math.floor(180 * Math.pow(1.8, level));
const shieldUpgradeCost = (level: number) =>
  Math.floor(120 * Math.pow(1.75, level));

const EVOLUTIONS: Record<TowerKind, [Evolution, string, Evolution, string]> = {
  rail: ["siege", "+75% boss damage", "pierce", "Pierces a second target"],
  arc: ["storm", "Chains 4 targets", "overload", "+65% primary damage"],
  cryo: ["deep", "Stronger, longer slow", "shatter", "+50% vs slowed"],
  miner: [
    "recycler",
    "+80% passive scrap",
    "salvager",
    "+25% nearby kill scrap",
  ],
};

function pointAt(progress: number) {
  let remaining = progress;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i],
      b = PATH[i + 1],
      d = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= d)
      return {
        x: a.x + ((b.x - a.x) * remaining) / d,
        y: a.y + ((b.y - a.y) * remaining) / d,
      };
    remaining -= d;
  }
  return PATH[PATH.length - 1];
}
const pathLength = PATH.slice(1).reduce(
  (n, p, i) => n + Math.hypot(p.x - PATH[i].x, p.y - PATH[i].y),
  0,
);

function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function validPadPosition(p: { x: number; y: number }, pads: Pad[]) {
  if (p.x < 32 || p.x > W - 32 || p.y < 32 || p.y > H - 32) return false;
  if (
    PATH.slice(1).some((point, i) => distanceToSegment(p, PATH[i], point) < 58)
  )
    return false;
  if (Math.hypot(GENERATOR.x - p.x, GENERATOR.y - p.y) < GENERATOR.radius + 34)
    return false;
  return !pads.some((pad) => Math.hypot(pad.x - p.x, pad.y - p.y) < 50);
}

function rankScores(a: ScoreRow, b: ScoreRow) {
  return (
    b.waves - a.waves ||
    (b.bosses_defeated || 0) - (a.bosses_defeated || 0) ||
    b.enemies_defeated - a.enemies_defeated
  );
}
function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60),
    remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
function readLocalScores(): ScoreRow[] {
  try {
    const value = JSON.parse(
      localStorage.getItem("signalBastionScoresV2") || "[]",
    );
    return Array.isArray(value)
      ? value
          .filter(
            (row) => Number.isFinite(row.waves) && typeof row.name === "string",
          )
          .sort(rankScores)
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
function hit(e: Enemy, damage: number, enemies: Enemy[], time: number) {
  if (e.hp <= 0 || (e.kind === "phase" && e.phaseClock % 3 >= 2)) return 0;
  const healthBefore = e.hp;
  if (e.kind === "juggernaut") damage *= 0.62;
  const p = pointAt(e.progress);
  if (
    enemies.some(
      (other) =>
        other.hp > 0 &&
        other !== e &&
        other.kind === "shield" &&
        Math.hypot(
          pointAt(other.progress).x - p.x,
          pointAt(other.progress).y - p.y,
        ) < 70,
    )
  )
    damage *= 0.65;
  const absorbed = Math.min(e.shield, damage);
  e.shield -= absorbed;
  e.hp -= damage - absorbed;
  e.hitAt = time;
  return Math.min(healthBefore, damage - absorbed);
}
type Effect = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  text: string;
  color: string;
};
export default function SignalBastionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effects = useRef<Effect[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const lastTone = useRef(0);
  const [sound, setSound] = useState(false);
  const [strikeArmed, setStrikeArmed] = useState(false);
  const aim = useRef({ x: W / 2, y: H / 2 });
  const float = useCallback(
    (x: number, y: number, text: string, color: string) => {
      effects.current.push({ x, y, vx: 0, vy: -28, life: 0.7, text, color });
      if (effects.current.length > 180) effects.current.shift();
    },
    [],
  );
  const burst = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 6; i++)
      effects.current.push({
        x,
        y,
        vx: Math.cos(i) * 40,
        vy: Math.sin(i) * 40,
        life: 0.45,
        text: "",
        color,
      });
  }, []);
  const tone = useCallback((kind: string) => {
    const audio = audioRef.current;
    if (!soundRef.current || !audio) return;
    if (audio.currentTime - lastTone.current < 0.045) return;
    lastTone.current = audio.currentTime;
    const frequency: Record<string, number> = {
      rail: 100,
      arc: 440,
      cryo: 700,
      click: 250,
      generator: 900,
      upgrade: 1200,
      hit: 65,
      boss: 80,
      music: 160,
    };
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = kind === "rail" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(
      frequency[kind] || 300,
      audio.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      (frequency[kind] || 300) * 0.5,
      audio.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.16);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }, []);
  const toggleSound = () => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    void audioRef.current.resume();
    soundRef.current = !soundRef.current;
    setSound(soundRef.current);
  };
  useEffect(
    () => () => {
      void audioRef.current?.close();
    },
    [],
  );

  const game = useRef({
    phase: "ready" as GamePhase,
    wave: 0,
    lives: 20,
    maxLives: 20,
    coreShield: 0,
    energy: 180,
    scrap: 80,
    killed: 0,
    bosses: 0,
    pads: [] as Pad[],
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    shots: [] as Shot[],
    generatorLevel: 0,
    storageLevel: 0,
    extractionLevel: 0,
    clickLevel: 0,
    coreLevel: 0,
    shieldLevel: 0,
    combo: 0,
    comboClock: 0,
    heat: 0,
    threat: "None",
    threatPending: false,
    modifiers: [] as string[],
    elapsed: 0,
    revival: false,
    revivalUsed: false,
    pulseLevel: 0,
    emergencyLevel: 0,
    overheated: false,
    hitFlash: 0,
    warning: 0,
    empTime: 0,
    runId: "",
    cooldowns: { overcharge: 0, emp: 0, strike: 0, repair: 0, magnet: 0 },
    buffs: { overcharge: 0, magnet: 0 },
    spawnLeft: 0,
    spawnClock: 0,
    nextWave: 0,
    id: 1,
    padId: 1,
    last: 0,
    startedAt: 0,
    doctrine: null as DoctrineId | null,
    doctrineLevel: 0,
    coresAwarded: false,
    playerLevel: 0,
  });
  const placement = useRef({
    active: false,
    dragging: false,
    x: W / 2,
    y: H / 2,
    valid: false,
  });
  const [snap, setSnap] = useState<Snapshot>({
    wave: 0,
    lives: 20,
    energy: 180,
    scrap: 80,
    killed: 0,
    bosses: 0,
    phase: "ready",
    pads: [],
    towers: [],
    generatorLevel: 0,
    storageLevel: 0,
    extractionLevel: 0,
    clickLevel: 0,
    coreLevel: 0,
    shieldLevel: 0,
    combo: 0,
    heat: 0,
    threat: "None",
    cooldowns: { overcharge: 0, emp: 0, strike: 0, repair: 0, magnet: 0 },
    nextWaveIn: 0,
    coreShield: 0,
    maxLives: 20,
    threatPending: false,
    revival: false,
    pulseLevel: 0,
    emergencyLevel: 0,
    elapsed: 0,
    doctrine: null,
    doctrineLevel: 0,
  });
  const [placingTower, setPlacingTower] = useState<TowerKind | null>(null);
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<
    "towers" | "upgrades" | "archive"
  >("towers");
  const [meta, setMeta] = useState<MetaProfile>(EMPTY_META);
  const [coreNotice, setCoreNotice] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const saving = useRef(false);
  const savedRun = useRef("");
  const { currentUser } = useAuth();

  useEffect(() => setMeta(readMetaProfile()), []);

  const sync = useCallback(() => {
    const g = game.current;
    setSnap({
      wave: g.wave,
      lives: g.lives,
      energy: Math.floor(g.energy),
      scrap: Math.floor(g.scrap),
      killed: g.killed,
      bosses: g.bosses,
      phase: g.phase,
      pads: [...g.pads],
      towers: g.towers.map((t) => ({ ...t })),
      generatorLevel: g.generatorLevel,
      storageLevel: g.storageLevel,
      extractionLevel: g.extractionLevel,
      clickLevel: g.clickLevel,
      coreLevel: g.coreLevel,
      shieldLevel: g.shieldLevel,
      combo: g.combo,
      heat: Math.round(g.heat),
      threat: g.threat,
      cooldowns: { ...g.cooldowns },
      nextWaveIn: 0,
      coreShield: g.coreShield,
      maxLives: g.maxLives,
      threatPending: g.threatPending,
      revival: g.revival,
      pulseLevel: g.pulseLevel,
      emergencyLevel: g.emergencyLevel,
      elapsed: g.elapsed,
      doctrine: g.doctrine,
      doctrineLevel: g.doctrineLevel,
    });
  }, []);
  const loadScores = useCallback(async () => {
    await Promise.resolve();
    if (!isSupabaseConfigured) {
      setScores(readLocalScores());
      return;
    }
    const { data, error } = await supabase
      .from("signal_bastion_scores")
      .select(
        "id,name,waves,enemies_defeated,bosses_defeated,run_seconds,modifiers,created_at,run_id,player_level",
      )
      .eq("rules_version", 2)
      .order("waves", { ascending: false })
      .order("bosses_defeated", { ascending: false })
      .order("enemies_defeated", { ascending: false })
      .limit(10);
    if (data) setScores(data as ScoreRow[]);
    if (error)
      setSaveStatus(
        "Global scores are unavailable. Local scores are still saved.",
      );
  }, []);
  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  const begin = () => {
    const now = performance.now();
    game.current = {
      phase: "playing",
      wave: 0,
      lives: 20,
      maxLives: 20,
      coreShield: 0,
      energy: 180,
      scrap: 80,
      killed: 0,
      bosses: 0,
      pads: [],
      towers: [],
      enemies: [],
      shots: [],
      generatorLevel: 0,
      storageLevel: 0,
      extractionLevel: 0,
      clickLevel: 0,
      coreLevel: 0,
      shieldLevel: 0,
      combo: 0,
      comboClock: 0,
      heat: 0,
      threat: "None",
      threatPending: false,
      modifiers: [] as string[],
      elapsed: 0,
      revival: false,
      revivalUsed: false,
      pulseLevel: 0,
      emergencyLevel: 0,
      overheated: false,
      hitFlash: 0,
      warning: 0,
      empTime: 0,
      runId: "",
      cooldowns: { overcharge: 0, emp: 0, strike: 0, repair: 0, magnet: 0 },
      buffs: { overcharge: 0, magnet: 0 },
      spawnLeft: 0,
      spawnClock: 0,
      nextWave: 0,
      id: 1,
      padId: 1,
      last: now,
      startedAt: Date.now(),
      doctrine: meta.equipped,
      doctrineLevel: meta.equipped ? meta.research[meta.equipped] : 0,
      coresAwarded: false,
      playerLevel: playerLevel(meta),
    };
    placement.current = {
      active: false,
      dragging: false,
      x: W / 2,
      y: H / 2,
      valid: false,
    };
    game.current.runId = crypto.randomUUID();
    effects.current = [];
    setStrikeArmed(false);
    setPlacingTower(null);
    setSelectedPad(null);
    setSidebarTab("towers");
    setSaveStatus("");
    setScoreSubmitted(false);
    setCoreNotice("");
    sync();
  };
  const spawnWave = useCallback(
    (g: typeof game.current) => {
      g.wave++;
      g.spawnLeft = 7 + Math.floor(g.wave * 1.65);
      g.spawnClock = 0;
      if (g.wave > 1 && g.wave % 5 === 1 && g.modifiers.length < 3)
        g.threatPending = true;
      if (g.wave % 10 === 0) {
        g.warning = 4;
        tone("boss");
      }
      if (g.shieldLevel > 0)
        g.coreShield = Math.min(
          g.shieldLevel * 2,
          g.coreShield + g.shieldLevel,
        );
    },
    [tone],
  );

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = (now: number) => {
      const g = game.current,
        dt = Math.min(0.04, (now - (g.last || now)) / 1000);
      g.last = now;
      if (g.phase === "playing") {
        g.energy = Math.min(
          energyCapacity(g.storageLevel),
          g.energy + dt * (4 + g.wave * 0.12 + g.generatorLevel * 0.6),
        );
        (Object.keys(g.cooldowns) as Array<keyof typeof g.cooldowns>).forEach(
          (k) => (g.cooldowns[k] = Math.max(0, g.cooldowns[k] - dt)),
        );
        g.buffs.overcharge = Math.max(0, g.buffs.overcharge - dt);
        g.buffs.magnet = Math.max(0, g.buffs.magnet - dt);
        g.heat = Math.max(0, g.heat - dt * 22);
        g.comboClock -= dt;
        if (g.comboClock <= 0) g.combo = 0;
        g.elapsed += dt;
        g.hitFlash = Math.max(0, g.hitFlash - dt);
        g.warning = Math.max(0, g.warning - dt);
        g.empTime = Math.max(0, g.empTime - dt);
        if (g.overheated && g.heat <= 40) g.overheated = false;
        if (g.spawnLeft > 0) {
          g.spawnClock -= dt;
          if (g.spawnClock <= 0) {
            const boss = g.wave % 10 === 0 && g.spawnLeft === 1;
            const roll = (g.id * 17 + g.wave * 13) % 100;
            const kind: EnemyKind = boss
              ? "boss"
              : g.wave >= 18 && roll < 8
                ? "phase"
                : g.wave >= 14 && roll < 18
                  ? "shield"
                  : g.wave >= 11 && roll < 29
                    ? "disruptor"
                    : g.wave >= 8 && roll < 40
                      ? "regenerator"
                      : g.wave >= 5 && roll < 55
                        ? "juggernaut"
                        : g.wave >= 3 && roll < 72
                          ? "runner"
                          : g.wave >= 2 && roll < 88
                            ? "swarm"
                            : "grunt";
            const mult =
              kind === "runner"
                ? 0.58
                : kind === "swarm"
                  ? 0.5
                  : kind === "juggernaut"
                    ? 3.2
                    : kind === "boss"
                      ? 9
                      : 1.25;
            const speedMult =
              kind === "runner"
                ? 1.75
                : kind === "swarm"
                  ? 1.35
                  : kind === "juggernaut"
                    ? 0.55
                    : kind === "boss"
                      ? 0.62
                      : 1;
            const hp =
              (48 + g.wave * 15) *
              Math.pow(1.055, g.wave) *
              mult *
              (g.modifiers.includes("Armored host") ? 1.25 : 1);
            g.enemies.push({
              id: g.id++,
              kind,
              progress: 0,
              hp,
              maxHp: hp,
              shield: kind === "shield" ? hp * 0.65 : 0,
              speed:
                (43 + Math.min(g.wave, 35) * 0.7) *
                speedMult *
                (g.modifiers.includes("Rapid host") ? 1.18 : 1),
              reward: (10 + g.wave * 1.2) * (boss ? 8 : mult),
              boss,
              slow: 0,
              phaseClock: 0,
            });
            if (kind === "swarm") {
              const leader = g.enemies[g.enemies.length - 1];
              g.enemies.push(
                {
                  ...leader,
                  id: g.id++,
                  progress: -18,
                  hp: hp * 0.6,
                  maxHp: hp * 0.6,
                  reward: leader.reward * 0.5,
                },
                {
                  ...leader,
                  id: g.id++,
                  progress: -36,
                  hp: hp * 0.6,
                  maxHp: hp * 0.6,
                  reward: leader.reward * 0.5,
                },
              );
            }
            g.spawnLeft--;
            g.spawnClock = Math.max(0.22, 0.82 - g.wave * 0.012);
          }
        }

        for (const e of g.enemies) {
          if (e.hp <= 0) continue;
          e.slow = Math.max(0, e.slow - dt);
          e.phaseClock += dt;
          if (e.kind === "regenerator")
            e.hp = Math.min(
              e.maxHp,
              e.hp +
                ((e.hitAt || 0) + 1.5 < g.elapsed ? e.maxHp * 0.018 * dt : 0),
            );
          e.progress +=
            e.speed *
            (g.empTime > 0 ? 0 : e.slow > 0 ? (e.slowFactor ?? 0.55) : 1) *
            dt;
          if (e.progress >= pathLength) {
            e.hp = 0;
            let loss = e.boss ? 5 : 1;
            if (g.coreShield > 0) {
              const blocked = Math.min(g.coreShield, loss);
              g.coreShield -= blocked;
              loss -= blocked;
            }
            g.lives -= loss;
            if (loss > 0) {
              g.hitFlash = 0.4;
              tone("hit");
              if (g.emergencyLevel > 0)
                g.buffs.overcharge = Math.max(
                  g.buffs.overcharge,
                  2 + g.emergencyLevel,
                );
              if (g.pulseLevel > 0)
                g.enemies.forEach((other) => {
                  if (other !== e)
                    hit(other, 40 * g.pulseLevel, g.enemies, g.elapsed);
                });
            }
          }
        }
        g.enemies = g.enemies.filter((e) => {
          if (e.hp > 0) return true;
          if (e.progress < pathLength) {
            const p = pointAt(e.progress),
              salvager = g.towers.some(
                (t) =>
                  t.evolution === "salvager" &&
                  (() => {
                    const pad = g.pads.find((x) => x.id === t.pad);
                    return !!pad && Math.hypot(p.x - pad.x, p.y - pad.y) < 150;
                  })(),
              );
            g.scrap +=
              e.reward *
              extractionMultiplier(g.extractionLevel) *
              (g.buffs.magnet > 0 ? 2 : 1) *
              (salvager ? 1.25 : 1);
            g.killed++;
            if (e.boss) g.bosses++;
            burst(p.x, p.y, "#66f2bb");
            float(p.x, p.y, "+SCRAP", "#66f2bb");
          }
          return false;
        });
        for (const t of g.towers) {
          if (t.kind === "miner") {
            g.scrap +=
              minerRate(t.level) *
              (t.evolution === "recycler" ? 1.8 : 1) *
              (g.doctrine === "deepBore" ? 1 + g.doctrineLevel * 0.07 : 1) *
              dt;
            continue;
          }
          t.cooldown -= dt;
          if (t.cooldown > 0) continue;
          const p = g.pads.find((pad) => pad.id === t.pad);
          if (!p) continue;
          if (
            g.enemies.some(
              (e) =>
                e.hp > 0 &&
                e.kind === "disruptor" &&
                e.phaseClock % 4 < 1.2 &&
                Math.hypot(
                  pointAt(e.progress).x - p.x,
                  pointAt(e.progress).y - p.y,
                ) < 80,
            )
          )
            continue;
          const stats = TOWER_DATA[t.kind],
            inRange = g.enemies
              .filter(
                (e) => e.hp > 0 && (e.kind !== "phase" || e.phaseClock % 3 < 2),
              )
              .filter((e) => {
                const q = pointAt(e.progress);
                return (
                  Math.hypot(q.x - p.x, q.y - p.y) <=
                  towerRange(t, g.doctrine, g.doctrineLevel)
                );
              });
          inRange.sort((a, b) =>
            t.target === "last"
              ? a.progress - b.progress
              : t.target === "strongest"
                ? b.hp - a.hp
                : t.target === "weakest"
                  ? a.hp - b.hp
                  : t.target === "closest"
                    ? Math.hypot(
                        pointAt(a.progress).x - p.x,
                        pointAt(a.progress).y - p.y,
                      ) -
                      Math.hypot(
                        pointAt(b.progress).x - p.x,
                        pointAt(b.progress).y - p.y,
                      )
                    : t.target === "unslowed"
                      ? Number(a.slow > 0) - Number(b.slow > 0) ||
                        b.progress - a.progress
                      : b.progress - a.progress,
          );
          const target = inRange[0];
          if (!target) continue;
          const q = pointAt(target.progress);
          let damage = stats.damage * (1 + (t.level - 1) * 0.72);
          if (t.kind === "arc" && g.doctrine === "relay")
            damage *= 1 - g.doctrineLevel * 0.03;
          if (t.kind === "cryo" && g.doctrine === "permafrost")
            damage *= 1 - g.doctrineLevel * 0.04;
          if (t.evolution === "siege" && target.boss) damage *= 1.75;
          if (t.evolution === "overload") damage *= 1.65;
          if (t.evolution === "shatter" && target.slow > 0) damage *= 1.5;
          const dealt = hit(target, damage, g.enemies, g.elapsed);
          float(q.x, q.y, Math.round(dealt).toString(), stats.color);
          tone(t.kind);
          if (
            t.kind === "cryo" &&
            target.slow <= 0 &&
            Math.random() <
              Math.min(
                0.95,
                cryoChance(t.level) +
                  (g.doctrine === "permafrost" ? g.doctrineLevel * 0.04 : 0),
              )
          ) {
            target.slow = t.evolution === "deep" ? 3 : 1.8;
            target.slowFactor = t.evolution === "deep" ? 0.3 : 0.55;
          }
          if (t.kind === "arc") {
            g.enemies
              .filter(
                (e) =>
                  e.hp > 0 &&
                  e !== target &&
                  Math.hypot(
                    pointAt(e.progress).x - q.x,
                    pointAt(e.progress).y - q.y,
                  ) < 75,
              )
              .slice(
                0,
                t.evolution === "storm"
                  ? 4 + (g.doctrine === "relay" ? Math.ceil(g.doctrineLevel / 2) : 0)
                  : t.evolution === "overload"
                    ? 1 + (g.doctrine === "relay" ? Math.ceil(g.doctrineLevel / 2) : 0)
                    : 2 + (g.doctrine === "relay" ? Math.ceil(g.doctrineLevel / 2) : 0),
              )
              .forEach((e) => {
                hit(e, damage * 0.48, g.enemies, g.elapsed);
                const end = pointAt(e.progress);
                g.shots.push({
                  x1: q.x,
                  y1: q.y,
                  x2: end.x,
                  y2: end.y,
                  life: 0.13,
                  color: stats.color,
                });
              });
          }
          if (t.evolution === "pierce") {
            const dx = q.x - p.x,
              dy = q.y - p.y;
            const length = Math.hypot(dx, dy) || 1;
            const end = {
              x: p.x + (dx / length) * towerRange(t, g.doctrine, g.doctrineLevel),
              y: p.y + (dy / length) * towerRange(t, g.doctrine, g.doctrineLevel),
            };
            const secondary = inRange.find((e) => {
              const location = pointAt(e.progress);
              return (
                e !== target &&
                e.hp > 0 &&
                (location.x - q.x) * dx + (location.y - q.y) * dy > 0 &&
                distanceToSegment(location, q, end) < 18
              );
            });
            if (secondary) {
              hit(secondary, damage * 0.6, g.enemies, g.elapsed);
              g.shots.push({
                x1: q.x,
                y1: q.y,
                x2: end.x,
                y2: end.y,
                life: 0.13,
                color: stats.color,
              });
            }
          }
          g.shots.push({
            x1: p.x,
            y1: p.y,
            x2: q.x,
            y2: q.y,
            life: 0.13,
            color: stats.color,
          });
          t.cooldown =
            (stats.rate *
              Math.pow(0.94, t.level - 1) *
              (t.kind === "rail" && g.doctrine === "longshot"
                ? 1 + g.doctrineLevel * 0.03
                : 1)) /
            (g.buffs.overcharge > 0 ? 1.8 : 1);
        }
        g.shots.forEach((s) => (s.life -= dt));
        g.shots = g.shots.filter((s) => s.life > 0);
        if (g.lives <= 0 && g.revival && !g.revivalUsed) {
          g.lives = Math.ceil(g.maxLives * 0.5);
          g.revivalUsed = true;
          g.revival = false;
          g.empTime = 3;
          float(790, 420, "CORE REBOOT", "#61eede");
        }
        if (g.lives <= 0) {
          g.lives = 0;
          g.phase = "gameover";
          if (!g.coresAwarded) {
            g.coresAwarded = true;
            const earned = coreReward(Math.max(0, g.wave - 1), g.bosses);
            setMeta((current) => {
              if (!g.runId || current.rewardedRuns.includes(g.runId)) return current;
              const next = {
                ...current,
                cores: current.cores + earned,
                rewardedRuns: [...current.rewardedRuns, g.runId].slice(-100),
              };
              writeMetaProfile(next);
              return next;
            });
            setCoreNotice(`Recovered ${earned} Data Core${earned === 1 ? "" : "s"}.`);
          }
          placement.current.active = false;
          sync();
        } else if (g.spawnLeft === 0 && g.enemies.length === 0) spawnWave(g);
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#061019";
      ctx.fillRect(0, 0, W, H);
      const grd = ctx.createRadialGradient(480, 250, 30, 480, 250, 600);
      grd.addColorStop(0, "#102838");
      grd.addColorStop(1, "#03070c");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(97,238,228,.055)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.beginPath();
      PATH.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = "#192d34";
      ctx.lineWidth = 55;
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(38, 180, 170, .18)";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(4, 9, 12, .8)";
      ctx.lineWidth = 43;
      ctx.stroke();
      ctx.strokeStyle = "#2b4c4d";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -(now / 45) % 24;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      for (let signal = 0; signal < 5; signal++) {
        const beacon = pointAt((now * 0.035 + signal * (pathLength / 5)) % pathLength);
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(97,238,222,.55)";
        ctx.fill();
      }
      ctx.fillStyle = "#ff6d5a";
      ctx.shadowColor = "#ff4c3b";
      ctx.shadowBlur = 25;
      ctx.fillRect(936, 420, 24, 90);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ff998d";
      ctx.lineWidth = 2;
      for (let y = 428; y < 505; y += 13) {
        ctx.beginPath();
        ctx.moveTo(938, y);
        ctx.lineTo(958, y + 8);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffb2a9";
      ctx.font = "700 8px monospace";
      ctx.textAlign = "right";
      ctx.fillText("CORE GATE", 928, 458);
      const generatorPulse = 0.72 + Math.sin(now / 180) * 0.12;
      ctx.beginPath();
      ctx.arc(GENERATOR.x, GENERATOR.y, GENERATOR.radius + 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(97,238,222,${0.06 + generatorPulse * 0.05})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(97,238,222,.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(GENERATOR.x, GENERATOR.y, GENERATOR.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#0c2528";
      ctx.fill();
      ctx.strokeStyle = "#61eede";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#61eede";
      ctx.shadowBlur = 16 * generatorPulse;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(GENERATOR.x - 9, GENERATOR.y - 18);
      ctx.lineTo(GENERATOR.x + 5, GENERATOR.y - 3);
      ctx.lineTo(GENERATOR.x - 2, GENERATOR.y - 3);
      ctx.lineTo(GENERATOR.x + 9, GENERATOR.y + 18);
      ctx.lineTo(GENERATOR.x - 8, GENERATOR.y + 3);
      ctx.lineTo(GENERATOR.x, GENERATOR.y + 3);
      ctx.closePath();
      ctx.fillStyle = "#b8fff7";
      ctx.fill();
      ctx.font = "700 9px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#7bafac";
      ctx.fillText("GENERATOR", GENERATOR.x, GENERATOR.y + 55);
      const selectedTower = g.towers.find((t) => t.pad === selectedPad),
        selectedTowerPad = g.pads.find((p) => p.id === selectedPad);
      if (
        selectedTower &&
        selectedTowerPad &&
        (selectedTower.kind !== "miner" || selectedTower.evolution === "salvager")
      ) {
        const stats = TOWER_DATA[selectedTower.kind],
          range =
            selectedTower.evolution === "salvager"
              ? 150
              : towerRange(selectedTower, g.doctrine, g.doctrineLevel);
        ctx.beginPath();
        ctx.arc(selectedTowerPad.x, selectedTowerPad.y, range, 0, Math.PI * 2);
        ctx.fillStyle = `${stats.color}18`;
        ctx.fill();
        ctx.strokeStyle = `${stats.color}aa`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        if (selectedTower.evolution === "salvager") {
          ctx.fillStyle = stats.color;
          ctx.font = "700 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("+25% SALVAGE ZONE", selectedTowerPad.x, selectedTowerPad.y - range - 8);
        }
      }
      g.pads.forEach((p) => {
        const built = g.towers.find((t) => t.pad === p.id);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = built ? "#12232d" : "rgba(82,133,140,.14)";
        ctx.fill();
        ctx.strokeStyle =
          selectedPad === p.id
            ? "#fff"
            : built
              ? TOWER_DATA[built.kind].color
              : "#45636a";
        ctx.lineWidth = selectedPad === p.id ? 3 : 2;
        ctx.stroke();
        if (built) {
          const color = TOWER_DATA[built.kind].color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = selectedPad === p.id ? 15 : 7;
          if (built.kind === "rail") {
            ctx.fillRect(-6, -8, 12, 16);
            ctx.fillRect(2, -3, 17, 6);
            ctx.beginPath();
            ctx.arc(-7, 0, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (built.kind === "arc") {
            ctx.rotate(Math.PI / 4);
            ctx.strokeRect(-9, -9, 18, 18);
            ctx.fillRect(-4, -4, 8, 8);
          } else if (built.kind === "cryo") {
            for (let arm = 0; arm < 3; arm++) {
              ctx.rotate(Math.PI / 3);
              ctx.beginPath();
              ctx.moveTo(-12, 0);
              ctx.lineTo(12, 0);
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            for (let tooth = 0; tooth < 8; tooth++) {
              const angle = (tooth * Math.PI) / 4;
              ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 11);
              ctx.lineTo(
                Math.cos(angle + Math.PI / 8) * 7,
                Math.sin(angle + Math.PI / 8) * 7,
              );
            }
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(built.level), p.x, p.y + 20);
        } else {
          ctx.fillStyle = "#58747a";
          ctx.font = "20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("+", p.x, p.y + 7);
        }
      });
      if (placement.current.active) {
        const p = placement.current;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = p.valid
          ? "rgba(97,238,222,.18)"
          : "rgba(255,92,92,.18)";
        ctx.fill();
        ctx.strokeStyle = p.valid ? "#61eede" : "#ff625d";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "700 10px monospace";
        ctx.fillStyle = p.valid ? "#9afff4" : "#ff9c98";
        ctx.textAlign = "center";
        ctx.fillText(p.valid ? "DROP" : "BLOCKED", p.x, p.y - 34);
      }
      for (const e of g.enemies) {
        const p = pointAt(e.progress),
          r = e.boss ? 18 : 11;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.globalAlpha = e.kind === "phase" && e.phaseClock % 3 >= 2 ? 0.2 : 1;
        ctx.fillStyle = e.boss
          ? "#ff4d6d"
          : e.slow > 0
            ? "#9d8cff"
            : {
                grunt: "#e6f5e9",
                runner: "#ffb55b",
                juggernaut: "#8f9aa9",
                swarm: "#f7e665",
                regenerator: "#4ad59e",
                disruptor: "#ee75df",
                shield: "#65c8ff",
                phase: "#b1a1ff",
                boss: "#ff4d6d",
              }[e.kind];
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = e.boss ? 18 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        if (e.kind === "phase" && e.phaseClock % 3 >= 2) {
          ctx.strokeStyle = "#b1a1ff";
          ctx.stroke();
        }
        if (e.shield > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "#65c8ff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = "#091014";
        ctx.fillRect(p.x - 17, p.y - r - 10, 34, 4);
        ctx.fillStyle = e.boss ? "#ff4d6d" : "#66f2bb";
        ctx.fillRect(
          p.x - 17,
          p.y - r - 10,
          34 * Math.max(0, e.hp / e.maxHp),
          4,
        );
      }
      for (const s of g.shots) {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.min(1, s.life * 8);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (const effect of effects.current) {
        effect.life -= dt;
        effect.x += effect.vx * dt;
        effect.y += effect.vy * dt;
        ctx.globalAlpha = Math.max(0, effect.life);
        ctx.fillStyle = effect.color;
        ctx.font = "bold 11px monospace";
        if (effect.text) ctx.fillText(effect.text, effect.x, effect.y);
        else ctx.fillRect(effect.x, effect.y, 3, 3);
      }
      effects.current = effects.current.filter((e) => e.life > 0);
      ctx.globalAlpha = 1;
      if (g.hitFlash > 0) {
        ctx.fillStyle = "rgba(255,50,60,.16)";
        ctx.fillRect(0, 0, W, H);
      }
      if (strikeArmed && g.phase === "playing") {
        ctx.beginPath();
        ctx.arc(aim.current.x, aim.current.y, 130, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,189,90,.12)";
        ctx.fill();
        ctx.strokeStyle = "#ffbd5a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffbd5a";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ORBITAL STRIKE", aim.current.x, aim.current.y);
      }
      if (g.overheated && g.phase === "playing") {
        ctx.fillStyle = "#ff7067";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("COOLING DOWN", GENERATOR.x, GENERATOR.y - 55);
      }
      if (g.warning > 0) {
        ctx.fillStyle = "#ff6478";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BOSS SIGNAL DETECTED", W / 2, 36);
      }
      if (
        g.phase === "playing" &&
        Math.floor(g.elapsed * (g.wave % 10 === 0 ? 4 : 2)) !==
          Math.floor((g.elapsed - dt) * (g.wave % 10 === 0 ? 4 : 2))
      )
        tone("music");
      if (g.phase !== "playing") {
        ctx.fillStyle = "rgba(2,6,12,.72)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#f2fbf9";
        ctx.font = "800 34px sans-serif";
        ctx.fillText(
          g.phase === "gameover" ? "THE BASTION FELL" : "SIGNAL BASTION",
          W / 2,
          235,
        );
        ctx.font = "500 15px sans-serif";
        ctx.fillStyle = "#9bb6b8";
        ctx.fillText(
          g.phase === "gameover"
            ? `Completed ${Math.max(0, g.wave - 1)} waves · ${g.bosses} bosses`
            : "Build. Overcharge. Endure.",
          W / 2,
          270,
        );
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const timer = window.setInterval(sync, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [selectedPad, sync, burst, float, tone, spawnWave, strikeArmed]);

  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * W) / rect.width,
      y: ((e.clientY - rect.top) * H) / rect.height,
    };
  };
  const canvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = game.current;
    if (g.phase !== "playing") return;
    const { x, y } = canvasPoint(e);
    if (strikeArmed) {
      g.enemies
        .filter(
          (enemy) =>
            Math.hypot(
              pointAt(enemy.progress).x - x,
              pointAt(enemy.progress).y - y,
            ) < 130,
        )
        .forEach((enemy) =>
          hit(enemy, 120 + g.wave * 25, g.enemies, g.elapsed),
        );
      g.cooldowns.strike = 42;
      burst(x, y, "#ffbd5a");
      setStrikeArmed(false);
      return;
    }
    if (placement.current.active) {
      e.currentTarget.setPointerCapture(e.pointerId);
      placement.current = {
        active: true,
        dragging: true,
        x,
        y,
        valid: validPadPosition({ x, y }, g.pads),
      };
      return;
    }
    const pad = g.pads
      .filter((p) => Math.hypot(p.x - x, p.y - y) < 30)
      .sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
      )[0];
    if (pad) {
      setSelectedPad(pad.id);
      setSidebarTab("towers");
      return;
    }
    setSelectedPad(null);
    if (Math.hypot(GENERATOR.x - x, GENERATOR.y - y) <= GENERATOR.radius + 8) {
      if (g.overheated) return;
      g.combo = g.comboClock > 0 ? g.combo + 1 : 1;
      g.comboClock = 1.15;
      g.heat = Math.min(
        100,
        g.heat + (g.modifiers.includes("Hot generator") ? 14 : 9),
      );
      if (g.heat >= 100) g.overheated = true;
      const charged = g.combo % 10 === 0;
      const critical = Math.random() < 0.08 + Math.min(20, g.combo) * 0.008;

      g.energy = Math.min(
        energyCapacity(g.storageLevel),
        g.energy +
          generatorOutput(g.generatorLevel) *
            (1 + Math.min(20, g.combo) * 0.04) *
            (critical ? 3 : charged ? 2 : 1) *
            (g.buffs.overcharge > 0 ? 1.5 : 1),
      );
      float(
        GENERATOR.x,
        GENERATOR.y - 30,
        critical ? "CRITICAL ×3" : charged ? "CHARGED ×2" : "ENERGY +",
        "#61eede",
      );
      tone("generator");
      g.shots.push({
        x1: GENERATOR.x - 13,
        y1: GENERATOR.y,
        x2: GENERATOR.x + 13,
        y2: GENERATOR.y,
        life: 0.12,
        color: critical ? "#fff27a" : "#b8fff7",
      });
      return;
    }
    let target: Enemy | undefined,
      dist = 32;
    for (const enemy of g.enemies) {
      if (enemy.hp <= 0) continue;
      const p = pointAt(enemy.progress),
        d = Math.hypot(p.x - x, p.y - y);
      if (d < dist) {
        dist = d;
        target = enemy;
      }
    }
    if (
      target &&
      g.energy >= 2 &&
      (target.kind !== "phase" || target.phaseClock % 3 < 2)
    ) {
      g.energy -= 2;
      const damage = clickDamage(g.clickLevel, g.wave);
      const dealt = hit(target, damage, g.enemies, g.elapsed);
      tone("click");
      const p = pointAt(target.progress);
      g.shots.push({
        x1: x,
        y1: y,
        x2: p.x,
        y2: p.y,
        life: 0.12,
        color: "#fff27a",
      });
      float(p.x, p.y, Math.round(dealt).toString(), "#fff27a");
    }
  };
  const canvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    aim.current = canvasPoint(e);
    if (!placement.current.active) return;
    const { x, y } = canvasPoint(e);
    placement.current = {
      ...placement.current,
      x,
      y,
      valid: validPadPosition({ x, y }, game.current.pads),
    };
  };
  const canvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const place = placement.current;
    if (!place.active || !place.dragging) return;
    const g = game.current,
      kind = placingTower;
    if (
      g.phase === "playing" &&
      kind &&
      validPadPosition(canvasPoint(e), g.pads) &&
      g.energy >= towerCost(kind, g.doctrine, g.doctrineLevel)
    ) {
      const pad = { id: g.padId++, ...canvasPoint(e) };
      g.energy -= towerCost(kind, g.doctrine, g.doctrineLevel);
      g.pads.push(pad);
      g.towers.push({
        pad: pad.id,
        kind,
        level: 1,
        cooldown: 0,
        target:
          kind === "cryo"
            ? "unslowed"
            : kind === "rail"
              ? "strongest"
              : "first",
      });
      setSelectedPad(pad.id);
      sync();
    }
    placement.current = { ...place, active: false, dragging: false };
    setPlacingTower(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const startTowerPlacement = (kind: TowerKind) => {
    if (
      snap.phase !== "playing" ||
      snap.energy < towerCost(kind, snap.doctrine, snap.doctrineLevel)
    )
      return;
    setStrikeArmed(false);
    setSelectedPad(null);
    setPlacingTower(kind);
    placement.current = {
      active: true,
      dragging: false,
      x: W / 2,
      y: H / 2,
      valid: validPadPosition({ x: W / 2, y: H / 2 }, game.current.pads),
    };
  };
  const cancelTowerPlacement = () => {
    placement.current.active = false;
    placement.current.dragging = false;
    setPlacingTower(null);
  };
  const tower = snap.towers.find((t) => t.pad === selectedPad),
    upgradeCost = tower
      ? Math.floor(TOWER_DATA[tower.kind].cost * (0.72 + tower.level * 0.58))
      : 0;
  const upgrade = () => {
    if (
      game.current.phase !== "playing" ||
      !tower ||
      game.current.scrap < upgradeCost
    )
      return;
    game.current.scrap -= upgradeCost;
    const live = game.current.towers.find((t) => t.pad === tower.pad);
    if (live) {
      live.level++;
      const p = game.current.pads.find((p) => p.id === live.pad);
      if (p) burst(p.x, p.y, "#61eede");
      tone("upgrade");
    }
    sync();
  };
  const sell = () => {
    if (game.current.phase !== "playing" || !tower) return;
    const paidCost = towerCost(
      tower.kind,
      game.current.doctrine,
      game.current.doctrineLevel,
    );
    game.current.energy = Math.min(
      energyCapacity(game.current.storageLevel),
      game.current.energy + Math.floor(paidCost * 0.6),
    );
    game.current.towers = game.current.towers.filter(
      (t) => t.pad !== tower.pad,
    );
    game.current.pads = game.current.pads.filter((p) => p.id !== tower.pad);
    setSelectedPad(null);
    sync();
  };
  const upgradeStorage = () => {
    const g = game.current,
      cost = storageUpgradeCost(g.storageLevel);
    if (g.phase !== "playing" || g.scrap < cost) return;
    g.scrap -= cost;
    g.storageLevel++;
    sync();
  };
  const upgradeGenerator = () => {
    const g = game.current,
      cost = generatorUpgradeCost(g.generatorLevel);
    if (g.phase !== "playing" || g.scrap < cost) return;
    g.scrap -= cost;
    g.generatorLevel++;
    sync();
  };
  const upgradeExtraction = () => {
    const g = game.current,
      cost = extractionUpgradeCost(g.extractionLevel);
    if (g.phase !== "playing" || g.energy < cost) return;
    g.energy -= cost;
    g.extractionLevel++;
    sync();
  };
  const upgradeClickDamage = () => {
    const g = game.current,
      cost = clickUpgradeCost(g.clickLevel);
    if (g.phase !== "playing" || g.scrap < cost) return;
    g.scrap -= cost;
    g.clickLevel++;
    sync();
  };
  const upgradeCore = () => {
    const g = game.current,
      cost = coreUpgradeCost(g.coreLevel);
    if (g.phase !== "playing" || g.scrap < cost) return;
    g.scrap -= cost;
    g.coreLevel++;
    g.maxLives += 5;
    g.lives += 5;
    sync();
  };
  const upgradeShield = () => {
    const g = game.current,
      cost = shieldUpgradeCost(g.shieldLevel);
    if (g.phase !== "playing" || g.energy < cost) return;
    g.energy -= cost;
    g.shieldLevel++;
    g.coreShield += 2;
    sync();
  };
  const upgradeCoreSpecial = (kind: "pulse" | "emergency" | "revival") => {
    const g = game.current;
    const cost =
      kind === "revival"
        ? 600
        : Math.floor(
            180 *
              Math.pow(1.8, kind === "pulse" ? g.pulseLevel : g.emergencyLevel),
          );
    if (
      g.phase !== "playing" ||
      g.scrap < cost ||
      (kind === "revival" && (g.revival || g.revivalUsed))
    )
      return;
    g.scrap -= cost;
    if (kind === "pulse") g.pulseLevel++;
    else if (kind === "emergency") g.emergencyLevel++;
    else g.revival = true;
    sync();
  };
  const setTarget = (target: TargetMode) => {
    const live = game.current.towers.find((t) => t.pad === tower?.pad);
    if (game.current.phase === "playing" && live) live.target = target;
    sync();
  };
  const evolve = (evolution: Evolution) => {
    const live = game.current.towers.find((t) => t.pad === tower?.pad);
    if (
      game.current.phase === "playing" &&
      live &&
      live.level >= 5 &&
      !live.evolution
    ) {
      live.evolution = evolution;
      sync();
    }
  };
  const ability = (kind: keyof typeof game.current.cooldowns) => {
    const g = game.current;
    if (g.phase !== "playing" || g.cooldowns[kind] > 0) return;
    if (kind === "overcharge") {
      g.buffs.overcharge = 8;
      g.cooldowns[kind] = 35;
    }
    if (kind === "emp") {
      g.empTime = 2.5;
      g.cooldowns[kind] = 30;
    }
    if (kind === "strike") {
      cancelTowerPlacement();
      setStrikeArmed(true);
      return;
    }
    if (kind === "repair") {
      g.lives = Math.min(g.maxLives, g.lives + 5);
      g.cooldowns[kind] = 55;
    }
    if (kind === "magnet") {
      g.buffs.magnet = 10;
      g.cooldowns[kind] = 38;
    }
    sync();
  };
  const chooseThreat = (threat: string) => {
    const g = game.current;
    if (g.phase !== "playing" || !g.threatPending) return;
    if (g.modifiers.includes(threat)) return;
    g.modifiers.push(threat);
    g.threat = g.modifiers.join(", ");
    g.threatPending = false;
    g.scrap += 75 + g.wave * 4;
    sync();
  };
  const unlockDoctrine = (id: DoctrineId) => {
    if (game.current.phase === "playing") return;
    setMeta((current) => {
      const level = current.research[id],
        cost = researchCost(level);
      if (level >= 5 || current.cores < cost) return current;
      const next = {
        ...current,
        cores: current.cores - cost,
        research: { ...current.research, [id]: level + 1 },
        equipped: id,
      };
      writeMetaProfile(next);
      return next;
    });
  };
  const equipDoctrine = (id: DoctrineId | null) => {
    if (
      game.current.phase === "playing" ||
      (id && meta.research[id] <= 0)
    )
      return;
    setMeta((current) => {
      const next = { ...current, equipped: id };
      writeMetaProfile(next);
      return next;
    });
  };
  const saveScore = async () => {
    const g = game.current;
    if (
      g.phase !== "gameover" ||
      saving.current ||
      scoreSubmitted ||
      savedRun.current === g.runId
    )
      return;
    saving.current = true;
    setSaveStatus("Saving…");
    const row = {
      name: currentUser?.displayName || "Guest defender",
      waves: Math.max(0, g.wave - 1),
      enemies_defeated: g.killed,
      bosses_defeated: g.bosses,
      run_seconds: Math.floor(g.elapsed),
      modifiers: [...g.modifiers],
      created_at: new Date().toISOString(),
      run_id: g.runId,
      rules_version: 2,
      player_level: g.playerLevel,
    };
    if (g.doctrine) row.modifiers.push(`Doctrine: ${DOCTRINES[g.doctrine].name}`);
    try {
      const local = [
        { id: Date.now(), ...row },
        ...readLocalScores().filter((s) => s.run_id !== g.runId),
      ]
        .sort(rankScores)
        .slice(0, 10);
      try {
        localStorage.setItem("signalBastionScoresV2", JSON.stringify(local));
      } catch {}
      savedRun.current = g.runId;
      setScoreSubmitted(true);
      if (isSupabaseConfigured && currentUser) {
        const { error } = await supabase
          .from("signal_bastion_scores")
          .insert({ ...row, user_id: currentUser.uid });
        if (error && error.code !== "23505") {
          setSaveStatus("Saved on this device. Global submission failed.");
          return;
        }
        setSaveStatus("Score saved.");
        void loadScores();
      } else {
        setScores(local);
        setSaveStatus(
          "Saved on this device. Sign in to submit this run globally.",
        );
      }
    } catch {
      setSaveStatus("Could not save this run. Please retry.");
    } finally {
      saving.current = false;
    }
  };

  return (
    <main className="sb-page">
      <HeaderWithAuth />
      <section className="sb-hero">
        <p>ENDLESS DEFENSE // ACTIVE CLICKER</p>
        <h1>
          Signal <span>Bastion</span>
        </h1>
        <div className="sb-rule" />
        <small>
          Your clicks power humanity&apos;s last defense. How long can your
          signal hold?
        </small>
      </section>
      <section className="sb-shell">
        <div className="sb-toolbar">
          {strikeArmed && (
            <button onClick={() => setStrikeArmed(false)}>
              CANCEL ORBITAL STRIKE
            </button>
          )}
          <button onClick={toggleSound}>
            {sound ? "SOUND ON" : "SOUND OFF"}
          </button>
          <span>
            Waves advance immediately • Generator overheats at 100%, recovers at
            40%
          </span>
          {snap.threatPending && (
            <button onClick={() => setSidebarTab("upgrades")}>
              THREAT CHOICE AVAILABLE
            </button>
          )}
        </div>
        <div className="sb-hud">
          <div>
            <small>WAVE</small>
            <strong>{snap.wave}</strong>
          </div>
          <div>
            <small>CORE</small>
            <strong className="life">
              {snap.lives}/{snap.maxLives} · {snap.coreShield} shield
            </strong>
          </div>
          <div>
            <small>ENERGY</small>
            <strong>
              {snap.energy}/{energyCapacity(snap.storageLevel)}
            </strong>
          </div>
          <div>
            <small>SCRAP</small>
            <strong>{snap.scrap}</strong>
          </div>
          <div>
            <small>COMBO / HEAT</small>
            <strong>
              ×{snap.combo} · {snap.heat}%
            </strong>
          </div>
          <div>
            <small>THREAT</small>
            <strong>{snap.threat}</strong>
          </div>
        </div>
        <div className="sb-layout">
          <div
            className={`sb-stage ${placingTower || strikeArmed ? "placing" : ""}`}
          >
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onPointerDown={canvasPointerDown}
              onPointerMove={canvasPointerMove}
              onPointerUp={canvasPointerUp}
              onPointerCancel={cancelTowerPlacement}
              onContextMenu={(e) => {
                e.preventDefault();
                cancelTowerPlacement();
                setStrikeArmed(false);
              }}
            />
            {snap.phase !== "playing" && (
              <div className={`sb-start ${snap.phase === "gameover" ? "gameover" : ""}`}>
                {snap.phase === "gameover" && (
                  <div className="sb-run-reward">
                    <i>◆</i>
                    <small>RUN REWARD SECURED</small>
                    <strong>
                      +{coreReward(Math.max(0, snap.wave - 1), snap.bosses)} DATA CORES
                    </strong>
                    <p>
                      Commander Level {playerLevel(meta)} · Spend cores in the
                      Archive to level tower doctrines.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setSidebarTab("archive")}
                    >
                      OPEN ARCHIVE
                    </button>
                  </div>
                )}
                <div className="sb-run-actions">
                  <button onClick={begin}>
                    {snap.phase === "gameover"
                      ? "REBUILD & RETRY"
                      : "BEGIN DEFENSE"}
                  </button>
                  {snap.phase === "gameover" && (
                    <button
                      className="secondary"
                      onClick={saveScore}
                      disabled={scoreSubmitted}
                    >
                      {scoreSubmitted ? "SCORE SAVED ✓" : "SAVE SCORE"}
                    </button>
                  )}
                </div>
                <span>{saveStatus || coreNotice}</span>
              </div>
            )}
            <div className="sb-tip">
              {strikeArmed
                ? "Click the battlefield to aim an orbital strike"
                : placingTower
                  ? "Press, drag, and release on clear ground to build the tower"
                  : "Click the generator for energy · Click enemies to fire · Select a tower to manage it"}
            </div>
          </div>
          <aside className="sb-controls">
            <div className="sb-sidebar-tabs">
              <button
                className={sidebarTab === "towers" ? "active" : ""}
                onClick={() => setSidebarTab("towers")}
              >
                TOWERS
              </button>
              <button
                className={sidebarTab === "upgrades" ? "active" : ""}
                onClick={() => {
                  cancelTowerPlacement();
                  setSelectedPad(null);
                  setSidebarTab("upgrades");
                }}
              >
                UPGRADES
              </button>
              <button
                className={sidebarTab === "archive" ? "active" : ""}
                onClick={() => {
                  cancelTowerPlacement();
                  setSelectedPad(null);
                  setSidebarTab("archive");
                }}
              >
                ARCHIVE
              </button>
            </div>
            {sidebarTab === "towers" &&
              selectedPad === null &&
              !placingTower && (
                <div className="sb-control-view">
                  <p>
                    Choose a tower, then drag it directly onto any clear ground
                    outside the enemy route.
                  </p>
                  {(Object.keys(TOWER_DATA) as TowerKind[]).map((k) => {
                    const d = TOWER_DATA[k],
                      cost = towerCost(k, snap.doctrine, snap.doctrineLevel);
                    return (
                      <button
                        key={k}
                        className="sb-tower"
                        onClick={() => startTowerPlacement(k)}
                        disabled={
                          snap.phase !== "playing" || snap.energy < cost
                        }
                      >
                        <i style={{ background: d.color }} />
                        <span>
                          <b>{d.name}</b>
                          <small>
                            {k === "rail"
                              ? "Heavy single target"
                              : k === "arc"
                                ? "Chains nearby targets"
                                : k === "cryo"
                                  ? "Chance to slow targets"
                                  : "Generates scrap automatically"}
                          </small>
                        </span>
                        <strong>{cost}⚡</strong>
                      </button>
                    );
                  })}
                  <small>
                    {snap.towers.length} TOWER
                    {snap.towers.length === 1 ? "" : "S"} DEPLOYED
                  </small>
                </div>
              )}
            {sidebarTab === "towers" && placingTower && (
              <div className="sb-control-view sb-placement-view">
                <p>
                  Move onto the battlefield, then press and drag the tower to a
                  clear location. Red areas are blocked.
                </p>
                <div
                  className="sb-placement-icon"
                  style={{
                    borderColor: TOWER_DATA[placingTower].color,
                    color: TOWER_DATA[placingTower].color,
                  }}
                >
                  +
                </div>
                <b>PLACING {TOWER_DATA[placingTower].name.toUpperCase()}</b>
                <small>
                  {towerCost(placingTower, snap.doctrine, snap.doctrineLevel)} ENERGY
                </small>
                <button className="sb-cancel" onClick={cancelTowerPlacement}>
                  CANCEL PLACEMENT
                </button>
              </div>
            )}
            {sidebarTab === "towers" && tower && (
              <TowerStats
                tower={tower}
                upgradeCost={upgradeCost}
                scrap={snap.scrap}
                onUpgrade={upgrade}
                onSell={sell}
                onClose={() => setSelectedPad(null)}
                onTarget={setTarget}
                onEvolve={evolve}
                doctrine={snap.doctrine}
                doctrineLevel={snap.doctrineLevel}
              />
            )}
            {sidebarTab === "upgrades" && (
              <div className="sb-control-view sb-upgrades-view">
                <p>Upgrades and abilities last for the current defense run.</p>
                {snap.threatPending && (
                  <div className="sb-threat">
                    <b>CHOOSE A THREAT · +BONUS SCRAP</b>
                    {["Rapid host", "Armored host", "Hot generator"]
                      .filter((x) => !snap.threat.split(", ").includes(x))
                      .map(
                      (x) => (
                        <button
                          key={x}
                          onClick={() => chooseThreat(x)}
                        >
                          {x} ·{" "}
                          {x === "Rapid host"
                            ? "+18% speed"
                            : x === "Armored host"
                              ? "+25% health"
                              : "+5 heat/click"}
                        </button>
                      ),
                    )}
                  </div>
                )}
                <div className="sb-upgrade-group">
                  <div className="sb-group-title">
                    <span>⚡</span>
                    <div>
                      <b>ECONOMY</b>
                      <small>Earn and hold more resources</small>
                    </div>
                  </div>
                  <div className="sb-general">
                  <button
                    onClick={upgradeStorage}
                    disabled={
                      snap.phase !== "playing" ||
                      snap.scrap < storageUpgradeCost(snap.storageLevel)
                    }
                  >
                    <span>
                      <b>Energy capacity · LV {snap.storageLevel}</b>
                      <small>
                        {energyCapacity(snap.storageLevel)} →{" "}
                        {energyCapacity(snap.storageLevel + 1)} capacity
                      </small>
                    </span>
                    <strong>
                      {storageUpgradeCost(snap.storageLevel)} SCRAP
                    </strong>
                  </button>
                  <button
                    onClick={upgradeGenerator}
                    disabled={
                      snap.phase !== "playing" ||
                      snap.scrap < generatorUpgradeCost(snap.generatorLevel)
                    }
                  >
                    <span>
                      <b>Energy income · LV {snap.generatorLevel}</b>
                      <small>Clicks +1 · Passive +0.6/s</small>
                    </span>
                    <strong>
                      {generatorUpgradeCost(snap.generatorLevel)} SCRAP
                    </strong>
                  </button>
                  <button
                    onClick={upgradeExtraction}
                    disabled={
                      snap.phase !== "playing" ||
                      snap.energy < extractionUpgradeCost(snap.extractionLevel)
                    }
                  >
                    <span>
                      <b>Kill rewards · LV {snap.extractionLevel}</b>
                      <small>Enemies drop +18% scrap</small>
                    </span>
                    <strong>
                      {extractionUpgradeCost(snap.extractionLevel)} ENERGY
                    </strong>
                  </button>
                  </div>
                </div>
                <div className="sb-upgrade-group">
                  <div className="sb-group-title">
                    <span>⌖</span>
                    <div>
                      <b>OFFENSE</b>
                      <small>Improve manual attacks</small>
                    </div>
                  </div>
                  <div className="sb-general">
                    <button
                    onClick={upgradeClickDamage}
                    disabled={
                      snap.phase !== "playing" ||
                      snap.scrap < clickUpgradeCost(snap.clickLevel)
                    }
                  >
                    <span>
                      <b>Click shot · LV {snap.clickLevel}</b>
                      <small>
                        {Math.round(clickDamage(snap.clickLevel, snap.wave))} →{" "}
                        {Math.round(
                          clickDamage(snap.clickLevel + 1, snap.wave),
                        )}
                      </small>
                    </span>
                    <strong>{clickUpgradeCost(snap.clickLevel)} SCRAP</strong>
                  </button>
                  </div>
                </div>
                <div className="sb-upgrade-group">
                  <div className="sb-group-title">
                    <span>◆</span>
                    <div>
                      <b>CORE DEFENSE</b>
                      <small>Survive leaks and recover</small>
                    </div>
                  </div>
                  <div className="sb-general">
                  <button
                    onClick={upgradeCore}
                    disabled={
                      snap.phase !== "playing" ||
                      snap.scrap < coreUpgradeCost(snap.coreLevel)
                    }
                  >
                    <span>
                      <b>Integrity · LV {snap.coreLevel}</b>
                      <small>Heal 5 · Maximum +5</small>
                    </span>
                    <strong>{coreUpgradeCost(snap.coreLevel)} SCRAP</strong>
                  </button>
                  <button
                    onClick={upgradeShield}
                    disabled={
                      snap.phase !== "playing" ||
                      snap.energy < shieldUpgradeCost(snap.shieldLevel)
                    }
                  >
                    <span>
                      <b>Shield · LV {snap.shieldLevel}</b>
                      <small>Blocks leaks · Recharges each wave</small>
                    </span>
                    <strong>
                      {shieldUpgradeCost(snap.shieldLevel)} ENERGY
                    </strong>
                  </button>
                  </div>
                </div>
                <div className="sb-upgrade-group">
                  <div className="sb-group-title">
                    <span>✦</span>
                    <div>
                      <b>CORE SYSTEMS</b>
                      <small>Automatic emergency responses</small>
                    </div>
                  </div>
                  <div className="sb-general">
                  {(["pulse", "emergency", "revival"] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => upgradeCoreSpecial(kind)}
                      disabled={
                        snap.phase !== "playing" ||
                        snap.scrap <
                          (kind === "revival"
                            ? 600
                            : Math.floor(
                                180 *
                                  Math.pow(
                                    1.8,
                                    kind === "pulse"
                                      ? snap.pulseLevel
                                      : snap.emergencyLevel,
                                  ),
                              )) ||
                        (kind === "revival" &&
                          (snap.revival || game.current.revivalUsed))
                      }
                    >
                      <span>
                        <b>
                          {kind === "pulse"
                            ? `Damage pulse · LV ${snap.pulseLevel}`
                            : kind === "emergency"
                              ? `Leak overcharge · LV ${snap.emergencyLevel}`
                              : "One-time revival"}
                        </b>
                        <small>
                          {kind === "pulse"
                            ? "Core hit → damage every enemy"
                            : kind === "emergency"
                              ? "Core hit → temporary tower boost"
                              : "Fatal hit → restore 50% integrity"}
                        </small>
                      </span>
                      <strong>
                        {kind === "revival"
                          ? 600
                          : Math.floor(
                              180 *
                                Math.pow(
                                  1.8,
                                  kind === "pulse"
                                    ? snap.pulseLevel
                                    : snap.emergencyLevel,
                                ),
                            )}{" "}
                        SCRAP
                      </strong>
                    </button>
                  ))}
                  </div>
                </div>
                <div className="sb-group-title sb-ability-title">
                  <span>▶</span>
                  <div>
                    <b>ACTIVE ABILITIES</b>
                    <small>Tap to activate · Recharge over time</small>
                  </div>
                </div>
                <div className="sb-abilities">
                  {(
                    [
                      ["overcharge", "OVERCHARGE"],
                      ["emp", "EMP"],
                      ["strike", "ORBITAL"],
                      ["repair", "REPAIR"],
                      ["magnet", "SCRAP MAGNET"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      title={
                        {
                          overcharge:
                            "1.8× tower speed and 1.5× generator clicks for 8 seconds",
                          emp: "Stun all enemies for 2.5 seconds",
                          strike:
                            "Click a location to strike a 130-unit radius",
                          repair: "Restore 5 core integrity",
                          magnet: "Double enemy scrap for 10 seconds",
                        }[k]
                      }
                      onClick={() => ability(k)}
                      disabled={
                        snap.phase !== "playing" || snap.cooldowns[k] > 0
                      }
                    >
                      <b>{label}</b>
                      <span>
                        {{
                          overcharge: "Faster towers",
                          emp: "Freeze all",
                          strike: "Area damage",
                          repair: "Heal 5 core",
                          magnet: "2× kill scrap",
                        }[k]}
                      </span>
                      <small>
                        {snap.cooldowns[k] > 0
                          ? `${Math.ceil(snap.cooldowns[k])}s`
                          : "READY"}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sidebarTab === "archive" && (
              <div className="sb-control-view sb-archive">
                <div className="sb-core-bank">
                  <small>PERMANENT CURRENCY</small>
                  <strong>{meta.cores} DATA CORES</strong>
                  <span>
                    COMMANDER LEVEL {playerLevel(meta)} · Earn 1 per 5 waves and
                    2 per boss.
                  </span>
                </div>
                <p>
                  Research up to five levels per doctrine. Equip one before a
                  run; every strength includes a tradeoff.
                </p>
                {(Object.keys(DOCTRINES) as DoctrineId[]).map((id) => {
                  const doctrine = DOCTRINES[id],
                    level = meta.research[id],
                    equipped = meta.equipped === id;
                  return (
                    <button
                      key={id}
                      className={`sb-doctrine ${equipped ? "active" : ""}`}
                      disabled={
                        snap.phase === "playing" ||
                        (level >= 5 || meta.cores < researchCost(level))
                      }
                      onClick={() => unlockDoctrine(id)}
                    >
                      <span>
                        <b>{doctrine.name} · LV {level}/5</b>
                        <small>{doctrine.effect}</small>
                      </span>
                      <strong>
                        {level >= 5 ? "MAX" : `${researchCost(level)} CORES`}
                      </strong>
                    </button>
                  );
                })}
                <div className="sb-doctrine-equip">
                  <small>EQUIPPED DOCTRINE</small>
                  <select
                    aria-label="Equipped doctrine"
                    disabled={snap.phase === "playing"}
                    value={meta.equipped || ""}
                    onChange={(event) =>
                      equipDoctrine((event.target.value || null) as DoctrineId | null)
                    }
                  >
                    <option value="">None</option>
                    {(Object.keys(DOCTRINES) as DoctrineId[])
                      .filter((id) => meta.research[id] > 0)
                      .map((id) => (
                        <option key={id} value={id}>
                          {DOCTRINES[id].name} · LV {meta.research[id]}
                        </option>
                      ))}
                  </select>
                </div>
                {snap.phase === "playing" && (
                  <small>Doctrine loadout is locked until this run ends.</small>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
      <section className="sb-lower">
        <article>
          <p>FIELD MANUAL</p>
          <h2>Stay active. Build smart.</h2>
          <div className="sb-manual">
            <span>
              <b>01</b>Click the battlefield generator to produce energy for
              your defenses.
            </span>
            <span>
              <b>02</b>Choose a tower and drag it directly onto any clear ground
              to build.
            </span>
            <span>
              <b>03</b>Boss signals arrive every 10 waves and cost 5 core
              integrity.
            </span>
            <details className="sb-guide">
              <summary>Enemy guide &amp; combat tips</summary>
              <p>
                Runners move fast; swarms arrive in groups. Juggernauts reduce
                damage by 38%. Regenerators heal after 1.5 seconds without
                taking damage.
              </p>
              <p>
                Disruptors periodically disable nearby towers. Shield drones
                protect neighbors. Phase enemies become untargetable for one
                second out of every three.
              </p>
              <p>
                At level five, select a permanent tower evolution. Change
                targeting to focus bosses, clear weaker enemies, or spread Cryo
                slows.
              </p>
              <p>
                Keep generator clicks steady to build a combo. Combo 10 and 20
                grant charged clicks; critical clicks give triple energy.
                Overheating locks clicks until heat cools to 40%.
              </p>
              <p>
                Use abilities in Upgrades: EMP stuns, Orbital targets an area,
                Repair restores integrity, and Scrap Magnet doubles kill
                rewards. Overcharge boosts towers and generator clicks.
              </p>
              <p>
                Threat choices never pause waves. Scores count fully completed
                waves; upgrades reset on a new run. Right-click cancels
                placement or an aimed strike.
              </p>
            </details>
          </div>
        </article>
        <article className="sb-board">
          <p>
            {isSupabaseConfigured ? "GLOBAL TRANSMISSIONS" : "DEVICE RECORDS"} ·
            RULESET 2
          </p>
          <h2>Top defenders</h2>
          {scores.length ? (
            ol(
              scores.map((s, i) => (
                <li key={s.id}>
                  <b className="sb-rank">#{i + 1}</b>
                  <div className="sb-player">
                    <span>{s.name}</span>
                    <small>COMMANDER LV {s.player_level || 0}</small>
                  </div>
                  <strong>WAVE {s.waves}</strong>
                  <div className="sb-score-metrics">
                    <span><b>{s.enemies_defeated}</b> KILLS</span>
                    <span><b>{s.bosses_defeated || 0}</b> BOSSES</span>
                    <span><b>{formatDuration(s.run_seconds)}</b> TIME</span>
                    <span>
                      <b>
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Unknown"}
                      </b>{" "}
                      DATE
                    </span>
                  </div>
                  <small className="sb-score-modifiers">
                    {s.modifiers?.join(" · ") || "Standard run · No modifiers"}
                  </small>
                </li>
              )),
            )
          ) : (
            <div className="sb-empty">
              No signals recorded yet. Be the first.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function ol(children: React.ReactNode) {
  return <ol>{children}</ol>;
}

function TowerStats({
  tower,
  upgradeCost,
  scrap,
  onUpgrade,
  onSell,
  onClose,
  onTarget,
  onEvolve,
  doctrine,
  doctrineLevel,
}: {
  tower: Tower;
  upgradeCost: number;
  scrap: number;
  onUpgrade: () => void;
  onSell: () => void;
  onClose: () => void;
  onTarget: (target: TargetMode) => void;
  onEvolve: (evolution: Evolution) => void;
  doctrine: DoctrineId | null;
  doctrineLevel: number;
}) {
  const data = TOWER_DATA[tower.kind],
    levelScale = 1 + (tower.level - 1) * 0.72,
    range = towerRange(tower, doctrine, doctrineLevel),
    isMiner = tower.kind === "miner";
  const evolution = EVOLUTIONS[tower.kind];
  return (
    <div className="sb-control-view sb-stats">
      <div className="sb-stats-title">
        <i style={{ background: data.color }} />
        <div>
          <small>SELECTED TOWER · LEVEL {tower.level}</small>
          <h3>{data.name}</h3>
        </div>
      </div>
      <dl>
        {isMiner ? (
          <>
            <div>
              <dt>SCRAP RATE</dt>
              <dd>
                {(
                  minerRate(tower.level) *
                  (tower.evolution === "recycler" ? 1.8 : 1) *
                  (doctrine === "deepBore" ? 1 + doctrineLevel * 0.07 : 1)
                ).toFixed(2)}
                /s
              </dd>
            </div>
            <div>
              <dt>NEXT LEVEL</dt>
              <dd>
                {(
                  minerRate(tower.level + 1) *
                  (tower.evolution === "recycler" ? 1.8 : 1) *
                  (doctrine === "deepBore" ? 1 + doctrineLevel * 0.07 : 1)
                ).toFixed(2)}
                /s
              </dd>
            </div>
            <div>
              <dt>ATTACK</dt>
              <dd>NONE</dd>
            </div>
            <div>
              <dt>SPECIAL</dt>
              <dd>
                {tower.evolution === "salvager"
                  ? "+25% KILLS · 150R"
                  : tower.evolution?.toUpperCase() || "AUTO EXTRACT"}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>DAMAGE</dt>
              <dd>
                {Math.round(
                  data.damage *
                    levelScale *
                    (tower.kind === "arc" && doctrine === "relay"
                      ? 1 - doctrineLevel * 0.03
                      : 1) *
                    (tower.kind === "cryo" && doctrine === "permafrost"
                      ? 1 - doctrineLevel * 0.04
                      : 1) *
                    (tower.evolution === "overload" ? 1.65 : 1),
                )}
              </dd>
            </div>
            <div>
              <dt>RANGE</dt>
              <dd>
                {Math.round(range)} / {towerRangeCap(tower.kind)}
              </dd>
            </div>
            <div>
              <dt>FIRE DELAY</dt>
              <dd>
                {(
                  data.rate *
                  Math.pow(0.94, tower.level - 1) *
                  (tower.kind === "rail" && doctrine === "longshot"
                    ? 1 + doctrineLevel * 0.03
                    : 1)
                ).toFixed(2)}s
              </dd>
            </div>
            <div>
              <dt>SPECIAL</dt>
              <dd>
                {tower.evolution?.toUpperCase() ||
                  (tower.kind === "rail"
                    ? "Armor punch"
                    : tower.kind === "arc"
                      ? "Chain ×2"
                      : `${Math.round(
                          Math.min(
                            0.95,
                            cryoChance(tower.level) +
                              (doctrine === "permafrost"
                                ? doctrineLevel * 0.04
                                : 0),
                          ) * 100,
                        )}% slow`)}
              </dd>
            </div>
          </>
        )}
      </dl>
      {!isMiner && (
        <label className="sb-target-control">
          <span>
            <small>COMBAT DIRECTIVE</small>
            <b>{TARGET_HINTS[tower.target]}</b>
          </span>
          <span className="sb-select-wrap">
            <select
              className="sb-target"
              aria-label="Tower targeting"
              value={tower.target}
              onChange={(e) => onTarget(e.target.value as TargetMode)}
            >
              <option value="first">First</option>
              <option value="last">Last</option>
              <option value="strongest">Strongest</option>
              <option value="weakest">Weakest</option>
              <option value="closest">Closest</option>
              <option value="unslowed">Unslowed</option>
            </select>
          </span>
        </label>
      )}
      {tower.level >= 5 && !tower.evolution && (
        <div className="sb-evolve">
          <small>CHOOSE EVOLUTION</small>
          <button onClick={() => onEvolve(evolution[0])}>
            <b>{evolution[0].toUpperCase()}</b>
            {evolution[1]}
          </button>
          <button onClick={() => onEvolve(evolution[2])}>
            <b>{evolution[2].toUpperCase()}</b>
            {evolution[3]}
          </button>
        </div>
      )}
      <button
        className="sb-upgrade"
        onClick={onUpgrade}
        disabled={scrap < upgradeCost}
      >
        UPGRADE TO LV {tower.level + 1}
        <span>{upgradeCost} SCRAP</span>
      </button>
      <button className="sb-sell" onClick={onSell}>
        SELL TOWER ·{" "}
        {Math.floor(towerCost(tower.kind, doctrine, doctrineLevel) * 0.6)} ENERGY
      </button>
      <button className="sb-back" onClick={onClose}>
        BACK TO GRID
      </button>
    </div>
  );
}
