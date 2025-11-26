"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import CraftshorePhaserGame from "../components/CraftshorePhaserGame";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthMode = "login" | "signup";

type Skill = {
  name: string;
  level: number;
  xp: number;
};

type TroopState = {
  militia: number;
  archer: number;
  knight: number;
};

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
  skills: Skill[];
  troops: TroopState;
};

const DEFAULT_TOWN_STATE: TownState = {
  townName: "Frontier Haven",
  playerName: "Pioneer_001",
  resources: {
    wood: 120,
    stone: 80,
    ore: 35,
    food: 50,
    gold: 10,
  },
  buildings: [
    { id: "b_mine_1", type: "mine", gridX: 5 },
    { id: "b_farm_1", type: "farm", gridX: 9 },
    { id: "b_logging_1", type: "logging_camp", gridX: 13 },
    { id: "b_barracks_1", type: "barracks", gridX: 18 },
    { id: "b_market_1", type: "market", gridX: 22 },
  ],
  grid: {
    tileSize: 64,
    widthInTiles: 40,
    groundY: 520,
  },
  skills: [
    { name: "Mining", level: 1, xp: 0 },
    { name: "Woodcutting", level: 1, xp: 0 },
    { name: "Farming", level: 1, xp: 0 },
    { name: "Hunting", level: 1, xp: 0 },
    { name: "Smelting", level: 1, xp: 0 },
    { name: "Smithing", level: 1, xp: 0 },
    { name: "Carpentry", level: 1, xp: 0 },
    { name: "Leatherworking", level: 1, xp: 0 },
    { name: "Cooking", level: 1, xp: 0 },
    // Building-skill for barracks progression
    { name: "Barracks", level: 1, xp: 0 },
  ],
  troops: {
    militia: 0,
    archer: 0,
    knight: 0,
  },
};

type TroopId = keyof TroopState;

const TROOP_DEFS: Record<
  TroopId,
  {
    name: string;
    description: string;
    requiredBarracksLevel: number;
    cost: {
      wood: number;
      stone: number;
      ore: number;
      food: number;
      gold: number;
    };
    barracksXpGain: number;
  }
> = {
  militia: {
    name: "Militia",
    description: "Basic town guards. Cheap and quick to train.",
    requiredBarracksLevel: 1,
    cost: { wood: 10, stone: 0, ore: 0, food: 5, gold: 1 },
    barracksXpGain: 5,
  },
  archer: {
    name: "Archer",
    description: "Ranged units. Require a bit more training.",
    requiredBarracksLevel: 2,
    cost: { wood: 15, stone: 0, ore: 5, food: 8, gold: 2 },
    barracksXpGain: 8,
  },
  knight: {
    name: "Knight",
    description: "Elite cavalry. Expensive but powerful.",
    requiredBarracksLevel: 3,
    cost: { wood: 10, stone: 10, ore: 15, food: 12, gold: 5 },
    barracksXpGain: 12,
  },
};

