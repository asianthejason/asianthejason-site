// =====================
//  Phaser Game Config
// =====================
const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#87CEEB',
  parent: 'gameContainer',
  physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
  scene: { preload, create, update },
  dom: { createContainer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { mouse: { preventDefaultWheel: false } }
};

window.game = new Phaser.Game(config);

// World width used for clamping camera/enemy spawns
const WORLD_WIDTH = 10000000;

// =====================
//  Globals / State
// =====================
let isReloading = false;
let isMouseDown = false;
let machineGunInterval = null;

let player, pointer;
let bullets, enemyBullets, enemies, ground;
let playerHealthBar;
// --- Run stats for Supabase leaderboard ---
let enemiesKilled = 0;
const bulletsFired = {
  Pistol: 0,
  Shotgun: 0,
  Sniper: 0,
  'Machine Gun': 0
};

let playerMoney = 0;
let moneyText, weaponText, statusText;
let shopVisible = false, shopPanel;
let shopButtons = [];
let gamePaused = false;

// track phase: 'start' | 'playing' | 'gameover'
let gamePhase = 'start';
// Prevent the same run from being submitted / rendered more than once
let hasSubmittedRun = false;


let shopTabButtons = [];
let upgradeTabButtons = [];
let pistolTabButtons = [], shotgunTabButtons = [], sniperTabButtons = [], machineGunTabButtons = [];

let currentTab = 'shop';

// new: track all tab backgrounds/text for styling
let allTabBgs = [];
let allTabTexts = [];

let distanceTraveled = 0;
let lastTerrainX = 0, tileWidth = 64, tileHeight = 32;
let terrainSurfaceBodies = [];

// Number of distance-based giant bosses we've spawned so far
let nextBossDistanceMeters = 1000;


let enemySpawnInterval = 3000;
let enemySpawnTimer = -enemySpawnInterval;

const maxJumpTime = 250, jumpVelocity = -500;
const PLAYER_BULLET_LIFETIME_MS = 2500;

let worldBoundsHandlerRegistered = false;

let isJumping = false, jumpStartTime = 0;

// =====================
//  Enemy difficulty (TIME-BASED)
// =====================
const ENEMY_BASE_HEALTH     = 100;
const ENEMY_BASE_DAMAGE_MIN = 1;
const ENEMY_BASE_DAMAGE_MAX = 3;

// Difficulty growth per minute survived
const DIFFICULTY = {
  HEALTH_GROWTH_PER_MIN: 0.25,  // +25% HP per minute
  DAMAGE_GROWTH_PER_MIN: 0.20,  // +20% damage per minute
  SPAWN_GROWTH_PER_MIN:  0.35,  // +35% spawn rate per minute
  SPAWN_BASE_INTERVAL:   4000,  // ms
  SPAWN_MIN_INTERVAL:     800   // ms (cap)
};

let enemyDamageMultiplier = 1;
let gameStartMs = 0;

const GIANT_KILL_REWARD = 1000;
let ENEMY_KILL_REWARD = 5;
let moneyMultiplier   = 1;

// Track enemy health + bars
let enemyHealthMap  = new Map();
let enemyHealthBars = new Map();

// Weapons
const HEADSHOT_MULTIPLIER   = 2;
const HEADSHOT_HEIGHT_RATIO = 0.15; // top 15% considered head
const PIERCE_COUNTS = {
  'Pistol':      1,
  'Shotgun':     1,
  'Sniper':      4,  // was 2, now 4 enemies
  'Machine Gun': 2
};

const ORIGINAL_PIERCE_COUNTS = { ...PIERCE_COUNTS };

// --- Shotgun spread tuning ---
const SHOTGUN_BASE_SPREAD_DEG = 40; // original full spread in degrees
let shotgunSpreadRad = Phaser.Math.DegToRad(SHOTGUN_BASE_SPREAD_DEG);

const weapons = [
  { name: "Pistol",      clipSize: 12, totalAmmo: 48,  reloadTime: 0, fireRate: 0,   damageRange: [30, 35] },
  { name: "Shotgun",     clipSize: 4,  totalAmmo: 24,  reloadTime: 0, fireRate: 0,   damageRange: [20, 25] },
  { name: "Sniper",      clipSize: 1,  totalAmmo: 10,  reloadTime: 0, fireRate: 0,   damageRange: [250, 300] },
  { name: "Machine Gun", clipSize: 30, totalAmmo: 120, reloadTime: 0, fireRate: 100, damageRange: [30, 40] },
];

const ORIGINAL_WEAPON_DAMAGE_RANGES = weapons.map(w => [...w.damageRange]);
const ORIGINAL_CLIP_SIZES           = weapons.map(w => w.clipSize);

let currentWeaponIndex = 0;
let weaponState = weapons.map(w => ({
  currentClip: w.clipSize,
  totalAmmo: w.totalAmmo - w.clipSize
}));


// Player HP & Shield
let playerMaxHealth = 100;
let playerHealth    = 100;

let playerShield    = 100; // current shield value (no formal max)

// Medical kit cost (used by shop + heal hotkey)
const MEDKIT_COST = 30;


// =====================
//  Customizable controls
// =====================

// Default bindings (stored & compared as normalized key names)
const DEFAULT_BINDINGS = {
  moveLeft: 'A',
  moveUp: 'W',
  moveRight: 'D',
  openShop: 'F',
  weaponPrev: 'Q',
  weaponNext: 'E',
  heal: 'H'
};

let controlBindings = null;

// movement state driven by keydown/keyup instead of Phaser addKeys
let moveLeftPressed = false;
let moveRightPressed = false;
let moveUpPressed = false;

// global keyboard handlers so we can detach on scene restart
let globalKeyDownHandler = null;
let globalKeyUpHandler   = null;

// start screen objects (for swapping main <-> controls)
let startScreenObjects = [];

function normalizeKeyName(key) {
  if (!key) return '';
  return key.length === 1 ? key.toUpperCase() : key;
}

function getDefaultBindings() {
  return { ...DEFAULT_BINDINGS };
}

function loadControlBindings() {
  const defaults = getDefaultBindings();
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...defaults };
  }
  try {
    const raw = window.localStorage.getItem('wwiiiControls');
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch (e) {
    console.warn('Failed to load control bindings, using defaults', e);
    return { ...defaults };
  }
}

function saveControlBindings() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem('wwiiiControls', JSON.stringify(controlBindings));
  } catch (e) {
    console.warn('Failed to save control bindings', e);
  }
}

function clearStartScreen(scene) {
  startScreenObjects.forEach(o => {
    if (!o) return;
    scene.tweens.killTweensOf(o);
    o.destroy();
  });
  startScreenObjects = [];
  scene.input.setDefaultCursor('default');
}

// =====================
//  Preload
// =====================
function preload() {
  this.load.image('ground',     'assets/images/ground.png');
  this.load.image('background', 'assets/images/background.png');
  this.load.image('bullet',     'assets/images/bullet.png');

  // Player sprites
  this.load.spritesheet('playeridle', 'assets/sprites/Soldier_1/idle.png', {  frameWidth: 128, frameHeight: 128 });
  this.load.spritesheet('playerrun',  'assets/sprites/Soldier_1/run.png',  {  frameWidth: 128, frameHeight: 128 });
  this.load.spritesheet('playershot', 'assets/sprites/Soldier_1/shot_1.png',{ frameWidth: 128, frameHeight: 128 });

  // Enemy sprites
  this.load.spritesheet('enemyidle', 'assets/sprites/Gangsters_1/Idle.png', { frameWidth: 128, frameHeight: 128 });
  this.load.spritesheet('enemyrun',  'assets/sprites/Gangsters_1/Run.png',  { frameWidth: 128, frameHeight: 128 });
  this.load.spritesheet('enemyshot', 'assets/sprites/Gangsters_1/Shot.png', { frameWidth: 128, frameHeight: 128 });

  // 1px texture (optional)
  this.textures.generate('blank', { data: ['.'], pixelWidth: 1, pixelHeight: 1 });
}

// =====================
//  UI Helpers
// =====================
function updateWeaponAndHealthUI(scene) {
  const w = weapons[currentWeaponIndex];
  const s = weaponState[currentWeaponIndex];
  const totalDisplay = w.name === "Pistol" ? '∞' : s.totalAmmo;
  weaponText.setText(`${w.name}\nAmmo: ${s.currentClip}/${totalDisplay}`);

  const damageRange = weapons[currentWeaponIndex].damageRange;
  const hpDisplay   = playerHealth.toFixed(1);
  scene.topStatusText.setText(`❤️ HP: ${hpDisplay}/${playerMaxHealth}   🛡️ Shield: ${playerShield}   🔫 Damage: ${damageRange[0]} - ${damageRange[1]}`);
}

function updatePlayerHealthBar() {
  playerHealthBar.clear();
  const barWidth  = 40;
  const barHeight = 6;
  const x = player.x - barWidth / 2;
  const y = player.y - player.displayHeight / 2 - 12;

  // --- Shield bar (blue), scaled so 100 shield fills the bar ---
  if (playerShield > 0) {
    const shieldPct = Math.min(playerShield / 100, 1);
    const shieldY   = y - 8;

    // border
    playerHealthBar.fillStyle(0x000000);
    playerHealthBar.fillRect(x - 1, shieldY - 1, barWidth + 2, barHeight + 2);

    // fill
    playerHealthBar.fillStyle(0x1d4ed8); // blue
    playerHealthBar.fillRect(x, shieldY, barWidth * shieldPct, barHeight);
  }

  // --- Health bar (green) ---
  const pct = Phaser.Math.Clamp(playerHealth / playerMaxHealth, 0, 1);
  playerHealthBar.fillStyle(0x000000);
  playerHealthBar.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
  playerHealthBar.fillStyle(0x00ff00);
  playerHealthBar.fillRect(x, y, barWidth * pct, barHeight);
}

// Centralized logic for buying a Medical Kit (used by shop button + heal hotkey)
function tryBuyMedicalKit(scene, label) {
  const cost = MEDKIT_COST;

  if (playerMoney >= cost && playerHealth < playerMaxHealth) {
    // Successful purchase + heal to full
    playerMoney -= cost;
    playerHealth = playerMaxHealth;
    moneyText.setText(`$${playerMoney}`);
    updateWeaponAndHealthUI(scene);
    updatePlayerHealthBar();

    if (label) {
      label.setText(`Healed to full HP!`);
      scene.time.delayedCall(1000, () =>
        label.setText(`Buy Medical Kit - $${cost}`)
      );
    }
  } else if (playerHealth >= playerMaxHealth) {
    // Already full HP
    if (label) {
      label.setText(`You're already at full HP!`);
      scene.time.delayedCall(1000, () =>
        label.setText(`Buy Medical Kit - $${cost}`)
      );
    } else if (scene.topStatusText) {
      const w = weapons[currentWeaponIndex];
      const hpDisplay = playerHealth.toFixed(1);
      scene.topStatusText.setText(
        `❤️ HP: ${hpDisplay}/${playerMaxHealth} (already full)   🔫 Damage: ${w.damageRange[0]} - ${w.damageRange[1]}`
      );
      scene.time.delayedCall(1000, () => updateWeaponAndHealthUI(scene));
    }
  } else {
    // Not enough money
    if (label) {
      label.setText(`Not enough money for Medical Kit`);
      scene.time.delayedCall(1000, () =>
        label.setText(`Buy Medical Kit - $${cost}`)
      );
    } else if (scene.topStatusText) {
      scene.topStatusText.setText(`Not enough money for Medical Kit ($${cost})`);
      scene.time.delayedCall(1000, () => updateWeaponAndHealthUI(scene));
    }
  }
}