export default function CraftshorePlayPage() {
  const currentYear = new Date().getFullYear();

  // ---------- Auth state ----------
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [signupVerificationInFlight, setSignupVerificationInFlight] =
    useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window");
      return;
    }

    const unsub = auth.onAuthStateChanged((user: any) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus(null);
    setAuthLoading(true);

    const modeAtStart = authMode;
    if (modeAtStart === "signup") {
      setSignupVerificationInFlight(true);
    }

    try {
      const w = window as any;
      const auth = w.auth;
      const db = w.db;
      const firebase = w.firebase;
      if (!auth) {
        setAuthError("Authentication is not ready. Try again in a moment.");
        return;
      }

      if (modeAtStart === "signup") {
        const rawDisplayName = authDisplayName.trim();
        if (!rawDisplayName) {
          setAuthError("Please enter a display name.");
          return;
        }
        const displayNameLower = rawDisplayName.toLowerCase();

        const cred = await auth.createUserWithEmailAndPassword(
          authEmail,
          authPassword
        );

        await cred.user.updateProfile({
          displayName: rawDisplayName,
        });

        if (db && firebase?.firestore) {
          await db
            .collection("users")
            .doc(cred.user.uid)
            .set(
              {
                displayName: rawDisplayName,
                displayNameLower,
                email: authEmail.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }

        try {
          await cred.user.sendEmailVerification();
          setAuthStatus(
            "Account created. Check your inbox and junk mail for the verification email before logging in."
          );
        } catch (err: any) {
          console.error("Error sending verification email on signup", err);
          const code = err?.code || "";
          if (code === "auth/too-many-requests") {
            setAuthError(
              "Account created, but we hit a temporary email limit. Wait a bit, then use 'Log in' and we'll try sending the verification again."
            );
          } else {
            setAuthError(
              "Account created, but we couldn’t send a verification email automatically. Try again later or contact the site owner."
            );
          }
        }

        await auth.signOut();
        setAuthPassword("");
      } else {
        const cred = await auth.signInWithEmailAndPassword(
          authEmail,
          authPassword
        );

        await cred.user.reload();

        if (!cred.user.emailVerified) {
          try {
            await cred.user.sendEmailVerification();
            setAuthError(
              "You need to verify your email before logging in. We just sent a verification link to your inbox."
            );
          } catch (err: any) {
            console.error("Error sending verification email on login", err);
            const code = err?.code || "";
            if (code === "auth/too-many-requests") {
              setAuthError(
                "You need to verify your email before logging in, and we’ve temporarily hit an email limit. Wait a bit and try again."
              );
            } else {
              setAuthError(
                "You need to verify your email before logging in, and we couldn’t send a new verification email automatically."
              );
            }
          }

          await auth.signOut();
          return;
        }

        setAuthStatus("Signed in successfully.");
        setAuthPassword("");
        setShowAuthForm(false);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      const code = err?.code || "";
      let msg =
        err?.message || "Something went wrong. Please check your details.";
      if (code === "auth/email-already-in-use") {
        msg = "That email is already in use. Try logging in instead.";
      } else if (code === "auth/invalid-email") {
        msg = "That email address doesn’t look valid.";
      } else if (code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (code === "permission-denied") {
        msg =
          "We couldn't finish creating your account because of a permissions issue. Please try again or contact the site owner.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
      if (modeAtStart === "signup") {
        setSignupVerificationInFlight(false);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      const w = window as any;
      const auth = w.auth;
      if (!auth) return;
      await auth.signOut();
      setAuthStatus("Signed out.");
      setShowAuthForm(false);
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  const headerUser = signupVerificationInFlight ? null : currentUser;
  const userLabel =
    headerUser?.displayName || headerUser?.email || "Pioneer";

  const stopKeyEvent = (e: any) => {
    e.stopPropagation();
  };

  // ---------- Town state (requires login) ----------
  const [town, setTown] = useState<TownState | null>(null);
  const [townLoading, setTownLoading] = useState(false);

  // Barracks UI state
  const [showBarracksPanel, setShowBarracksPanel] = useState(false);
  const [barracksMessage, setBarracksMessage] = useState<string | null>(
    null
  );
  const [barracksError, setBarracksError] = useState<string | null>(null);

  function xpNeededForNextLevel(level: number) {
    return level * 25;
  }

  function ensureBarracksSkill(skills: Skill[]): Skill[] {
    const exists = skills.some((s) => s.name === "Barracks");
    if (exists) return skills;
    return [...skills, { name: "Barracks", level: 1, xp: 0 }];
  }

  useEffect(() => {
    if (!authReady) return;

    if (!headerUser) {
      setTown(null);
      setTownLoading(false);
      return;
    }

    if (typeof window === "undefined") return;

    const uid = headerUser.uid;
    let cancelled = false;

    async function loadTown() {
      setTownLoading(true);
      try {
        const w = window as any;
        const db = w.db;
        if (!db) {
          console.warn("Firestore not available on window");
          if (!cancelled) setTown(DEFAULT_TOWN_STATE);
          return;
        }

        const ref = db.collection("craftshore_towns").doc(uid);
        const snap = await ref.get();

        if (!snap.exists) {
          await ref.set(DEFAULT_TOWN_STATE);
          if (!cancelled) setTown(DEFAULT_TOWN_STATE);
        } else {
          const raw = snap.data() || {};
          const merged: TownState = {
            ...DEFAULT_TOWN_STATE,
            ...(raw as Partial<TownState>),
            resources: {
              ...DEFAULT_TOWN_STATE.resources,
              ...(raw as any).resources,
            },
            grid: {
              ...DEFAULT_TOWN_STATE.grid,
              ...(raw as any).grid,
            },
            buildings:
              (raw as any).buildings || DEFAULT_TOWN_STATE.buildings,
            skills: ensureBarracksSkill(
              (raw as any).skills || DEFAULT_TOWN_STATE.skills
            ),
            troops: {
              ...DEFAULT_TOWN_STATE.troops,
              ...(raw as any).troops,
            },
          };

          if (!cancelled) setTown(merged);
        }
      } catch (err) {
        console.error("Failed to load Craftshore town:", err);
        if (!cancelled) setTown(DEFAULT_TOWN_STATE);
      } finally {
        if (!cancelled) setTownLoading(false);
      }
    }

    void loadTown();

    return () => {
      cancelled = true;
    };
  }, [authReady, headerUser]);

  // ---------- Skill helpers & persistence ----------

  function addSkillXp(
    skills: Skill[],
    skillName: string,
    xpGain: number
  ): Skill[] {
    return skills.map((skill) => {
      if (skill.name !== skillName) return skill;

      let { level, xp } = skill;
      xp += xpGain;

      while (xp >= xpNeededForNextLevel(level)) {
        xp -= xpNeededForNextLevel(level);
        level += 1;
      }

      return { ...skill, level, xp };
    });
  }

  async function persistTownSlice(
    resources: TownState["resources"],
    skills: TownState["skills"],
    troops: TownState["troops"]
  ) {
    if (!headerUser) return;
    if (typeof window === "undefined") return;

    const uid = headerUser.uid;

    try {
      const w = window as any;
      const db = w.db;
      if (!db) return;
      await db
        .collection("craftshore_towns")
        .doc(uid)
        .set({ resources, skills, troops }, { merge: true });
    } catch (err) {
      console.error("Failed to persist Craftshore state:", err);
    }
  }

  const handleMine = useCallback(() => {
    setTown((prev) => {
      if (!prev) return prev;
      const next: TownState = {
        ...prev,
        resources: {
          ...prev.resources,
          ore: prev.resources.ore + 1,
        },
        skills: addSkillXp(prev.skills, "Mining", 5),
      };
      void persistTownSlice(next.resources, next.skills, next.troops);
      return next;
    });
  }, [headerUser]);

  const handleFarm = useCallback(() => {
    setTown((prev) => {
      if (!prev) return prev;
      const next: TownState = {
        ...prev,
        resources: {
          ...prev.resources,
          food: prev.resources.food + 1,
        },
        skills: addSkillXp(prev.skills, "Farming", 5),
      };
      void persistTownSlice(next.resources, next.skills, next.troops);
      return next;
    });
  }, [headerUser]);

  const handleChopWood = useCallback(() => {
    setTown((prev) => {
      if (!prev) return prev;
      const next: TownState = {
        ...prev,
        resources: {
          ...prev.resources,
          wood: prev.resources.wood + 1,
        },
        skills: addSkillXp(prev.skills, "Woodcutting", 5),
      };
      void persistTownSlice(next.resources, next.skills, next.troops);
      return next;
    });
  }, [headerUser]);

  const handleBarracksInteract = useCallback(() => {
    setShowBarracksPanel(true);
    setBarracksError(null);
    setBarracksMessage(null);
  }, []);

  const handleTrainTroop = useCallback(
    (troopId: TroopId) => {
      setBarracksError(null);
      setBarracksMessage(null);

      setTown((prev) => {
        if (!prev) {
          setBarracksError("Town not loaded yet.");
          return prev;
        }

        const skillsWithBarracks = ensureBarracksSkill(prev.skills);
        const barracksSkill =
          skillsWithBarracks.find((s) => s.name === "Barracks") ??
          { name: "Barracks", level: 1, xp: 0 };

        const def = TROOP_DEFS[troopId];

        if (barracksSkill.level < def.requiredBarracksLevel) {
          setBarracksError(
            `Requires Barracks level ${def.requiredBarracksLevel}.`
          );
          return prev;
        }

        const { cost } = def;
        const r = prev.resources;

        const canAfford =
          r.wood >= cost.wood &&
          r.stone >= cost.stone &&
          r.ore >= cost.ore &&
          r.food >= cost.food &&
          r.gold >= cost.gold;

        if (!canAfford) {
          setBarracksError("Not enough resources to train that troop.");
          return prev;
        }

        const newResources = {
          wood: r.wood - cost.wood,
          stone: r.stone - cost.stone,
          ore: r.ore - cost.ore,
          food: r.food - cost.food,
          gold: r.gold - cost.gold,
        };

        const updatedSkills = addSkillXp(
          skillsWithBarracks,
          "Barracks",
          def.barracksXpGain
        );

        const newTroops: TroopState = {
          ...prev.troops,
          [troopId]: prev.troops[troopId] + 1,
        };

        const next: TownState = {
          ...prev,
          resources: newResources,
          skills: updatedSkills,
          troops: newTroops,
        };

        void persistTownSlice(
          next.resources,
          next.skills,
          next.troops
        );
        setBarracksMessage(`Trained 1 ${def.name}.`);
        setBarracksError(null);
        return next;
      });
    },
    [headerUser]
  );

  const mustLogin = authReady && !headerUser;

  const currentBarracksLevel =
    town?.skills.find((s) => s.name === "Barracks")?.level ?? 1;
  const currentBarracksXp =
    town?.skills.find((s) => s.name === "Barracks")?.xp ?? 0;
  const currentBarracksNextXp =
    xpNeededForNextLevel(currentBarracksLevel) || 1;

  // helper for skill chip bar fill
  const getSkillProgress = (skill: Skill) => {
    const needed = xpNeededForNextLevel(skill.level) || 1;
    return Math.max(0, Math.min(1, skill.xp / needed));
  };

  return (
    <>
      {/* --- Firebase scripts --- */}
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        id="firebase-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          const firebaseConfig = {
            apiKey: "AIzaSyAteayH-i26BMMYrTHecwlJF1S4DKmDPXI",
            authDomain: "wwiii-game-af0e7.firebaseapp.com",
            projectId: "wwiii-game-af0e7",
            storageBucket: "wwiii-game-af0e7.appspot.com",
            messagingSenderId: "906432978784",
            appId: "1:906432978784:web:433e23330bef1e6a3ac805"
          };

          if (!window.firebase?.apps?.length) {
            window.firebase.initializeApp(firebaseConfig);
          }
          window.db = window.firebase.firestore();
          window.auth = window.firebase.auth();
        `,
        }}
      />

      <main className="site">
        {/* Shared header */}
        <SiteHeader
          authReady={authReady}
          user={headerUser}
          userLabel={userLabel}
          onOpenAuth={() => {
            setShowAuthForm(true);
            setAuthMode("signup");
            setAuthError(null);
            setAuthStatus(null);
          }}
          onSignOut={handleSignOut}
        />

        {/* Craftshore content */}
        <section className="panel-section craftshore-panel">
          <div className="tabs-shell craftshore-shell">
            <header className="home-section-header">
              <span className="home-section-pill">Craftshore</span>
              <div>
                <h2>Build your 2D pioneer town</h2>
                <p>
                  Walk around your land, mine ore, farm food, chop wood,
                  train troops, and level skills. More buildings and systems
                  will come over time.
                </p>
              </div>
            </header>

            {/* Require login */}
            {mustLogin && (
              <div className="craftshore-locked">
                <p>
                  You need an account to play Craftshore and save your town
                  progress.
                </p>
                <button
                  type="button"
                  className="account-btn primary"
                  onClick={() => {
                    setShowAuthForm(true);
                    setAuthMode("signup");
                    setAuthError(null);
                    setAuthStatus(null);
                  }}
                >
                  Log in or sign up to play
                </button>
              </div>
            )}

            {!mustLogin && (
              <>
                {/* HUD */}
                <section className="craftshore-hud">
                  {townLoading && (
                    <div className="text-sm text-slate-300">
                      Loading your town…
                    </div>
                  )}
                  {town && (
                    <>
                      {/* Resources row */}
                      <div className="craftshore-resources">
                        <div className="resource-chip">
                          <span className="dot dot-wood" />
                          Wood:{" "}
                          <span className="value">
                            {town.resources.wood}
                          </span>
                        </div>
                        <div className="resource-chip">
                          <span className="dot dot-stone" />
                          Stone:{" "}
                          <span className="value">
                            {town.resources.stone}
                          </span>
                        </div>
                        <div className="resource-chip">
                          <span className="dot dot-ore" />
                          Ore:{" "}
                          <span className="value">
                            {town.resources.ore}
                          </span>
                        </div>
                        <div className="resource-chip">
                          <span className="dot dot-food" />
                          Food:{" "}
                          <span className="value">
                            {town.resources.food}
                          </span>
                        </div>
                        <div className="resource-chip">
                          <span className="dot dot-gold" />
                          Gold:{" "}
                          <span className="value">
                            {town.resources.gold}
                          </span>
                        </div>
                      </div>

                      {/* Troops row */}
                      <div className="craftshore-troops">
                        <div className="troop-chip">
                          <span className="troop-name">Militia</span>
                          <span className="troop-count">
                            {town.troops.militia}
                          </span>
                        </div>
                        <div className="troop-chip">
                          <span className="troop-name">Archers</span>
                          <span className="troop-count">
                            {town.troops.archer}
                          </span>
                        </div>
                        <div className="troop-chip">
                          <span className="troop-name">Knights</span>
                          <span className="troop-count">
                            {town.troops.knight}
                          </span>
                        </div>
                      </div>

                      {/* Skills row (progress pills) */}
                      <div className="craftshore-skills">
                        {town.skills.map((skill) => {
                          const progress = getSkillProgress(skill);
                          return (
                            <div
                              key={skill.name}
                              className="skill-chip"
                            >
                              <div
                                className="skill-chip-fill"
                                style={{
                                  width: `${progress * 100}%`,
                                }}
                              />
                              <div className="skill-chip-label">
                                <span className="skill-name">
                                  {skill.name}
                                </span>
                                <span className="skill-level">
                                  Lv {skill.level}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </section>

                {/* Barracks panel (opens when you press E at barracks) */}
                {town && showBarracksPanel && (
                  <section className="barracks-panel">
                    <div className="barracks-header">
                      <div>
                        <h3>Barracks</h3>
                        <p>
                          Train troops to defend your town and earn
                          Barracks XP. Stand near the barracks and press
                          <strong> E</strong> to open/close this panel.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="barracks-close-btn"
                        onClick={() => setShowBarracksPanel(false)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="barracks-meta">
                      <span>
                        Barracks level{" "}
                        <strong>{currentBarracksLevel}</strong>
                      </span>
                      <span>
                        XP {currentBarracksXp} / {currentBarracksNextXp}
                      </span>
                      <span>
                        Troops: Militia {town.troops.militia} · Archers{" "}
                        {town.troops.archer} · Knights{" "}
                        {town.troops.knight}
                      </span>
                    </div>

                    <div className="troop-grid">
                      {(Object.keys(TROOP_DEFS) as TroopId[]).map(
                        (id) => {
                          const def = TROOP_DEFS[id];
                          const unlocked =
                            currentBarracksLevel >=
                            def.requiredBarracksLevel;

                          return (
                            <div
                              key={id}
                              className={
                                "troop-card" +
                                (unlocked ? "" : " troop-locked")
                              }
                            >
                              <div className="troop-card-header">
                                <h4>{def.name}</h4>
                                <span className="troop-count">
                                  Owned: {town.troops[id]}
                                </span>
                              </div>
                              <p className="troop-desc">
                                {def.description}
                              </p>
                              <div className="troop-cost-row">
                                <span>Cost:</span>
                                <span>
                                  {def.cost.wood}W · {def.cost.stone}
                                  S · {def.cost.ore}O · {def.cost.food}
                                  F · {def.cost.gold}G
                                </span>
                              </div>
                              <div className="troop-meta-row">
                                <span>
                                  Requires Barracks Lv{" "}
                                  {def.requiredBarracksLevel}
                                </span>
                                <span>+{def.barracksXpGain} Barracks XP</span>
                              </div>
                              <button
                                type="button"
                                className="account-btn primary troop-train-btn"
                                disabled={!unlocked}
                                onClick={() => handleTrainTroop(id)}
                              >
                                {unlocked
                                  ? `Train 1 ${def.name}`
                                  : "Locked"}
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {barracksError && (
                      <div className="barracks-msg barracks-error">
                        {barracksError}
                      </div>
                    )}
                    {barracksMessage && (
                      <div className="barracks-msg barracks-status">
                        {barracksMessage}
                      </div>
                    )}
                  </section>
                )}

                {/* Game canvas */}
                <section className="craftshore-game-shell">
                  {town ? (
                    <CraftshorePhaserGame
                      gridWidthInTiles={town.grid.widthInTiles}
                      tileSize={town.grid.tileSize}
                      groundY={town.grid.groundY}
                      buildings={town.buildings}
                      onMine={handleMine}
                      onFarm={handleFarm}
                      onChopWood={handleChopWood}
                      onBarracksInteract={handleBarracksInteract}
                    />
                  ) : (
                    !townLoading && (
                      <div className="text-sm text-red-400">
                        Failed to load town state. Check console for
                        errors.
                      </div>
                    )
                  )}
                </section>
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer">
          <span>© {currentYear} AsiantheJason</span>

          <nav className="site-footer-links">
            <Link href="/about" className="site-footer-link">
              About
            </Link>
            <Link href="/privacy-policy" className="site-footer-link">
              Privacy Policy
            </Link>
            <Link href="/terms" className="site-footer-link">
              Terms
            </Link>
            <Link href="/contact" className="site-footer-link">
              Contact
            </Link>
          </nav>
        </footer>
      </main>

      {/* Auth modal */}
      {authReady && showAuthForm && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <div>
                <div className="auth-modal-title">
                  Play & save your town
                </div>
                <div className="auth-modal-subtitle">
                  Log in or sign up to keep your Craftshore progress and
                  towns tied to your account.
                </div>
              </div>
              <button
                type="button"
                className="auth-close-btn"
                onClick={() => setShowAuthForm(false)}
              >
                ×
              </button>
            </div>

            <div className="auth-toggle">
              <button
                type="button"
                className={
                  "auth-toggle-btn" +
                  (authMode === "login" ? " auth-toggle-btn-active" : "")
                }
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                  setAuthStatus(null);
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={
                  "auth-toggle-btn" +
                  (authMode === "signup" ? " auth-toggle-btn-active" : "")
                }
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError(null);
                  setAuthStatus(null);
                }}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-fields">
              {authMode === "signup" && (
                <div className="auth-field">
                  <label>Display name</label>
                  <input
                    type="text"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    onKeyDown={stopKeyEvent}
                    onKeyUp={stopKeyEvent}
                    onKeyPress={stopKeyEvent}
                    placeholder="e.g. FrontierKing"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={stopKeyEvent}
                  onKeyUp={stopKeyEvent}
                  onKeyPress={stopKeyEvent}
                  required
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={stopKeyEvent}
                  onKeyUp={stopKeyEvent}
                  onKeyPress={stopKeyEvent}
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <div className="auth-message auth-error">
                  {authError}
                </div>
              )}
              {authStatus && (
                <div className="auth-message auth-status">
                  {authStatus}
                </div>
              )}

              <button
                type="submit"
                className="account-btn primary auth-submit-btn"
                disabled={authLoading}
              >
                {authLoading
                  ? authMode === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : authMode === "signup"
                  ? "Create account"
                  : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont,
            "SF Pro Text", sans-serif;
          background: radial-gradient(circle at top, #0b1020 0, #02040a 60%);
          color: #f5f5f5;
        }

        .site {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 16px 0 32px;
        }

        .account-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s,
            color 0.15s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .account-btn.subtle {
          border-color: rgba(255, 255, 255, 0.18);
          opacity: 0.85;
        }

        .account-btn.primary {
          border-color: #ff834a;
          background: linear-gradient(135deg, #ff784a, #ffb347);
          color: #120b06;
          font-weight: 600;
        }

        .account-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        .account-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .account-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 32px;
          padding: 0 24px;
        }

        .tabs-shell {
          width: 100%;
          max-width: 1100px;
          background: rgba(9, 12, 25, 0.9);
          border-radius: 24px;
          padding: 18px 18px 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.85);
        }

        /* Craftshore full-width overrides */
        .craftshore-panel {
          justify-content: flex-start;
          padding: 0;
          margin-top: 24px;
        }

        .craftshore-shell {
          max-width: none;
          width: 100%;
          border-radius: 0;
        }

        .home-section-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .home-section-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .home-section-header p {
          margin-top: 4px;
          font-size: 14px;
          opacity: 0.9;
        }

        .home-section-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          background: rgba(79, 70, 229, 0.18);
          color: #e5e7eb;
          border: 1px solid rgba(129, 140, 248, 0.5);
          white-space: nowrap;
        }

        .craftshore-locked {
          border-radius: 18px;
          padding: 18px 16px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px dashed rgba(248, 250, 252, 0.35);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .craftshore-hud {
          border-radius: 18px;
          padding: 12px 14px 14px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(148, 163, 252, 0.35);
          margin-bottom: 14px;
        }

        .craftshore-resources {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 13px;
        }

        .resource-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(51, 65, 85, 0.9);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
        }

        .dot-wood {
          background: #22c55e;
        }

        .dot-stone {
          background: #94a3b8;
        }

        .dot-ore {
          background: #fb923c;
        }

        .dot-food {
          background: #bef264;
        }

        .dot-gold {
          background: #facc15;
        }

        .value {
          font-weight: 600;
        }

        .craftshore-troops {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
          font-size: 12px;
        }

        .troop-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(244, 114, 182, 0.5);
        }

        .troop-name {
          font-weight: 600;
        }

        .troop-count {
          opacity: 0.9;
        }

        .craftshore-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          font-size: 12px;
        }

        .skill-chip {
          position: relative;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 252, 0.4);
          background: rgba(15, 23, 42, 0.9);
          overflow: hidden;
          min-width: 90px;
        }

        .skill-chip-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0.7),
            rgba(34, 197, 94, 0.9)
          );
          opacity: 0.6;
          transform-origin: left center;
          transition: width 0.18s ease-out;
          pointer-events: none;
        }

        .skill-chip-label {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: space-between;
        }

        .skill-name {
          font-weight: 600;
        }

        .skill-level {
          opacity: 0.95;
        }

        .craftshore-game-shell {
          margin-top: 16px;
        }

        /* Barracks panel */
        .barracks-panel {
          margin-top: 14px;
          margin-bottom: 4px;
          padding: 12px 14px 14px;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.96);
          border: 1px solid rgba(248, 250, 252, 0.16);
        }

        .barracks-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .barracks-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .barracks-header p {
          margin: 4px 0 0;
          font-size: 13px;
          opacity: 0.85;
        }

        .barracks-close-btn {
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .barracks-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 10px;
        }

        .troop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .troop-card {
          border-radius: 14px;
          padding: 10px 10px 12px;
          background: radial-gradient(
            circle at top,
            rgba(30, 64, 175, 0.5),
            #020617
          );
          border: 1px solid rgba(129, 140, 248, 0.6);
          font-size: 12px;
        }

        .troop-locked {
          opacity: 0.6;
          background: radial-gradient(
            circle at top,
            rgba(55, 65, 81, 0.6),
            #020617
          );
          border-style: dashed;
        }

        .troop-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .troop-card-header h4 {
          margin: 0;
          font-size: 14px;
        }

        .troop-desc {
          margin: 2px 0 4px;
          opacity: 0.9;
        }

        .troop-cost-row,
        .troop-meta-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 2px;
        }

        .troop-train-btn {
          margin-top: 6px;
          width: 100%;
          justify-content: center;
          font-size: 12px;
          padding-block: 6px;
        }

        .barracks-msg {
          margin-top: 8px;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        .barracks-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #fecaca;
        }

        .barracks-status {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.6);
          color: #bbf7d0;
        }

        .site-footer {
          margin-top: auto;
          padding: 16px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          opacity: 0.7;
          flex-wrap: wrap;
        }

        .site-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .site-footer-link {
          text-decoration: none;
          color: inherit;
          opacity: 0.85;
        }

        .site-footer-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        /* Auth modal */
        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .auth-modal {
          width: 420px;
          max-width: 90vw;
          background: radial-gradient(circle at top, #11172a, #050712);
          border-radius: 24px;
          padding: 18px 20px 20px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .auth-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .auth-modal-title {
          font-size: 18px;
          font-weight: 600;
        }

        .auth-modal-subtitle {
          font-size: 13px;
          opacity: 0.75;
          margin-top: 4px;
        }

        .auth-close-btn {
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .auth-toggle {
          display: inline-flex;
          padding: 2px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 10px;
        }

        .auth-toggle-btn {
          border: none;
          background: transparent;
          color: #b7c1ff;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 999px;
          cursor: pointer;
        }

        .auth-toggle-btn-active {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-weight: 600;
        }

        .auth-fields {
          display: grid;
          gap: 8px;
          margin-top: 4px;
        }

        .auth-field {
          display: grid;
          gap: 4px;
        }

        .auth-field label {
          font-size: 12px;
          opacity: 0.85;
        }

        .auth-field input {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 6px 10px;
          font-size: 13px;
          background: rgba(5, 8, 20, 0.95);
          color: #f5f5f5;
        }

        .auth-field input:focus {
          outline: none;
          border-color: #ff834a;
          box-shadow: 0 0 0 1px rgba(255, 131, 74, 0.6);
        }

        .auth-message {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
        }

        .auth-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #fecaca;
        }

        .auth-status {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.6);
          color: #bbf7d0;
        }

        .auth-submit-btn {
          margin-top: 4px;
          width: 100%;
          justify-content: center;
        }

        @media (max-width: 700px) {
          .tabs-shell {
            padding: 14px 14px 16px;
          }

          .site-footer {
            flex-direction: column;
            gap: 4px;
            align-items: center;
            text-align: center;
          }

          .craftshore-locked {
            flex-direction: column;
            align-items: flex-start;
          }

          .barracks-meta {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