// -------- Quantity pill using Rectangle (no custom draw) --------
function createQuantityButton(
  scene,
  x,
  y,
  weaponIndex,
  qty,
  unitCost,
  labelRef,
  targetArray = shopTabButtons
) {
  const BTN_W = 52, BTN_H = 30;

  const buy = () => {
    const w = weapons[weaponIndex];
    const totalCost = unitCost * qty;
    if (playerMoney >= totalCost) {
      playerMoney -= totalCost;
      weaponState[weaponIndex].totalAmmo += w.clipSize * qty;
      moneyText.setText(`$${playerMoney}`);
      updateWeaponAndHealthUI(scene);
    } else {
      labelRef.setText(`Not enough $ for ${w.name} x${qty}`);
      scene.time.delayedCall(1000, () => {
        labelRef.setText(`Buy 1 ${w.name} Clip - $${unitCost}`);
      });
    }
  };

  const bg = scene.add.rectangle(x, y, BTN_W, BTN_H, 0x020617, 0.95)
    .setStrokeStyle(1, 0x4b5563, 0.7)
    .setScrollFactor(0)
    .setDepth(2002)
    .setVisible(false)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const text = scene.add.text(x, y, `x${qty}`, {
    font: '14px "Inter", Arial',
    fill: '#e5e7eb'
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2003)
    .setVisible(false)
    .setInteractive({ useHandCursor: true });

  const hoverOn = () => {
    bg.setFillStyle(0x111827, 0.95);
    text.setStyle({ fill: '#f9fafb' });
    scene.input.setDefaultCursor('pointer');
  };

  const hoverOff = () => {
    bg.setFillStyle(0x020617, 0.95);
    text.setStyle({ fill: '#e5e7eb' });
    scene.input.setDefaultCursor('default');
  };

  bg.on('pointerover', hoverOn);
  bg.on('pointerout',  hoverOff);
  bg.on('pointerdown', buy);

  text.on('pointerover', hoverOn);
  text.on('pointerout',  hoverOff);
  text.on('pointerdown', buy);

  targetArray.push(bg, text);
  return { bg, text };
}

// -------- Shared upgrade row factory (modern card style, softer borders) --------
function createUpgrade(
  x,
  y,
  labelText,
  cost,
  applyCallback,
  tabArray = upgradeTabButtons,
  costIncreaseFactor = 1.5
) {
  let currentCost = cost;

  const divider = this.add.rectangle(x, y - 40, 520, 1, 0x1f2937, 0.5)
    .setScrollFactor(0)
    .setDepth(2001)
    .setVisible(false);

  const bg = this.add.rectangle(x, y, 520, 68, 0x020617, 0.9)
    .setStrokeStyle(2, 0x374151, 0.45)
    .setScrollFactor(0)
    .setDepth(2001)
    .setVisible(false);

  const label = this.add.text(x, y, `${labelText} — $${currentCost}`, {
    font: '20px "Inter", Arial',
    fill: '#e5e7eb'
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2002)
    .setVisible(false)
    .setInteractive({ useHandCursor: true });

  label.on('pointerdown', () => {
    if (playerMoney < currentCost) {
      label.setText('Not enough $');
      this.time.delayedCall(1000, () =>
        label.setText(`${labelText} — $${currentCost}`)
      );
      return;
    }
    playerMoney -= currentCost;
    moneyText.setText(`$${playerMoney}`);

    // apply effect
    applyCallback();

    updateWeaponAndHealthUI(this);
    updatePlayerHealthBar();

    // bump price (or stay flat if factor = 1)
    currentCost = Math.ceil(currentCost * costIncreaseFactor);
    label.setText(`${labelText} — $${currentCost}`);
  });

  label.on('pointerover', () => {
    bg.setFillStyle(0x020617, 1);
    bg.setStrokeStyle(2, 0x38bdf8, 0.9);
    label.setStyle({ fill: '#f9fafb' });
  });
  label.on('pointerout',  () => {
    bg.setFillStyle(0x020617, 0.9);
    bg.setStrokeStyle(2, 0x374151, 0.45);
    label.setStyle({ fill: '#e5e7eb' });
  });

  tabArray.push(divider, bg, label);
}

// -------- Top tab button using Rectangle (no Graphics._draw) --------
function createTabButton(scene, x, y, label, tabName) {
  const width  = 130;
  const height = 40;

  const bg = scene.add.rectangle(x, y, width, height, 0x020617, 0.8)
    .setStrokeStyle(2, 0x1f2937, 0.7)
    .setScrollFactor(0)
    .setDepth(2001)
    .setVisible(false)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  bg.tabName = tabName;

  const text = scene.add.text(x, y, label, {
    font: '15px "Inter", Arial',
    fill: '#e5e7eb'
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2002)
    .setVisible(false)
    .setInteractive({ useHandCursor: true });

  text.tabName = tabName;

  // keep references so updateTabVisuals can restyle everything
  bg._label = text;
  allTabBgs.push(bg);
  allTabTexts.push(text);

  const goTab = () => {
    switchTab(tabName);
  };

  const hoverOn = () => {
    if (currentTab === tabName) return;
    bg.setStrokeStyle(2, 0x4b5563, 0.9);
    text.setStyle({ fill: '#f9fafb' });
  };

  const hoverOff = () => {
    updateTabVisuals();
  };

  bg.on('pointerover', hoverOn);
  bg.on('pointerout',  hoverOff);
  bg.on('pointerdown', goTab);

  text.on('pointerover', hoverOn);
  text.on('pointerout',  hoverOff);
  text.on('pointerdown', goTab);

  return [bg, text];
}

function updateTabVisuals() {
  allTabBgs.forEach(bg => {
    if (!bg) return;
    const isActive = currentTab === bg.tabName;
    const text = bg._label;

    const fillColor   = isActive ? 0x0f172a : 0x020617;
    const strokeColor = isActive ? 0x38bdf8 : 0x1f2937;

    bg.setFillStyle(fillColor, isActive ? 0.95 : 0.8);
    bg.setStrokeStyle(2, strokeColor, 0.9);

    if (text) {
      text.setStyle({
        fill: isActive ? '#bfdbfe' : '#e5e7eb'
      });
    }
  });
}

// =====================
//  Create
// =====================
function create() {
  // Phase starts at 'start' for this scene
  gamePhase = 'start';
  // Reset run-submission guard each time a fresh scene is created
  hasSubmittedRun = false;


  // --- HARD RESET of all run-scoped globals (prevents Play Again freeze) ---
  isReloading = false;
  isMouseDown = false;
  machineGunInterval = null;

  playerMoney = 0;
  playerMaxHealth = 100;
  playerHealth = 100;
  playerShield = 100;

  enemyDamageMultiplier = 1;
  moneyMultiplier = 1;
  ENEMY_KILL_REWARD = 5;

  enemiesKilled = 0;
  bulletsFired.Pistol = 0;
  bulletsFired.Shotgun = 0;
  bulletsFired.Sniper = 0;
  bulletsFired['Machine Gun'] = 0;

  distanceTraveled = 0;
  lastTerrainX = 0;
  terrainSurfaceBodies = [];
  enemySpawnInterval = 3000;
  enemySpawnTimer = -enemySpawnInterval;
  // first giant spawns at 1000m, then every +1000m
  nextBossDistanceMeters = 1000;

  shopVisible = false;
  gamePaused = false;

  moveLeftPressed = false;
  moveRightPressed = false;
  moveUpPressed = false;

  // Load control bindings (or defaults)
  controlBindings = loadControlBindings();

  // fresh containers for UI objects (old arrays held destroyed objects)
  shopButtons = [];
  shopTabButtons = [];
  upgradeTabButtons = [];
  pistolTabButtons = [];
  shotgunTabButtons = [];
  sniperTabButtons = [];
  machineGunTabButtons = [];
  allTabBgs = [];
  allTabTexts = [];

  // fresh per-enemy maps
  enemyHealthMap = new Map();
  enemyHealthBars = new Map();

  // restore weapon baselines and ammo
  weapons.forEach((w, i) => {
    w.damageRange = [...ORIGINAL_WEAPON_DAMAGE_RANGES[i]];
    w.clipSize    = ORIGINAL_CLIP_SIZES[i];
  });
  currentWeaponIndex = 0;
  weaponState = weapons.map(w => ({
    currentClip: w.clipSize,
    totalAmmo: w.totalAmmo - w.clipSize
  }));

  // reset shotgun spread each run
  shotgunSpreadRad = Phaser.Math.DegToRad(SHOTGUN_BASE_SPREAD_DEG);

  // reset pierce counts (e.g., pistol pierce upgrades)
  Object.keys(PIERCE_COUNTS).forEach(key => {
    PIERCE_COUNTS[key] = ORIGINAL_PIERCE_COUNTS[key];
  });

  // Animations
  this.anims.create({ key: 'player_idle', frames: this.anims.generateFrameNumbers('playeridle', { start: 0, end: 6 }), frameRate: 28, repeat: -1 });
  this.anims.create({ key: 'player_walk', frames: this.anims.generateFrameNumbers('playerrun',  { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
  this.anims.create({ key: 'player_shoot',frames: this.anims.generateFrameNumbers('playershot', { start: 0, end: 3 }), frameRate: 10, repeat: 0 });

  // Enemy animations (slower shoot so it reads)
  this.anims.create({
    key: 'enemy_idle',
    frames: this.anims.generateFrameNumbers('enemyidle', { start: 0, end: 5 }),
    frameRate: 25,
    repeat: -1
  });
  this.anims.create({
    key: 'enemy_walk',
    frames: this.anims.generateFrameNumbers('enemyrun',  { start: 0, end: 9 }),
    frameRate: 14,
    repeat: -1
  });
  this.anims.create({
    key: 'enemy_shoot',
    frames: this.anims.generateFrameNumbers('enemyshot', { start: 0, end: 3 }),
    frameRate: 6,
    repeat: 0
  });

  this.add.image(960, 540, 'background').setScrollFactor(0).setDepth(-10);
  this.input.mouse.disableContextMenu();

  // Groups
  ground      = this.physics.add.staticGroup();
  bullets     = this.physics.add.group({ defaultKey: 'bullet', maxSize: 1000 });
  enemyBullets= this.physics.add.group({ defaultKey: 'bullet', maxSize: 1000 });
  enemies     = this.physics.add.group();

  generateTerrain(this, 0, 640 * 3);

  // Player spawn on surface
  const spawnX = 250;
  const groundY = findGroundYAtX(spawnX);
  player = this.physics.add.sprite(spawnX, groundY, 'playeridle')
    .setOrigin(0.5, 1).setCollideWorldBounds(true);
  player.body.setSize(30, 130).setOffset((128-30)/2, (128-130)/2);
  player.play('player_idle');

  this.physics.add.collider(player, ground);

  pointer   = this.input.activePointer;

  // Colliders / overlaps
  this.physics.add.collider(bullets, ground, b => b.destroy());
  this.physics.add.collider(enemyBullets, ground, b => b.destroy());
  this.physics.add.collider(enemies, ground);

  // Player hit by enemy bullets
  this.physics.add.overlap(
    player,
    enemyBullets,
    (playerSprite, bullet) => {
      const damage = bullet.damage ?? 0;
      bullet.destroy();

      if (playerShield > 0) {
        // Shield always loses 2 per bullet, regardless of enemy damage
        playerShield = Math.max(0, playerShield - 2);
      } else {
        playerHealth -= damage;
        if (playerHealth <= 0) {
          playerHealth = 0;
          showGameOver(this);
        }
      }

      updateWeaponAndHealthUI(this);
      updatePlayerHealthBar();
    },
    null,
    this
  );

  // Bullets vs enemies (pierce after damage, but ONLY when enemy is in firing range/on-screen)
  this.physics.add.overlap(bullets, enemies, (b, e) => {
    // Early-outs: dead enemies or off-screen targets don't interact at all
    if (!e.active) return;
    if (!isEnemyInFiringRange(this, e)) return;

    // ignore repeated overlaps with same enemy for this bullet
    b.hitEnemies ??= new Set();
    if (b.hitEnemies.has(e)) return;
    b.hitEnemies.add(e);

    // ---- DAMAGE ----
    let damage;
    if (b.isSniper) {
      const enemyTopY  = e.y - e.displayHeight / 2;
      const relativeY  = b.y - enemyTopY;
      const headHeight = e.displayHeight * HEADSHOT_HEIGHT_RATIO;

      if (relativeY <= headHeight) {
        damage = b.damage;
        const text = this.add.text(e.x, e.y - e.displayHeight, 'HEADSHOT!', {
          font: '12px Arial', fill: '#ff0000'
        }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: text.y - 20, alpha: 0, duration: 600, onComplete: () => text.destroy() });
      } else {
        damage = 5;
      }
    } else {
      damage = b.damage || 25;

      const headHeight = e.displayHeight * HEADSHOT_HEIGHT_RATIO;
      const headTop    = e.y - e.displayHeight / 2;
      const headBottom = headTop + headHeight;

      if (b.y >= headTop && b.y <= headBottom) {
        damage *= HEADSHOT_MULTIPLIER;
        const text = this.add.text(e.x, e.y - e.displayHeight, 'HEADSHOT!', {
          font: '12px Arial', fill: '#ff0000'
        }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: text.y - 20, alpha: 0, duration: 600, onComplete: () => text.destroy() });
      }
    }

    // Make bosses (giant enemies) feel tanky: greatly reduce incoming damage.
    if (e.isGiant) {
      damage *= 0.25; // bosses take only 25% of normal damage
    }

    // ---- APPLY DAMAGE & KILL ----
    const newHealth = (enemyHealthMap.get(e) || ENEMY_BASE_HEALTH) - damage;
    enemyHealthMap.set(e, newHealth);

    if (newHealth <= 0) {
      enemyHealthMap.delete(e);
      enemyHealthBars.get(e)?.destroy();
      enemyHealthBars.delete(e);
      const baseReward = e.isGiant ? GIANT_KILL_REWARD : ENEMY_KILL_REWARD;
      playerMoney += baseReward * moneyMultiplier;
      moneyText.setText(`$${playerMoney}`);
      enemiesKilled++;

      e.destroy();
    }

    // ---- PIERCE COUNTDOWN & SELF-DESTRUCT ----
    if (b.active) {
      b.pierceLeft = (b.pierceLeft ?? 1) - 1;
      if (b.pierceLeft <= 0) b.destroy();
    }
  });

  // Player health bar
  playerHealthBar = this.add.graphics().setDepth(1000);

  // Camera + world bounds
  this.physics.world.setBounds(0, 0, WORLD_WIDTH, config.height);
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, config.height);
  if (!worldBoundsHandlerRegistered) {
    this.physics.world.on('worldbounds', body => {
      const obj = body.gameObject;
      if (!obj) return;
      if (bullets.contains(obj) || enemyBullets.contains(obj)) {
        obj.destroy();
      }
    });
    worldBoundsHandlerRegistered = true;
  }

  this.cameras.main.startFollow(player, true, 1, 1);
  this.cameras.main.setZoom(1.5);

  // HUD
  statusText = this.add.text(config.width - 550, 200, 'Initializing...', {
    font: '20px Arial', fill: '#000', backgroundColor: '#ffffffaa', padding: { x: 10, y: 5 }
  }).setScrollFactor(0).setDepth(1000);

  moneyText = this.add.text(350, 270, '$0', {
    font: '32px Arial', fill: '#00ff00'
  }).setScrollFactor(0).setDepth(1000);

  weaponText = this.add.text(350, 200, '', {
    font: '18px Arial', fill: '#000', backgroundColor: '#ffffffaa', padding: { x: 10, y: 5 }
  }).setScrollFactor(0).setDepth(1000);

  const topInfoStyle = { font: '18px Arial', fill: '#ffffff', backgroundColor: '#000000aa', padding: { x: 8, y: 4 } };
  this.topStatusText = this.add.text(config.width / 2, 200, '', topInfoStyle).setOrigin(0.5,0).setScrollFactor(0).setDepth(1000);
  updateWeaponAndHealthUI(this);

  // =====================
  //  Modern Shop panel
  // =====================
  shopPanel = this.add.rectangle(960, 540, 820, 520, 0x020617, 0.96)
    .setStrokeStyle(3, 0x1f2937, 0.7)
    .setScrollFactor(0)
    .setDepth(2000)
    .setVisible(false);

  shopButtons.push(shopPanel);

  const headerY   = shopPanel.y - shopPanel.height / 2 + 36;
  const subtitleY = headerY + 20;

  const panelTitle = this.add.text(960, headerY, 'Supply Depot', {
    font: '24px "Inter", Arial',
    fill: '#f9fafb'
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2001)
    .setVisible(false);

  const panelSubtitle = this.add.text(960, subtitleY, 'Press your Shop key to open / close', {
    font: '14px "Inter", Arial',
    fill: '#9ca3af'
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2001)
    .setVisible(false);

  shopButtons.push(panelTitle, panelSubtitle);

  const panelX = shopPanel.x;

  // Tabs
  const tabLabels = ['SHOP','UPGRADES','Pistol','Shot Gun','Sniper','Machine Gun'];
  const tabNames  = ['shop','upgrade','pistol','shotgun','sniper','machinegun'];
  const numTabs   = tabLabels.length;

  const panelInnerWidth = shopPanel.width - 60;
  const tabSpacing      = panelInnerWidth / numTabs;
  const startX          = shopPanel.x - shopPanel.width/2 + 30 + tabSpacing/2;
  const tabY            = subtitleY + 40;

  // unified content anchors
  const CONTENT_TOP   = tabY + 70; // everything starts below tabs
  const ROW_SPACING   = 80;        // shop row spacing
  const UPG_SPACING   = 90;        // upgrade row spacing

  for (let i = 0; i < numTabs; i++) {
    const x = startX + i * tabSpacing;
    const [bg, text] = createTabButton(this, x, tabY, tabLabels[i], tabNames[i]);
    shopButtons.push(bg, text);
  }
  updateTabVisuals();

  // ===== Max Health +50 (does NOT heal) =====
  let upgradeY = CONTENT_TOP;
  const upgradeSpacing = UPG_SPACING;

  {
    const divider = this.add.rectangle(panelX, upgradeY - 40, 520, 1, 0x1f2937, 0.5)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    const bg = this.add.rectangle(panelX, upgradeY, 520, 68, 0x020617, 0.9)
      .setStrokeStyle(2, 0x374151, 0.45)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    const label = this.add.text(panelX, upgradeY, `Upgrade 💪 Max Health +50 - $100`, {
      font: '20px "Inter", Arial',
      fill: '#e5e7eb'
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    let maxHpCost = 100;
    label.on('pointerdown', () => {
      if (playerMoney >= maxHpCost) {
        playerMoney      -= maxHpCost;
        playerMaxHealth  = Math.min(playerMaxHealth + 50, 9999999);
        playerHealth     = Math.min(playerHealth, playerMaxHealth); // clamp, do not heal
        moneyText.setText(`$${playerMoney}`);
        updateWeaponAndHealthUI(this);
        updatePlayerHealthBar();
        maxHpCost = Math.ceil(maxHpCost * 1.05);
        label.setText(`Upgrade 💪 Max Health +50 - $${maxHpCost}`);
      } else {
        label.setText(`Not enough $ for Max Health`);
        this.time.delayedCall(1000, () => label.setText(`Upgrade 💪 Max Health +50 - $${maxHpCost}`));
      }
    });
    label.on('pointerover', () => {
      bg.setFillStyle(0x020617, 1);
      bg.setStrokeStyle(2, 0x38bdf8, 0.9);
      label.setStyle({ fill: '#f9fafb' });
    });
    label.on('pointerout',  () => {
      bg.setFillStyle(0x020617, 0.9);
      bg.setStrokeStyle(2, 0x374151, 0.45);
      label.setStyle({ fill: '#e5e7eb' });
    });

    upgradeTabButtons.push(divider, bg, label);
  }
  upgradeY += upgradeSpacing;

  // ===== Shield Purchase (Upgrades tab) =====
  createUpgrade.call(
    this,
    panelX,
    upgradeY,
    'Buy 🛡️ +100 Shield',
    100,
    () => {
      playerShield += 100;
      updateWeaponAndHealthUI(this);
      updatePlayerHealthBar();
    },
    upgradeTabButtons,
    1 // cost stays at $100
  );
  upgradeY += upgradeSpacing;

  // ===== Extra Upgrades (Upgrades tab) =====
  createUpgrade.call(
    this,
    panelX,
    upgradeY,
    'Reduce Enemy Damage by 50%',
    500,
    () => { enemyDamageMultiplier *= 0.5; },
    upgradeTabButtons,
    4
  );
  upgradeY += upgradeSpacing;

  createUpgrade.call(
    this,
    panelX,
    upgradeY,
    'Double Money on Kill',
    500,
    () => { moneyMultiplier *= 2; },
    upgradeTabButtons,
    15
  );
  upgradeY += upgradeSpacing;

  // ===== Weapon-tab upgrades =====
  const damageTabMap = {
    'Pistol':      pistolTabButtons,
    'Shotgun':     shotgunTabButtons,
    'Sniper':      sniperTabButtons,
    'Machine Gun': machineGunTabButtons
  };
  const contentStartY = CONTENT_TOP; // align weapon-tab upgrades with shop

  // Damage +10% per weapon
  const DAMAGE_UPGRADE_MULTIPLIER = 1.1;
  const DAMAGE_UPGRADE_COST       = 100;
  Object.entries(damageTabMap).forEach(([weaponName, targetTabs]) => {
    createUpgrade.call(
      this,
      panelX,
      contentStartY,
      `Upgrade ${weaponName} Damage +10%`,
      DAMAGE_UPGRADE_COST,
      () => {
        const w = weapons.find(w => w.name === weaponName);
        w.damageRange[0] = Math.round(w.damageRange[0] * DAMAGE_UPGRADE_MULTIPLIER);
        w.damageRange[1] = Math.round(w.damageRange[1] * DAMAGE_UPGRADE_MULTIPLIER);
        updateWeaponAndHealthUI(this);
      },
      targetTabs
    );
  });

  // Clip Size ×2 per weapon ($1000, no auto-reload)
  const CLIP_UPGRADE_COST = 1000;
  Object.entries(damageTabMap).forEach(([weaponName, targetTabs]) => {
    createUpgrade.call(
      this,
      panelX,
      contentStartY + upgradeSpacing,
      `Upgrade ${weaponName} Clip Size ×2`,
      CLIP_UPGRADE_COST,
      () => {
        const idx = weapons.findIndex(w => w.name === weaponName);
        const w   = weapons[idx];
        w.clipSize *= 2;
        weaponState[idx].currentClip = Math.min(weaponState[idx].currentClip, w.clipSize);
        updateWeaponAndHealthUI(this);
      },
      targetTabs,
      1 // fixed price
    );

    // Extra Shotgun-only upgrade: tighten spread
    if (weaponName === 'Shotgun') {
      createUpgrade.call(
        this,
        panelX,
        contentStartY + upgradeSpacing * 2,
        'Tighten Shotgun Spread -10%',
        200,
        () => {
          const MIN_SPREAD_DEG = 5;
          shotgunSpreadRad = Math.max(
            Phaser.Math.DegToRad(MIN_SPREAD_DEG),
            shotgunSpreadRad * 0.9
          );
        },
        targetTabs,
        1.5
      );
    }

    // Extra Pistol-only upgrade: increase pierce
    if (weaponName === 'Pistol') {
      createUpgrade.call(
        this,
        panelX,
        contentStartY + upgradeSpacing * 2,
        'Upgrade Pistol Pierce +1',
        100,
        () => {
          PIERCE_COUNTS.Pistol += 1;
        },
        targetTabs,
        1.5 // price ×1.5 each purchase
      );
    }
  });

  // ===== Shop Rows (clips + bulk) =====
  const CLIP_PRICES = { Pistol: 0, Shotgun: 5, Sniper: 5, "Machine Gun": 5 };

  weapons.forEach((w, i) => {
    const y = CONTENT_TOP + i * ROW_SPACING;

    // Pistol row → Medical Kit (full-width box)
    if (i === 0) {
      const cost = MEDKIT_COST;

      const FULL_W = 520, FULL_H = 68, fullX = 960;
      const fullBg = this.add.rectangle(fullX, y, FULL_W, FULL_H, 0x020617, 0.96)
        .setStrokeStyle(2, 0x38bdf8, 0.7)
        .setScrollFactor(0)
        .setDepth(2002)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(fullX, y, `Buy Medical Kit - $${cost}`, {
        font: '20px "Inter", Arial',
        fill: '#e5e7eb'
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2003)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const hoverOn  = () => {
        fullBg.setFillStyle(0x020617, 1);
        fullBg.setStrokeStyle(2, 0x38bdf8, 0.9);
        label.setStyle({ fill: '#f9fafb' });
      };
      const hoverOff = () => {
        fullBg.setFillStyle(0x020617, 0.96);
        fullBg.setStrokeStyle(2, 0x38bdf8, 0.7);
        label.setStyle({ fill: '#e5e7eb' });
      };

      fullBg.on('pointerover', hoverOn);
      fullBg.on('pointerout',  hoverOff);
      label .on('pointerover', hoverOn);
      label .on('pointerout',  hoverOff);

      const buyKit = () => {
        tryBuyMedicalKit(this, label);
      };
      fullBg.on('pointerdown', buyKit);
      label .on('pointerdown', buyKit);

      shopTabButtons.push(fullBg, label);
      return;
    }

    // Other weapons → Buy Clip + bulk
    const cost = CLIP_PRICES[w.name];

    // Centered group: main + x10/x50/x100 (no row background to avoid stripes)
    const ROW_CENTER = 960;
    const MAIN_W = 320, MAIN_H = 52;
    const BTN_W = 52, BETWEEN = 8, GAP_FROM_MAIN = 14;

    const groupWidth = MAIN_W + GAP_FROM_MAIN + (BTN_W * 3) + (BETWEEN * 2);
    const groupLeft = ROW_CENTER - groupWidth / 2;

    const mainX = groupLeft + MAIN_W / 2;

    const mainBg = this.add.rectangle(mainX, y, MAIN_W, MAIN_H, 0x020617, 0.96)
      .setStrokeStyle(2, 0x374151, 0.45)
      .setScrollFactor(0)
      .setDepth(2002)
      .setVisible(false);
    shopTabButtons.push(mainBg);

    const label = this.add.text(mainX, y, `Buy 1 ${w.name} Clip - $${cost}`, {
      font: '18px "Inter", Arial',
      fill: '#e5e7eb'
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    label.on('pointerdown', () => {
      if (playerMoney >= cost) {
        playerMoney -= cost;
        moneyText.setText(`$${playerMoney}`);
        weaponState[i].totalAmmo += weapons[i].clipSize;
        updateWeaponAndHealthUI(this);
      } else {
        label.setText(`Not enough $ for ${w.name}`);
        this.time.delayedCall(1000, () => label.setText(`Buy 1 ${w.name} Clip - $${cost}`));
      }
    });
    label.on('pointerover', () => {
      mainBg.setFillStyle(0x020617, 1);
      mainBg.setStrokeStyle(2, 0x38bdf8, 0.9);
      label.setStyle({ fill: '#f9fafb' });
    });
    label.on('pointerout',  () => {
      mainBg.setFillStyle(0x020617, 0.96);
      mainBg.setStrokeStyle(2, 0x374151, 0.45);
      label.setStyle({ fill: '#e5e7eb' });
    });

    // pills to the right of main button
    const mainRightEdge = groupLeft + MAIN_W;
    const x10  = mainRightEdge + GAP_FROM_MAIN + BTN_W / 2;
    const x50  = x10  + BTN_W + BETWEEN;
    const x100 = x50  + BTN_W + BETWEEN;

    createQuantityButton(this, x10,  y, i, 10,  cost, label);
    createQuantityButton(this, x50,  y, i, 50,  cost, label);
    createQuantityButton(this, x100, y, i, 100, cost, label);

    shopTabButtons.push(label);
  });

  // ------ Global key handlers (use customizable bindings) ------
  if (globalKeyDownHandler) {
    this.input.keyboard.off('keydown', globalKeyDownHandler);
  }
  if (globalKeyUpHandler) {
    this.input.keyboard.off('keyup', globalKeyUpHandler);
  }

  globalKeyDownHandler = (event) => {
    const keyName = normalizeKeyName(event.key);
    // Movement states (even if not playing, so they are "ready")
    if (keyName === controlBindings.moveLeft)  moveLeftPressed = true;
    if (keyName === controlBindings.moveRight) moveRightPressed = true;
    if (keyName === controlBindings.moveUp)    moveUpPressed = true;

    // Gameplay actions only while playing
    if (gamePhase !== 'playing') return;
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (keyName === controlBindings.openShop) {
      shopVisible = !shopVisible;
      gamePaused  = shopVisible;

      shopPanel.setVisible(shopVisible);
      if (shopVisible) {
        this.physics.world.pause();
      } else {
        this.physics.world.resume();
      }
      shopButtons.forEach(btn => btn.setVisible(shopVisible));
      switchTab(currentTab);
      return;
    }

    if (keyName === controlBindings.weaponNext) {
      currentWeaponIndex = (currentWeaponIndex + 1) % weapons.length;
      updateWeaponAndHealthUI(this);
      return;
    }

    if (keyName === controlBindings.weaponPrev) {
      currentWeaponIndex = (currentWeaponIndex - 1 + weapons.length) % weapons.length;
      updateWeaponAndHealthUI(this);
      return;
    }

    if (keyName === controlBindings.heal) {
      tryBuyMedicalKit(this, null);
      return;
    }
  };

  globalKeyUpHandler = (event) => {
    const keyName = normalizeKeyName(event.key);
    if (keyName === controlBindings.moveLeft)  moveLeftPressed = false;
    if (keyName === controlBindings.moveRight) moveRightPressed = false;
    if (keyName === controlBindings.moveUp)    moveUpPressed = false;
  };

  this.input.keyboard.on('keydown', globalKeyDownHandler);
  this.input.keyboard.on('keyup', globalKeyUpHandler);

  // Mouse shooting / reload
  this.input.on('pointerup', () => {
    isMouseDown = false;
    if (machineGunInterval) { machineGunInterval.remove(); machineGunInterval = null; }
  });

  this.input.on('pointerdown', p => {
    if (gamePhase !== 'playing') return;
    if (gamePaused) return;

    // Right-click = reload
    if (p.rightButtonDown()) {
      if (isReloading) return;
      const w = weapons[currentWeaponIndex];
      const s = weaponState[currentWeaponIndex];

      if (w.name === "Pistol") {
        if (!isReloading && s.currentClip < w.clipSize) {
          isReloading = true;
          this.time.delayedCall(w.reloadTime, () => {
            s.currentClip = w.clipSize;
            isReloading = false;
            updateWeaponAndHealthUI(this);
          });
        }
        return;
      }

      if (s.totalAmmo > 0) {
        isReloading = true;
        this.time.delayedCall(w.reloadTime, () => {
          const availableAmmo  = s.totalAmmo;
          const clipSize       = w.clipSize;
          const ammoToSubtract = Math.min(clipSize, availableAmmo);
          s.totalAmmo -= ammoToSubtract;
          s.currentClip = Math.min(clipSize, ammoToSubtract);
          isReloading = false;
          updateWeaponAndHealthUI(this);
        });
      }
      return;
    }

    // Left-click = shoot
    isMouseDown = true;
    const w = weapons[currentWeaponIndex];
    if (w.name === "Machine Gun") {
      shootBullet.call(this); // fire immediately
      machineGunInterval = this.time.addEvent({
        delay: w.fireRate,
        loop: true,
        callback: () => {
          if (isMouseDown && weapons[currentWeaponIndex].name === "Machine Gun") {
            shootBullet.call(this);
          }
        }
      });
    } else {
      shootBullet.call(this);
    }
  });

  switchTab('shop');
  updateWeaponAndHealthUI(this);

  // ===== SHOW START SCREEN (pause physics until Play is pressed) =====
  showStartScreen(this);
}

// =====================
//  Update
// =====================
function update(time) {
  if (gamePaused) {
    if (player && player.body) {
      player.setVelocityX(0);
    }
    return;
  }

  const distanceScale = 22;
  distanceTraveled = Math.floor(player.x / distanceScale);

  // Distance-based giant bosses:
  // Spawn ONE boss each time you cross another 1000m mark (1000m, 2000m, 3000m, ...).
  if (distanceTraveled >= nextBossDistanceMeters) {
    spawnGiantEnemy(this);
    nextBossDistanceMeters += 1000;
  }

  if (player.x > lastTerrainX - config.width * 2)
    generateTerrain(this, lastTerrainX + tileWidth, lastTerrainX + 640);

  // ===== TIME-BASED adaptive spawn interval =====
  const elapsedMin = (this.time.now - gameStartMs) / 60000;
  enemySpawnInterval =
    DIFFICULTY.SPAWN_BASE_INTERVAL / (1 + elapsedMin * DIFFICULTY.SPAWN_GROWTH_PER_MIN);
  enemySpawnInterval = Math.max(DIFFICULTY.SPAWN_MIN_INTERVAL, enemySpawnInterval);

  if (time > enemySpawnTimer + enemySpawnInterval) {
    const offsetX = Phaser.Math.Between(1500, 2000);
    let direction = (Math.random() < 0.8 ? 1 : -1);
    const spawnX = player.x + direction * offsetX;
    const groundY = findGroundYAtX(spawnX);
    if (groundY !== null) spawnEnemy(this, spawnX, false);
    enemySpawnTimer = time;
  }

  const activeEnemies = enemies.getChildren();

  // --- Enemy movement AI (with shooting while moving / holding) ---
  {
    const elapsedMin2 = (this.time.now - gameStartMs) / 60000;

    activeEnemies.forEach(e => {
      if (!e || !e.active) return;

      // face player
      e.flipX = (player.x < e.x);

      const dx = player.x - e.x;
      const absDx = Math.abs(dx);
      const dir = Math.sign(dx) || 1;

      const stopDist = e.attackDistance ?? 300;
      const baseSpd  = e.walkSpeed    ?? 90;
      const speed    = baseSpd * (1 + 0.15 * elapsedMin2);
      const DEAD     = 10; // deadzone to prevent oscillation

      // Jump if blocked or a step up is ahead
      const hereTop  = findGroundYAtX(e.x);
      const aheadTop = findGroundYAtX(e.x + dir * 30);
      const stepUp   = aheadTop < hereTop - 12;

      if ((e.body.blocked.left || e.body.blocked.right || stepUp) && e.body.onFloor()) {
        e.setVelocityY(-420);
      }

      // Move/hold based on distance
      if (absDx > stopDist + DEAD) {
        // too far: walk toward player
        e.setVelocityX(dir * speed);
        if (!e.isShooting && e.anims.currentAnim?.key !== 'enemy_walk') e.play('enemy_walk', true);

        // shoot while moving
        shootEnemyBullet(e, this);

      } else if (absDx < stopDist - DEAD) {
        // too close: back up a bit
        e.setVelocityX(-dir * speed * 0.6);
        if (!e.isShooting && e.anims.currentAnim?.key !== 'enemy_walk') e.play('enemy_walk', true);

        // shoot while moving
        shootEnemyBullet(e, this);

      } else {
        // sweet spot: stop and shoot
        e.setVelocityX(0);
        if (!e.isShooting && e.anims.currentAnim?.key !== 'enemy_idle') e.play('enemy_idle', true);

        // shoot while holding position
        shootEnemyBullet(e, this);
      }

      // Hard clamp giants so their feet stay on the terrain and they don't hover.
      if (e.isGiant) {
        const gy = findGroundYAtX(e.x);
        e.y = gy;
        e.body.velocity.y = 0;
      }
    });
  }

  // Player health bar above player
  updatePlayerHealthBar();

    // Movement & jumping
  if (moveLeftPressed && !moveRightPressed) {
    player.setVelocityX(-200);
  } else if (moveRightPressed && !moveLeftPressed) {
    player.setVelocityX(200);
  } else if (player.body.onFloor()) {
    player.setVelocityX(0);
  }

  if (moveUpPressed && player.body.onFloor() && !isJumping) {
    player.setVelocityY(jumpVelocity);
    isJumping = true;
    jumpStartTime = time;
  }
  if (!moveUpPressed && isJumping) {
    isJumping = false;
    if (player.body.velocity.y < 0) {
      player.setVelocityY(player.body.velocity.y * 0.5);
    }
  }
  if (isJumping && time - jumpStartTime > maxJumpTime) {
    isJumping = false;
  }

statusText.setText(`Distance: ${Math.floor(distanceTraveled)}m`);

  // Enemy HP bars
  activeEnemies.forEach(e => {
    const hb = enemyHealthBars.get(e);
    if (!hb) return;

    const curHp  = Phaser.Math.Clamp(enemyHealthMap.get(e) || 0, 0, e.maxHealth);
    const pct    = curHp / e.maxHealth;
    const fullW  = 24 * (e.maxHealth / ENEMY_BASE_HEALTH);

    const topY   = e.getBounds().top;
    const barH   = 6;
    const barX   = e.x - fullW / 2;
    const barY   = topY + 50;

    hb.clear();
    hb.fillStyle(0x000000).fillRect(barX - 1, barY - 1, fullW + 2, barH + 2);
    hb.fillStyle(0xff0000).fillRect(barX, barY, fullW * pct, barH);
  });

    // Player animations
  const currentAnim = player.anims.currentAnim && player.anims.currentAnim.key;
  if (currentAnim !== 'player_shoot') {
    if (moveLeftPressed && !moveRightPressed) {
      player.setVelocityX(-200);
      player.play('player_walk', true);
      player.flipX = true;
    } else if (moveRightPressed && !moveLeftPressed) {
      player.setVelocityX(200);
      player.play('player_walk', true);
      player.flipX = false;
    } else {
      if (player.body.onFloor()) {
        player.setVelocityX(0);
      }
      player.play('player_idle', true);
    }
  }

updateWeaponAndHealthUI(this);
}

// =====================
//  Terrain & Enemies
// =====================
function generateTerrain(scene, fromX, toX) {
  const maxStep = tileHeight * 2;
  let lastY = config.height - 50;

  for (let x = fromX; x <= toX; x += tileWidth) {
    const delta = Phaser.Math.Between(-tileHeight, tileHeight);
    let y = lastY + delta;

    y = Phaser.Math.Clamp(y, lastY - maxStep, lastY + maxStep);
    y = Phaser.Math.Clamp(y, config.height - 200, config.height - 50);

    lastY = y;
    const surfaceTile = ground.create(x, y, 'ground').setScale(2).refreshBody();
    terrainSurfaceBodies.push(surfaceTile.body);

    for (let fy = y + tileHeight; fy <= config.height; fy += tileHeight) {
      ground.create(x, fy, 'ground').setScale(2).refreshBody();
    }

    lastTerrainX = x;
  }
}

function findSurfaceTile(x) {
  let surfaceBody = null;
  let bestTop = Infinity;

  for (const b of terrainSurfaceBodies) {
    if (!b) continue;
    if (x >= b.left && x <= b.right) {
      if (b.top < bestTop) {
        bestTop = b.top;
        surfaceBody = b;
      }
    }
  }
  return surfaceBody;
}

function findGroundYAtX(x) {
  const body = findSurfaceTile(x);
  if (!body) return config.height - 50;
  return body.top;
}

function spawnEnemy(scene, x, isGiant = false) {
  const body = findSurfaceTile(x);
  if (!body) return;

  const topY = body.top;

  const e = enemies.create(x, topY, 'enemyidle')
    .setOrigin(0.5, 1)
    .setCollideWorldBounds(true);

  // Mark whether this is a giant enemy
  e.isGiant = !!isGiant;

  if (isGiant) {
    // Boss: 2× larger sprite and 2× larger hitbox.
    // We still keep the feet aligned with the ground.
    e.setScale(2);
    e.body.setSize(32 * 2, 80 * 2);
    // Keep the body centered; let it extend further upward.
    e.body.setOffset((128 - 32 * 2) / 2, 128 - 80 * 2);
  } else {
    e.body.setSize(32, 80);
    e.body.setOffset((128 - 32) / 2, 128 - 80);
  }
  e.body.allowGravity = true;

  // AI parameters
  e.attackDistance = Phaser.Math.Between(140, 380);
  e.walkSpeed      = Phaser.Math.Between(80, 110);
  e.lastShotTime   = 0;
  e.isShooting     = false;

  // time-based HP scaling
  const elapsedMin = (scene.time.now - gameStartMs) / 60000;
  const healthMult = 1 + elapsedMin * DIFFICULTY.HEALTH_GROWTH_PER_MIN;
  let maxHp        = Math.round(ENEMY_BASE_HEALTH * healthMult);

  // Giants have 10× the max HP of a normal enemy at this moment
  if (isGiant) {
    maxHp *= 10;
  }
  e.maxHealth = maxHp;
  enemyHealthMap.set(e, e.maxHealth);

  e.play('enemy_idle');

  const hb = scene.add.graphics();
  enemyHealthBars.set(e, hb);
}

// Spawn a giant enemy a bit ahead of the player on the terrain
function spawnGiantEnemy(scene) {
  if (!player) return;

  const cam = scene.cameras.main;
  const view = cam.worldView;

  // Prefer to spawn the boss just inside the right edge of the camera view
  // so you *always* see the giant that's shooting at you.
  let desiredX = view.x + view.width - 150;

  // Clamp to world bounds
  desiredX = Phaser.Math.Clamp(desiredX, player.x + 200, WORLD_WIDTH - 200);

  let body = findSurfaceTile(desiredX);

  if (!body) {
    // Fallback: try a bit closer in case terrain isn't generated that far yet
    const fallbackX = Phaser.Math.Clamp(player.x + 250, 0, WORLD_WIDTH - 200);
    body = findSurfaceTile(fallbackX);

    if (body) {
      desiredX = fallbackX;
    } else {
      // If we still can't find terrain, just bail out for this frame
      return;
    }
  }

  spawnEnemy(scene, desiredX, true);
}

// Helper: is an enemy in range to fire / valid target? (roughly on-screen + small margin)
function isEnemyInFiringRange(scene, enemy) {
  const cam = scene.cameras.main;
  const view = cam.worldView;

  const margin = 40;
  const expandedView = new Phaser.Geom.Rectangle(
    view.x - margin,
    view.y - margin,
    view.width + margin * 2,
    view.height + margin * 2
  );

  const enemyBounds = enemy.getBounds();
  return Phaser.Geom.Rectangle.Overlaps(expandedView, enemyBounds);
}

function shootEnemyBullet(enemy, scene) {
  // ===== ONLY SHOOT WHEN ENEMY IS (ROUGHLY) ON SCREEN =====
  if (!isEnemyInFiringRange(scene, enemy)) {
    return;
  }

  // Time‑scaled firing rate:
  // - Base: 1 shot per second for all enemies
  // - Enemies (including bosses) fire faster the longer you survive
  const elapsedMin = (scene.time.now - gameStartMs) / 60000;
  const BASE_INTERVAL_MS = 1000;          // 1 shot / second at t = 0
  const GROWTH_PER_MIN   = 0.25;          // 25% faster fire rate per minute

  const fireRateFactor   = 1 + elapsedMin * GROWTH_PER_MIN;
  const normalInterval   = BASE_INTERVAL_MS / fireRateFactor;

  const requiredInterval = normalInterval;
  if (scene.time.now - (enemy.lastShotTime || 0) < requiredInterval) {
    return;
  }
  enemy.lastShotTime = scene.time.now;

  enemy.isShooting = true;
  enemy.flipX = player.x < enemy.x;

  // Adjust muzzle height: bosses (giants) have a higher gun position.
  const baseOffsetX = 20;
  const baseOffsetY = 40;
  const giantOffsetY = 80; // boss muzzle is higher than regular enemies
    const giantOffsetX = 40;

  const MUZZLE_OFFSET_X = enemy.isGiant ? giantOffsetX : baseOffsetX;
  const MUZZLE_OFFSET_Y = enemy.isGiant ? giantOffsetY : baseOffsetY;

  const muzzleX = enemy.x + (enemy.flipX ? -MUZZLE_OFFSET_X : MUZZLE_OFFSET_X);
  const muzzleY = enemy.y - MUZZLE_OFFSET_Y;

  enemy.play('enemy_shoot');
  enemy.once('animationcomplete-enemy_shoot', () => {
    enemy.isShooting = false;
    const vx = Math.abs(enemy.body?.velocity?.x || 0);
    if (vx > 5) enemy.play('enemy_walk', true);
    else        enemy.play('enemy_idle', true);
  });

  const AIM_HEIGHT_RATIO = 0.3;
  const targetY = player.y - (player.displayHeight * AIM_HEIGHT_RATIO);
  const baseAngle = Math.atan2(targetY - muzzleY, player.x - muzzleX);

  const dmgMult = 1 + elapsedMin * DIFFICULTY.DAMAGE_GROWTH_PER_MIN;
  const minD = Math.round(ENEMY_BASE_DAMAGE_MIN * dmgMult);
  const maxD = Math.round(ENEMY_BASE_DAMAGE_MAX * dmgMult);

  // All enemies (including bosses) fire a single bullet with a 3 second travel limit.
  const b = enemyBullets.get(muzzleX, muzzleY);
  if (!b) return;

  b.setScale(0.01).setActive(true).setVisible(true);
  b.body.setCircle(6);
  b.body.allowGravity = false;
  b.body.setCollideWorldBounds(true).onWorldBounds = true;

  const rawD = Phaser.Math.Between(minD, maxD) * enemyDamageMultiplier;
  b.damage = Math.max(rawD, 0.5);

  const angle = baseAngle;
  b.body.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);

  // Timed travel limit (3s) for all enemy bullets
  scene.time.delayedCall(3000, () => { if (b.active) b.destroy(); });

  enemy.lastShotTime = scene.time.now;
}

// =====================
//  Shooting (player)
// =====================
function shootBullet() {
  const w = weapons[currentWeaponIndex];
  const s = weaponState[currentWeaponIndex];
  if (s.currentClip <= 0 || isReloading) return;

  s.currentClip--;
  bulletsFired[w.name] = (bulletsFired[w.name] || 0) + 1;

  player.flipX = (pointer.worldX < player.x);

  const MUZZLE_OFFSET_X = 20, MUZZLE_OFFSET_Y = 40;
  const muzzleX = player.x + (player.flipX ? -MUZZLE_OFFSET_X : MUZZLE_OFFSET_X);
  const muzzleY = player.y - MUZZLE_OFFSET_Y;

  if (w.name === "Shotgun") {
    const pelletCount = Phaser.Math.Between(10, 15);
    const spreadRad   = shotgunSpreadRad;

    for (let i = 0; i < pelletCount; i++) {
      const randomOffset = (Math.random() - 0.5) * spreadRad;
      const angle = Math.atan2(pointer.worldY - muzzleY, pointer.worldX - muzzleX) + randomOffset;

      const b = bullets.get(muzzleX, muzzleY);
      if (!b) continue;

      b.setActive(true).setVisible(true);
      b.body.setCircle(6);
      b.setScale(0.01);
      b.body.setCollideWorldBounds(true).onWorldBounds = true;
      b.body.allowGravity = false;

      b.damage     = Phaser.Math.Between(Math.floor(w.damageRange[0]), Math.floor(w.damageRange[1]));
      b.pierceLeft = PIERCE_COUNTS[w.name] || 1;
      b.hitEnemies = new Set();

      b.body.setVelocity(Math.cos(angle) * 600, Math.sin(angle) * 600);

      this.time.delayedCall(PLAYER_BULLET_LIFETIME_MS, () => { if (b.active) b.destroy(); });
    }
  } else {
    const angle = Math.atan2(pointer.worldY - muzzleY, pointer.worldX - muzzleX);

    const b = bullets.get(muzzleX, muzzleY);
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body.setCircle(6);
    b.setScale(0.01);
    b.body.setCollideWorldBounds(true).onWorldBounds = true;
    b.body.allowGravity = false;

    b.damage     = Phaser.Math.Between(Math.floor(w.damageRange[0]), Math.floor(w.damageRange[1]));
    b.pierceLeft = PIERCE_COUNTS[w.name] || 1;
    b.hitEnemies = new Set();

    if (w.name === "Sniper") b.isSniper = true;

    b.body.setVelocity(Math.cos(angle) * 600, Math.sin(angle) * 600);

    // Ensure non-shotgun bullets are cleaned up after a fixed lifetime
    this.time.delayedCall(PLAYER_BULLET_LIFETIME_MS, () => {
      if (b.active) b.destroy();
    });
  }

  player.play('player_shoot');
  player.once('animationcomplete-player_shoot', () => {
    if (player.body.velocity.x !== 0) player.play('player_walk', true);
    else player.play('player_idle', true);
  });

  updateWeaponAndHealthUI(this);
}

// =====================
//  Shop switching
// =====================
function switchTab(tabName) {
  currentTab = tabName;

  shopButtons.forEach(btn => btn.setVisible(shopVisible));

  shopTabButtons.forEach(btn       => btn.setVisible(shopVisible && tabName === 'shop'));
  upgradeTabButtons.forEach(btn    => btn.setVisible(shopVisible && tabName === 'upgrade'));
  pistolTabButtons.forEach(btn     => btn.setVisible(shopVisible && tabName === 'pistol'));
  shotgunTabButtons.forEach(btn    => btn.setVisible(shopVisible && tabName === 'shotgun'));
  sniperTabButtons.forEach(btn     => btn.setVisible(shopVisible && tabName === 'sniper'));
  machineGunTabButtons.forEach(btn => btn.setVisible(shopVisible && tabName === 'machinegun'));

  updateTabVisuals();
}

// =====================
//  START SCREEN
// =====================
function showStartScreen(scene) {
  gamePhase = 'start';
  gamePaused = true;
  scene.physics.world.pause();
  showStartMainScreen(scene);
}

function showStartMainScreen(scene) {
  clearStartScreen(scene);

  const centerX = config.width / 2;
  const centerY = config.height / 2;

  const overlay = scene.add.rectangle(centerX, centerY, config.width, config.height, 0x000000, 0.7)
    .setScrollFactor(0)
    .setDepth(4000);
  startScreenObjects.push(overlay);

  const panelW = 1120;
  const panelH = 850;

  const panel = scene.add.rectangle(centerX, centerY, panelW, panelH, 0x080f1f, 0.97)
    .setStrokeStyle(2, 0x38bdf8, 0.7)
    .setScrollFactor(0)
    .setDepth(4001);
  startScreenObjects.push(panel);

  const title = scene.add.text(centerX, centerY - 370, 'WWIII — ENDLESS DEFENSE', {
    font: 'bold 42px Arial',
    fill: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(title);

  const subtitle = scene.add.text(centerX, centerY - 322, 'FIELD BRIEFING', {
    font: 'bold 16px Arial',
    fill: '#38bdf8',
    letterSpacing: 5
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(subtitle);

  const b = controlBindings || getDefaultBindings();

  // Objective banner
  const objectiveY = centerY - 242;
  const objectiveBg = scene.add.rectangle(centerX, objectiveY, 1000, 110, 0x101b31, 1)
    .setStrokeStyle(2, 0x22c55e, 0.55)
    .setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(objectiveBg);

  const target = scene.add.graphics().setScrollFactor(0).setDepth(4003);
  target.lineStyle(5, 0x22c55e, 1).strokeCircle(centerX - 430, objectiveY, 30);
  target.lineStyle(3, 0x38bdf8, 1).strokeCircle(centerX - 430, objectiveY, 15);
  target.fillStyle(0xf97316, 1).fillCircle(centerX - 430, objectiveY, 5);
  target.lineStyle(2, 0xffffff, 0.7)
    .lineBetween(centerX - 468, objectiveY, centerX - 392, objectiveY)
    .lineBetween(centerX - 430, objectiveY - 38, centerX - 430, objectiveY + 38);
  startScreenObjects.push(target);

  const objectiveLabel = scene.add.text(centerX - 365, objectiveY - 30, 'YOUR OBJECTIVE', {
    font: 'bold 15px Arial', fill: '#4ade80', letterSpacing: 2
  }).setScrollFactor(0).setDepth(4003);
  const objectiveText = scene.add.text(centerX - 365, objectiveY - 2,
    'Survive the assault. Defeat enemies. Push farther.', {
      font: 'bold 23px Arial', fill: '#ffffff'
    }).setScrollFactor(0).setDepth(4003);
  const objectiveHint = scene.add.text(centerX - 365, objectiveY + 31,
    'Earn cash, improve your loadout, and set the highest distance.', {
      font: '17px Arial', fill: '#a9b7cc'
    }).setScrollFactor(0).setDepth(4003);
  startScreenObjects.push(objectiveLabel, objectiveText, objectiveHint);

  const sectionY = centerY - 130;
  const sectionTitle = (x, text) => {
    const heading = scene.add.text(x, sectionY, text, {
      font: 'bold 15px Arial', fill: '#94a3b8', letterSpacing: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4003);
    startScreenObjects.push(heading);
  };
  sectionTitle(centerX - 260, 'KEYBOARD');
  sectionTitle(centerX + 290, 'MOUSE');

  const drawKey = (x, y, key, label, accent = 0x38bdf8) => {
    const keyBg = scene.add.graphics().setScrollFactor(0).setDepth(4003);
    keyBg.fillStyle(0x17233a, 1).fillRoundedRect(x - 38, y - 34, 76, 68, 10);
    keyBg.lineStyle(2, accent, 0.9).strokeRoundedRect(x - 38, y - 34, 76, 68, 10);
    const keyText = scene.add.text(x, y - 4, normalizeKeyName(key), {
      font: 'bold 26px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
    const keyLabel = scene.add.text(x, y + 50, label, {
      font: '15px Arial', fill: '#cbd5e1', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
    startScreenObjects.push(keyBg, keyText, keyLabel);
  };

  const keyTopY = centerY - 55;
  drawKey(centerX - 375, keyTopY, b.weaponPrev, 'Previous');
  drawKey(centerX - 260, keyTopY, b.moveUp, 'Jump', 0x22c55e);
  drawKey(centerX - 145, keyTopY, b.weaponNext, 'Next');
  drawKey(centerX - 375, keyTopY + 130, b.moveLeft, 'Move left');
  drawKey(centerX - 260, keyTopY + 130, b.openShop, 'Shop', 0xf97316);
  drawKey(centerX - 145, keyTopY + 130, b.moveRight, 'Move right');
  drawKey(centerX - 260, keyTopY + 260, b.heal, 'Use medkit', 0xef4444);

  // Mouse diagram with alternating click indicators.
  const mouseX = centerX + 290;
  const mouseY = centerY + 30;
  const mouse = scene.add.graphics().setScrollFactor(0).setDepth(4003);
  mouse.fillStyle(0x17233a, 1).fillRoundedRect(mouseX - 85, mouseY - 120, 170, 240, 75);
  mouse.lineStyle(3, 0x38bdf8, 0.9).strokeRoundedRect(mouseX - 85, mouseY - 120, 170, 240, 75);
  mouse.lineStyle(2, 0x64748b, 1).lineBetween(mouseX, mouseY - 118, mouseX, mouseY - 25);
  mouse.lineBetween(mouseX - 83, mouseY - 25, mouseX + 83, mouseY - 25);
  mouse.fillStyle(0x64748b, 1).fillRoundedRect(mouseX - 8, mouseY - 89, 16, 45, 8);
  startScreenObjects.push(mouse);

  const leftClick = scene.add.circle(mouseX - 42, mouseY - 72, 18, 0x22c55e, 0.75)
    .setScrollFactor(0).setDepth(4004);
  const rightClick = scene.add.circle(mouseX + 42, mouseY - 72, 18, 0xf97316, 0.25)
    .setScrollFactor(0).setDepth(4004);
  startScreenObjects.push(leftClick, rightClick);
  scene.tweens.add({ targets: leftClick, alpha: { from: 1, to: 0.2 }, scale: { from: 0.75, to: 1.25 }, duration: 650, yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: rightClick, alpha: { from: 0.2, to: 1 }, scale: { from: 1.25, to: 0.75 }, duration: 650, yoyo: true, repeat: -1 });

  const fireLabel = scene.add.text(mouseX - 110, mouseY + 155, 'LEFT CLICK\nFIRE', {
    font: 'bold 16px Arial', fill: '#4ade80', align: 'center', lineSpacing: 5
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
  const reloadLabel = scene.add.text(mouseX + 110, mouseY + 155, 'RIGHT CLICK\nRELOAD', {
    font: 'bold 16px Arial', fill: '#fb923c', align: 'center', lineSpacing: 5
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
  const aimHint = scene.add.text(mouseX, mouseY + 215, 'MOVE MOUSE TO AIM', {
    font: 'bold 14px Arial', fill: '#94a3b8', letterSpacing: 2
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
  startScreenObjects.push(fireLabel, reloadLabel, aimHint);

  const PLAY_W = 260, PLAY_H = 64, PLAY_R = 14;
  const playY = centerY + 350;
  const playBg = scene.add.graphics().setScrollFactor(0).setDepth(4003);
  startScreenObjects.push(playBg);

  const drawPlayBtn = (fill, stroke = 0xffffff) => {
    playBg.clear()
      .fillStyle(fill, 1)
      .fillRoundedRect(centerX - PLAY_W / 2, playY - PLAY_H / 2, PLAY_W, PLAY_H, PLAY_R)
      .lineStyle(3, stroke)
      .strokeRoundedRect(centerX - PLAY_W / 2, playY - PLAY_H / 2, PLAY_W, PLAY_H, PLAY_R);
  };
  drawPlayBtn(0x22c55e);

  playBg.setInteractive(
    new Phaser.Geom.Rectangle(centerX - PLAY_W / 2, playY - PLAY_H / 2, PLAY_W, PLAY_H),
    Phaser.Geom.Rectangle.Contains
  );

  const playText = scene.add.text(centerX, playY, 'START RUN  ›', {
    font: 'bold 24px Arial',
    fill: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
  startScreenObjects.push(playText);

  playBg.on('pointerover', () => {
    drawPlayBtn(0x16a34a, 0xffff88);
    playText.setStyle({ fill: '#fef3c7' });
    scene.input.setDefaultCursor('pointer');
  });
  playBg.on('pointerout', () => {
    drawPlayBtn(0x22c55e, 0xffffff);
    playText.setStyle({ fill: '#ffffff' });
    scene.input.setDefaultCursor('default');
  });

  playBg.on('pointerdown', () => {
    clearStartScreen(scene);
    startRun(scene);
  });

  const CTRL_W = 210, CTRL_H = 48, CTRL_R = 12;
  const ctrlY = centerY + 350;
  const ctrlX = centerX - 265;
  const ctrlBg = scene.add.graphics().setScrollFactor(0).setDepth(4003);
  startScreenObjects.push(ctrlBg);

  const drawCtrlBtn = (fill, stroke = 0x38bdf8) => {
    ctrlBg.clear()
      .fillStyle(fill, 1)
      .fillRoundedRect(ctrlX - CTRL_W / 2, ctrlY - CTRL_H / 2, CTRL_W, CTRL_H, CTRL_R)
      .lineStyle(2, stroke)
      .strokeRoundedRect(ctrlX - CTRL_W / 2, ctrlY - CTRL_H / 2, CTRL_W, CTRL_H, CTRL_R);
  };
  drawCtrlBtn(0x111827, 0x38bdf8);

  ctrlBg.setInteractive(
    new Phaser.Geom.Rectangle(ctrlX - CTRL_W / 2, ctrlY - CTRL_H / 2, CTRL_W, CTRL_H),
    Phaser.Geom.Rectangle.Contains
  );

  const ctrlText = scene.add.text(ctrlX, ctrlY, 'CUSTOMIZE KEYS', {
    font: 'bold 16px Arial',
    fill: '#bfdbfe'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
  startScreenObjects.push(ctrlText);

  ctrlBg.on('pointerover', () => {
    drawCtrlBtn(0x0f172a, 0x93c5fd);
    ctrlText.setStyle({ fill: '#e5e7eb' });
    scene.input.setDefaultCursor('pointer');
  });
  ctrlBg.on('pointerout', () => {
    drawCtrlBtn(0x111827, 0x38bdf8);
    ctrlText.setStyle({ fill: '#bfdbfe' });
    scene.input.setDefaultCursor('default');
  });

  ctrlBg.on('pointerdown', () => {
    showControlSettingsScreen(scene);
  });

  const quickTip = scene.add.text(centerX + 265, ctrlY, 'TIP  •  KEEP MOVING', {
    font: 'bold 15px Arial', fill: '#94a3b8', letterSpacing: 1
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(quickTip);
}

function showControlSettingsScreen(scene) {
  clearStartScreen(scene);

  const centerX = config.width / 2;
  const centerY = config.height / 2;

  const overlay = scene.add.rectangle(centerX, centerY, config.width, config.height, 0x000000, 0.7)
    .setScrollFactor(0)
    .setDepth(4000);
  startScreenObjects.push(overlay);

  const panelW = 780;
  const panelH = 520;

  const panel = scene.add.rectangle(centerX, centerY, panelW, panelH, 0x111827, 0.96)
    .setStrokeStyle(3, 0x38bdf8, 0.8)
    .setScrollFactor(0)
    .setDepth(4001);
  startScreenObjects.push(panel);

  const title = scene.add.text(centerX, centerY - 200, 'Control Settings', {
    font: '34px Arial',
    fill: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(title);

  const subtitle = scene.add.text(centerX, centerY - 160, 'Click a key name, then press a new key to rebind.', {
    font: '18px Arial',
    fill: '#9ca3af'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(subtitle);

  const controlRows = [
    { action: 'moveLeft',  label: 'Move Left' },
    { action: 'moveUp',    label: 'Jump / Up' },
    { action: 'moveRight', label: 'Move Right' },
    { action: 'openShop',  label: 'Open Shop' },
    { action: 'weaponPrev',label: 'Previous Weapon' },
    { action: 'weaponNext',label: 'Next Weapon' },
    { action: 'heal',      label: 'Use Med Kit' }
  ];

  // moved up a bit so there's more space for Back + hint
  const controlsStartY = centerY - 110;
  const rowSpacing = 40;

  const controlValueTexts = {};
  const controlBgRects = [];

  controlRows.forEach((row, i) => {
    const y = controlsStartY + i * rowSpacing;

    const labelText = scene.add.text(centerX - 160, y, row.label, {
      font: '18px Arial',
      fill: '#e5e7eb',
      align: 'right'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(4002);
    startScreenObjects.push(labelText);

    const boxW = 90, boxH = 28;
    const boxX = centerX + 40;

    const rect = scene.add.rectangle(boxX, y, boxW, boxH, 0x020617, 0.95)
      .setStrokeStyle(2, 0x4b5563, 0.9)
      .setScrollFactor(0)
      .setDepth(4002)
      .setInteractive({ useHandCursor: true });
    startScreenObjects.push(rect);
    controlBgRects.push(rect);

    const keyName = controlBindings[row.action] || DEFAULT_BINDINGS[row.action];
    const text = scene.add.text(boxX, y, keyName, {
      font: '16px Arial',
      fill: '#e5e7eb'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4003);
    startScreenObjects.push(text);
    controlValueTexts[row.action] = text;

    const hoverOn = () => {
      rect.setStrokeStyle(2, 0x38bdf8, 1);
      scene.input.setDefaultCursor('pointer');
    };
    const hoverOff = () => {
      rect.setStrokeStyle(2, 0x4b5563, 0.9);
      scene.input.setDefaultCursor('default');
    };

    rect.on('pointerover', hoverOn);
    rect.on('pointerout', hoverOff);
    text.on('pointerover', hoverOn);
    text.on('pointerout', hoverOff);
  });

  // Hint just below the last row, above the Back button
  const hint = scene.add.text(
    centerX,
    controlsStartY + controlRows.length * rowSpacing - 10,
    'Some keys (Shift, Ctrl, Alt, Meta) are reserved and cannot be used.',
    { font: '14px Arial', fill: '#9ca3af' }
  ).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
  startScreenObjects.push(hint);

  // Rebinding logic
  const beginRebind = (action) => {
    const row = controlRows.find(r => r.action === action);
    subtitle.setText(`Press a key for "${row.label}"...`);

    scene.input.keyboard.once('keydown', (ev) => {
      const rawKey = ev.key;
      const invalid = ['Shift', 'Control', 'Alt', 'Meta'];
      if (invalid.includes(rawKey)) {
        subtitle.setText('That key cannot be used. Try another.');
        scene.time.delayedCall(1000, () => {
          subtitle.setText('Click a key name, then press a new key to rebind.');
        });
        return;
      }

      const norm = normalizeKeyName(rawKey);
      controlBindings[action] = norm;
      saveControlBindings();
      if (controlValueTexts[action]) {
        controlValueTexts[action].setText(norm);
      }

      subtitle.setText('Click a key name, then press a new key to rebind.');
    });
  };

  controlRows.forEach((row, i) => {
    const rect = controlBgRects[i];
    const valueText = controlValueTexts[row.action];

    const startRebind = () => {
      beginRebind(row.action);
    };

    rect.on('pointerdown', startRebind);
    valueText.on('pointerdown', startRebind);
  });

  // Back button → return to main start screen (moved down a bit)
  const BACK_W = 180, BACK_H = 50, BACK_R = 12;
  const backY = centerY + panelH / 2 - 40;
  const backBg = scene.add.graphics().setScrollFactor(0).setDepth(4003);
  startScreenObjects.push(backBg);

  const drawBackBtn = (fill, stroke = 0x38bdf8) => {
    backBg.clear()
      .fillStyle(fill, 1)
      .fillRoundedRect(centerX - BACK_W / 2, backY - BACK_H / 2, BACK_W, BACK_H, BACK_R)
      .lineStyle(2, stroke)
      .strokeRoundedRect(centerX - BACK_W / 2, backY - BACK_H / 2, BACK_W, BACK_H, BACK_R);
  };
  drawBackBtn(0x111827, 0x38bdf8);

  backBg.setInteractive(
    new Phaser.Geom.Rectangle(centerX - BACK_W / 2, backY - BACK_H / 2, BACK_W, BACK_H),
    Phaser.Geom.Rectangle.Contains
  );

  const backText = scene.add.text(centerX, backY, 'Back', {
    font: '20px Arial',
    fill: '#bfdbfe'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(4004);
  startScreenObjects.push(backText);

  backBg.on('pointerover', () => {
    drawBackBtn(0x0f172a, 0x93c5fd);
    backText.setStyle({ fill: '#e5e7eb' });
    scene.input.setDefaultCursor('pointer');
  });
  backBg.on('pointerout', () => {
    drawBackBtn(0x111827, 0x38bdf8);
    backText.setStyle({ fill: '#bfdbfe' });
    scene.input.setDefaultCursor('default');
  });

  backBg.on('pointerdown', () => {
    showStartMainScreen(scene);
  });
}

// Actually begin gameplay (after start screen)
function startRun(scene) {
  gamePhase = 'playing';
  gamePaused = false;
  gameStartMs = scene.time.now;
  scene.physics.world.resume();
}

// =====================
//  Game Over (with auth bridge & no overlapping buttons)
// =====================
function showGameOver(scene) {
  // If we've already handled Game Over for this run, do nothing.
  if (hasSubmittedRun) {
    return;
  }
  hasSubmittedRun = true;


  // Pause gameplay
  gamePhase = 'gameover';
  gamePaused = true;
  scene.physics.world.pause();
  if (machineGunInterval) {
    machineGunInterval.remove();
    machineGunInterval = null;
  }

  const thisDistance = Math.floor(distanceTraveled);

  const runSummary = {
    distance: thisDistance,
    enemiesKilled,
    bulletsFired: {
      Pistol: bulletsFired.Pistol ?? 0,
      Shotgun: bulletsFired.Shotgun ?? 0,
      Sniper: bulletsFired.Sniper ?? 0,
      'Machine Gun': bulletsFired['Machine Gun'] ?? 0
    }
  };

  window.wwiiiPendingScore = runSummary;

  const w = window;
  const auth = w.auth;
  const currentUser = auth && auth.currentUser;
  const isSignedIn = !!currentUser;

  // Backdrop + panel
  scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.7)
    .setScrollFactor(0).setDepth(3000);
  scene.add.rectangle(960, 540, 760, 600, 0x222222, 0.95)
    .setStrokeStyle(4, 0xffffff).setScrollFactor(0).setDepth(3001);

  // Title + core stats
  scene.add.text(960, 420, 'GAME OVER', {
    font: '40px Arial', fill: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);

  scene.add.text(960, 460, `Distance: ${thisDistance} m`, {
    font: '22px Arial', fill: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);

  // Detailed run stats
  const rows = [
    `Enemies killed: ${enemiesKilled}`,
    `Pistol shots: ${bulletsFired.Pistol}`,
    `Shotgun shots: ${bulletsFired.Shotgun}`,
    `Sniper shots: ${bulletsFired.Sniper}`,
    `Machine Gun shots: ${bulletsFired['Machine Gun']}`
  ];
  const baseY = 480;
  const rowGap = 22;
  rows.forEach((line, i) => {
    scene.add.text(960, baseY + i * rowGap, line, {
      font: '20px Arial', fill: '#ffffff', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);
  });

  // Info text we keep updating
  const infoText = scene.add.text(
    960,
    600,
    'Calculating your place on the leaderboard…',
    { font: '18px Arial', fill: '#ffffff' }
  ).setOrigin(0.5).setScrollFactor(0).setDepth(3002);

  const setInfo = (msg) => infoText.setText(msg);

  // Play Again button (at the bottom) – goes back to START SCREEN via scene restart
  const BTN_X = 960, BTN_Y = 750, BTN_W = 220, BTN_H = 60, BTN_R = 12;
  const btnBg = scene.add.graphics().setScrollFactor(0).setDepth(3002);
  const drawBtn = (fill, stroke = 0xffffff) => {
    btnBg
      .clear()
      .fillStyle(fill, 1)
      .fillRoundedRect(BTN_X - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H, BTN_R)
      .lineStyle(3, stroke)
      .strokeRoundedRect(BTN_X - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H, BTN_R);
  };
  drawBtn(0x0077cc);
  btnBg.setInteractive(
    new Phaser.Geom.Rectangle(BTN_X - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H),
    Phaser.Geom.Rectangle.Contains
  );

  const btnText = scene.add.text(BTN_X, BTN_Y, 'Play Again', {
    font: '28px Arial', fill: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3003);

  btnBg.on('pointerover', () => {
    drawBtn(0x0090ff, 0xffff88);
    btnText.setStyle({ fill: '#ffff00' });
  });
  btnBg.on('pointerout', () => {
    drawBtn(0x0077cc, 0xffffff);
    btnText.setStyle({ fill: '#ffffff' });
  });

  let authBg = null;
  let authText = null;
  let promptText = null;

  const onRunSaved = (evt) => {
    const detail = (evt && evt.detail) || {};
    const name =
      detail.name ||
      (auth && auth.currentUser && (auth.currentUser.displayName || auth.currentUser.email)) ||
      'your account';

    setInfo(`Saved as ${name}. Your score is now on the leaderboard.`);

    if (promptText) promptText.setVisible(false);
    if (authBg) {
      authBg.disableInteractive();
      authBg.clear();
    }
    if (authText) authText.setVisible(false);
  };

  window.addEventListener('wwiii-run-saved', onRunSaved);

  const hardRestartToStartScreen = () => {
    window.removeEventListener('wwiii-run-saved', onRunSaved);

    scene.tweens.killAll();
    scene.time.removeAllEvents();
    scene.physics.world.resume();
    gamePaused = false;
    if (machineGunInterval) {
      machineGunInterval.remove();
      machineGunInterval = null;
    }

    setTimeout(() => {
      const key = scene.scene.key;
      scene.scene.stop(key);
      scene.scene.start(key); // create() → showStartScreen()
    }, 0);
  };

  btnBg.on('pointerdown', () => {
    btnBg.disableInteractive();
    btnText.setText('Restarting…');
    scene.input.setDefaultCursor('default');

    if (window.adGate && typeof window.adGate.consumeOrGate === 'function') {
      window.adGate.consumeOrGate(hardRestartToStartScreen);
    } else {
      hardRestartToStartScreen();
    }
  });

  // ----------------------
  //  Leaderboard + saving
  // ----------------------
  (async () => {
    try {
      if (isSignedIn) {
        const displayName =
          (currentUser.displayName || currentUser.email || 'Player')
            .trim()
            .slice(0, 24);
        setInfo(`Saving as ${displayName}…`);
        window.dispatchEvent(new CustomEvent('wwiii-score-ready', { detail: { run: runSummary } }));
      } else {
        setInfo('Sign in to save this run and calculate your rank.');

        promptText = scene.add.text(
          960,
          630,
          'Log in or sign up to save this score.',
          { font: '18px Arial', fill: '#ffffff' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(3002);

        const AUTH_X = 960, AUTH_Y = 690, AUTH_W = 260, AUTH_H = 50, AUTH_R = 10;
        authBg = scene.add.graphics().setScrollFactor(0).setDepth(3002);
        const drawAuthBtn = (fill, stroke = 0xffffff) => {
          authBg
            .clear()
            .fillStyle(fill, 1)
            .fillRoundedRect(AUTH_X - AUTH_W / 2, AUTH_Y - AUTH_H / 2, AUTH_W, AUTH_H, AUTH_R)
            .lineStyle(2, stroke, 1)
            .strokeRoundedRect(AUTH_X - AUTH_W / 2, AUTH_Y - AUTH_H / 2, AUTH_W, AUTH_H, AUTH_R);
        };
        drawAuthBtn(0x444444);

        authBg.setInteractive(
          new Phaser.Geom.Rectangle(AUTH_X - AUTH_W / 2, AUTH_Y - AUTH_H / 2, AUTH_W, AUTH_H),
          Phaser.Geom.Rectangle.Contains
        );

        authText = scene.add.text(
          AUTH_X,
          AUTH_Y,
          'Log in / Sign up',
          { font: '20px Arial', fill: '#ffffff' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(3003);

        authBg.on('pointerover', () => {
          drawAuthBtn(0x666666, 0xffff88);
          authText.setStyle({ fill: '#ffff99' });
        });
        authBg.on('pointerout', () => {
          drawAuthBtn(0x444444, 0xffffff);
          authText.setStyle({ fill: '#ffffff' });
        });

        authBg.on('pointerdown', () => {
          try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.wwiiiPendingScore = {
                distance: runSummary.distance,
                enemiesKilled: runSummary.enemiesKilled,
                bulletsFired: runSummary.bulletsFired
              };

              window.dispatchEvent(
                new CustomEvent('wwiii-open-auth', {
                  detail: { run: window.wwiiiPendingScore }
                })
              );
            }
          } catch (e) {
            console.error('Failed to dispatch wwiii-open-auth event', e);
          }
        });
      }
    } catch (err) {
      console.error('Error computing rank', err);
      setInfo('Could not compute your leaderboard place.');
    }
  })();
}
