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

// =====================
//  Globals / State
// =====================
let isReloading = false;
let isMouseDown = false;
let machineGunInterval = null;

let player, keys, pointer;
let bullets, enemyBullets, enemies, ground;
let playerHealthBar;
// --- Run stats for Firebase leaderboard ---
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

let shopTabButtons = [];
let upgradeTabButtons = [];
let pistolTabButtons = [], shotgunTabButtons = [], sniperTabButtons = [], machineGunTabButtons = [];

let currentTab = 'shop';
let shopTabBg, shopTabText, upgradeTabBg, upgradeTabText;

let distanceTraveled = 0;
let lastTerrainX = 0, tileWidth = 64, tileHeight = 32;

let lastDirection = 1; // player look dir
let enemySpawnInterval = 3000;
let enemySpawnTimer = -enemySpawnInterval;

const maxJumpTime = 250, jumpVelocity = -500;
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
  'Sniper':      2,
  'Machine Gun': 2
};

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

let lastShotTime = 0;

// Player HP
let playerMaxHealth = 100;
let playerHealth    = 100;

// Shield
let shieldGroup, shieldBody, shieldKey;

// =====================
//  Preload
// =====================
function preload() {
  this.load.image('shield',     'assets/images/shield.png');
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
  scene.topStatusText.setText(`❤️ HP: ${hpDisplay}/${playerMaxHealth}   🔫 Damage: ${damageRange[0]} - ${damageRange[1]}`);
}

function updatePlayerHealthBar() {
  playerHealthBar.clear();
  const barWidth  = 40;
  const barHeight = 6;
  const x = player.x - barWidth / 2;
  const y = player.y - player.displayHeight / 2 - 12;

  // border
  playerHealthBar.fillStyle(0x000000);
  playerHealthBar.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

  // fill
  const pct = Phaser.Math.Clamp(playerHealth / playerMaxHealth, 0, 1);
  playerHealthBar.fillStyle(0x00ff00);
  playerHealthBar.fillRect(x, y, barWidth * pct, barHeight);
}

// -------- Pill quantity button (soft strokes so no harsh vertical rails) --------
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
  const BTN_W = 52, BTN_H = 30, R = 999; // pill

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

  const bg = scene.add.graphics()
    .setScrollFactor(0)
    .setDepth(2002)
    .setVisible(false);

  bg._hovered = false;
  bg._draw = () => {
    bg.clear();
    const fill   = bg._hovered ? 0x0b1120 : 0x020617;
    const stroke = bg._hovered ? 0x38bdf8 : 0x4b5563;

    bg.fillStyle(fill, 0.95)
      .fillRoundedRect(x - BTN_W/2, y - BTN_H/2, BTN_W, BTN_H, R);

    bg.lineStyle(2, stroke, bg._hovered ? 0.9 : 0.35)
      .strokeRoundedRect(x - BTN_W/2, y - BTN_H/2, BTN_W, BTN_H, R);
  };
  bg._draw();

  bg.setInteractive(
    new Phaser.Geom.Rectangle(x - BTN_W/2, y - BTN_H/2, BTN_W, BTN_H),
    Phaser.Geom.Rectangle.Contains
  )
  .on('pointerover', () => { bg._hovered = true;  bg._draw(); scene.input.setDefaultCursor('pointer'); })
  .on('pointerout',  () => { bg._hovered = false; bg._draw(); scene.input.setDefaultCursor('default'); })
  .on('pointerdown', buy);

  const text = scene.add.text(x, y, `x${qty}`, {
    font: '14px "Inter", Arial',
    fill: '#e5e7eb'
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2003)
    .setVisible(false)
    .setInteractive({ useHandCursor: true });

  text.on('pointerover', () => {
    bg._hovered = true;
    bg._draw();
    text.setStyle({ fill: '#f9fafb' });
  });
  text.on('pointerout',  () => {
    bg._hovered = false;
    bg._draw();
    text.setStyle({ fill: '#e5e7eb' });
  });
  text.on('pointerdown', buy);

  targetArray.push(bg, text);
  return { bg, text };
}

// -------- Shared upgrade row factory (card, softer borders) --------
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

  const divider = this.add.rectangle(x, y - 40, 520, 1, 0x1f2937, 0.7)
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

// -------- Tab button --------
function createTabButton(scene, x, y, label, tabName) {
  const width  = 130;
  const height = 40;
  const radius = 999; // pill

  const bg = scene.add.graphics()
    .setScrollFactor(0)
    .setDepth(2001)
    .setVisible(false)
    .setInteractive(
      new Phaser.Geom.Rectangle(x - width/2, y - height/2, width, height),
      Phaser.Geom.Rectangle.Contains
    )
    .on('pointerdown', () => {
      switchTab(tabName);
      updateTabVisuals();
    });

  bg.tabName = tabName;
  bg._hovered = false;

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

  const onOver = () => { bg._hovered = true;  bg._draw(); };
  const onOut  = () => { bg._hovered = false; bg._draw(); };
  const onDown = () => { switchTab(tabName); updateTabVisuals(); };

  bg.on('pointerover', onOver);   bg.on('pointerout', onOut);
  text.on('pointerover', onOver); text.on('pointerout', onOut);
  text.on('pointerdown', onDown);

  bg._draw = () => {
    const isActive  = currentTab === tabName;
    const isHovered = bg._hovered && !isActive;
    bg.clear();

    const fillColor =
      isActive  ? 0x0f172a :
      isHovered ? 0x020617 :
                  0x020617;

    const strokeColor =
      isActive  ? 0x38bdf8 :
      isHovered ? 0x4b5563 :
                  0x1f2937;

    bg.fillStyle(fillColor, isActive ? 0.95 : 0.75);
    bg.fillRoundedRect(x - width/2, y - height/2, width, height, radius);

    bg.lineStyle(2, strokeColor, isActive ? 0.9 : 0.4);
    bg.strokeRoundedRect(x - width/2, y - height/2, width, height, radius);

    text.setStyle({
      fill: isActive ? '#bfdbfe' : (isHovered ? '#f9fafb' : '#e5e7eb')
    });
  };

  bg._draw();

  return [bg, text];
}

function updateTabVisuals() {
  // everything handled in _draw()
}

// =====================
//  Create
// =====================
function create() {
  // Start timer for time-based difficulty
  gameStartMs = this.time.now;
    
  // --- HARD RESET of all run-scoped globals (prevents Play Again freeze) ---
  isReloading = false;
  isMouseDown = false;
  machineGunInterval = null;

  playerMoney = 0;
  playerMaxHealth = 100;
  playerHealth = 100;

  enemiesKilled = 0;
  bulletsFired.Pistol = 0;
  bulletsFired.Shotgun = 0;
  bulletsFired.Sniper = 0;
  bulletsFired['Machine Gun'] = 0;

  distanceTraveled = 0;
  lastTerrainX = 0;
  enemySpawnInterval = 3000;
  enemySpawnTimer = -enemySpawnInterval;

  shopVisible = false;
  gamePaused = false;

  // fresh containers for UI objects (old arrays held destroyed objects)
  shopButtons = [];
  shopTabButtons = [];
  upgradeTabButtons = [];
  pistolTabButtons = [];
  shotgunTabButtons = [];
  sniperTabButtons = [];
  machineGunTabButtons = [];

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

  // Animations
  this.anims.create({ key: 'player_idle', frames: this.anims.generateFrameNumbers('playeridle', { start: 0, end: 6 }), frameRate: 28, repeat: -1 });
  this.anims.create({ key: 'player_walk', frames: this.anims.generateFrameNumbers('playerrun',  { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
  this.anims.create({ key: 'player_shoot',frames: this.anims.generateFrameNumbers('playershot', { start: 0, end: 3 }), frameRate: 10, repeat: 0 });

  // Enemy animations
  this.anims.create({
    key: 'enemy_idle',
    frames: this.anims.generateFrameNumbers('enemyidle', { start: 0, end: 5 }),
    frameRate: 25,
    repeat: -1
  });
  this.anims.create({
    key: 'enemy_walk',
    frames: this.anims.generateFrameNumbers('enemyrun', { start: 0, end: 9 }),
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

  keys     = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D });
  shieldKey= this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  pointer  = this.input.activePointer;

  // Shield
  shieldGroup = this.physics.add.staticGroup();
  shieldBody  = shieldGroup.create(player.x, player.y, 'shield').setOrigin(0.5,1).setScale(0.05).setVisible(false);
  shieldBody.body.setSize(20, 80);
  shieldBody.body.setOffset((shieldBody.displayWidth - 20)/2, shieldBody.displayHeight - 80);
  shieldBody.refreshBody();
  shieldBody.body.enable = false;
  this.physics.add.overlap(enemyBullets, shieldGroup, b => b.destroy(), null, this);

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
      playerHealth -= damage;
      if (playerHealth <= 0) {
        playerHealth = 0;
        showGameOver(this);
      }
    },
    null,
    this
  );

  // Bullets vs enemies (pierce after damage)
  this.physics.add.overlap(bullets, enemies, (b, e) => {
    b.hitEnemies ??= new Set();
    if (b.hitEnemies.has(e)) return;
    b.hitEnemies.add(e);
    if (!e.active) return;

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

    const newHealth = (enemyHealthMap.get(e) || ENEMY_BASE_HEALTH) - damage;
    enemyHealthMap.set(e, newHealth);

    if (newHealth <= 0) {
      enemyHealthMap.delete(e);
      enemyHealthBars.get(e)?.destroy();
      enemyHealthBars.delete(e);
      playerMoney += ENEMY_KILL_REWARD * moneyMultiplier;
      moneyText.setText(`$${playerMoney}`);
      enemiesKilled++;
      e.destroy();
    }

    if (b.active) {
      b.pierceLeft = (b.pierceLeft ?? 1) - 1;
      if (b.pierceLeft <= 0) b.destroy();
    }
  });

  // Player health bar
  playerHealthBar = this.add.graphics().setDepth(1000);

  // Camera + world bounds
  this.physics.world.setBounds(0, 0, 100000, config.height);
  this.cameras.main.setBounds(0, 0, 100000, config.height);
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
  //  Shop panel (simpler + softer)
  // =====================
  shopPanel = this.add.rectangle(960, 540, 820, 520, 0x020617, 0.94)
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

  const panelSubtitle = this.add.text(960, subtitleY, 'Press F to open / close the shop', {
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

  const CONTENT_TOP   = tabY + 70;
  const ROW_SPACING   = 80;
  const UPG_SPACING   = 90;

  for (let i = 0; i < numTabs; i++) {
    const x = startX + i * tabSpacing;
    const [bg, text] = createTabButton(this, x, tabY, tabLabels[i], tabNames[i]);
    shopButtons.push(bg, text);
    switch (tabNames[i]) {
      case 'shop':    shopTabBg = bg;    shopTabText    = text; break;
      case 'upgrade': upgradeTabBg = bg; upgradeTabText = text; break;
    }
  }
  shopButtons.push(shopTabBg, shopTabText, upgradeTabBg, upgradeTabText);
  updateTabVisuals();

  // ===== Max Health +50 =====
  let upgradeY = CONTENT_TOP;
  const upgradeSpacing = UPG_SPACING;

  {
    const divider = this.add.rectangle(panelX, upgradeY - 40, 520, 1, 0x1f2937, 0.7)
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
        playerHealth     = Math.min(playerHealth, playerMaxHealth);
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
    4
  );
  upgradeY += upgradeSpacing;

  // ===== Weapon-tab upgrades =====
  const damageTabMap = {
    'Pistol':      pistolTabButtons,
    'Shotgun':     shotgunTabButtons,
    'Sniper':      sniperTabButtons,
    'Machine Gun': machineGunTabButtons
  };
  const contentStartY = CONTENT_TOP;

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
      1
    );
  });

  // ===== Shop Rows =====
  const CLIP_PRICES = { Pistol: 0, Shotgun: 5, Sniper: 5, "Machine Gun": 5 };

  weapons.forEach((w, i) => {
    const y = CONTENT_TOP + i * ROW_SPACING;

    if (i === 0) {
      const cost = 30;

      const FULL_W = 520, FULL_H = 68, fullX = 960;
      const fullBg = this.add.rectangle(fullX, y, FULL_W, FULL_H, 0x020617, 0.95)
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
        fullBg.setFillStyle(0x020617, 0.95);
        fullBg.setStrokeStyle(2, 0x38bdf8, 0.7);
        label.setStyle({ fill: '#e5e7eb' });
      };

      fullBg.on('pointerover', hoverOn);
      fullBg.on('pointerout',  hoverOff);
      label .on('pointerover', hoverOn);
      label .on('pointerout',  hoverOff);

      const buyKit = () => {
        if (playerMoney >= cost && playerHealth < playerMaxHealth) {
          playerMoney -= cost;
          playerHealth = playerMaxHealth;
          moneyText.setText(`$${playerMoney}`);
          updateWeaponAndHealthUI(this);
          updatePlayerHealthBar();
        } else if (playerHealth >= playerMaxHealth) {
          label.setText(`You're already at full HP!`);
          this.time.delayedCall(1000, () => label.setText(`Buy Medical Kit - $${cost}`));
        } else {
          label.setText(`Not enough money for Medical Kit`);
          this.time.delayedCall(1000, () => label.setText(`Buy Medical Kit - $${cost}`));
        }
      };
      fullBg.on('pointerdown', buyKit);
      label .on('pointerdown', buyKit);

      shopTabButtons.push(fullBg, label);
      return;
    }

    const cost = CLIP_PRICES[w.name];

    const divider = this.add.rectangle(960, y - 40, 520, 1, 0x1f2937, 0.7)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);
    shopTabButtons.push(divider);

    const rowBg = this.add.rectangle(960, y, 520, 68, 0x020617, 0.35)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);
    shopTabButtons.push(rowBg);

    const ROW_CENTER = 960;
    const MAIN_W = 320, MAIN_H = 52;
    const BTN_W = 52, BETWEEN = 8, GAP_FROM_MAIN = 14;

    const groupWidth = MAIN_W + GAP_FROM_MAIN + (BTN_W * 3) + (BETWEEN * 2);
    const groupLeft = ROW_CENTER - groupWidth / 2;
    const mainX = groupLeft + MAIN_W / 2;

    const mainBg = this.add.rectangle(mainX, y, MAIN_W, MAIN_H, 0x020617, 0.95)
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
      mainBg.setFillStyle(0x020617, 0.95);
      mainBg.setStrokeStyle(2, 0x374151, 0.45);
      label.setStyle({ fill: '#e5e7eb' });
    });

    const mainRightEdge = groupLeft + MAIN_W;
    const x10  = mainRightEdge + GAP_FROM_MAIN + BTN_W / 2;
    const x50  = x10  + BTN_W + BETWEEN;
    const x100 = x50  + BTN_W + BETWEEN;

    createQuantityButton(this, x10,  y, i, 10,  cost, label);
    createQuantityButton(this, x50,  y, i, 50,  cost, label);
    createQuantityButton(this, x100, y, i, 100, cost, label);

    shopTabButtons.push(label);
  });

  // Toggle shop (F) – only pause physics, NOT time (for snappy UI)
  this.input.keyboard.on('keydown-F', () => {
    if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;

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
    updateTabVisuals();
  });

  // Cycle weapons (E / Q)
  this.input.keyboard.on('keydown-E', () => {
    if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    currentWeaponIndex = (currentWeaponIndex + 1) % weapons.length;
    updateWeaponAndHealthUI(this);
  });
  this.input.keyboard.on('keydown-Q', () => {
    if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    currentWeaponIndex = (currentWeaponIndex - 1 + weapons.length) % weapons.length;
    updateWeaponAndHealthUI(this);
  });

  // Mouse shooting / reload
  this.input.on('pointerup', () => {
    isMouseDown = false;
    if (machineGunInterval) { machineGunInterval.remove(); machineGunInterval = null; }
  });

  this.input.on('pointerdown', p => {
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
      shootBullet.call(this);
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
}

// =====================
//  Update
// =====================
function update(time) {
  if (gamePaused) {
    player.setVelocityX(0);
    return;
  }

  const distanceScale = 22;
  distanceTraveled = Math.floor(player.x / distanceScale);

  if (player.x > lastTerrainX - config.width * 2)
    generateTerrain(this, lastTerrainX + tileWidth, lastTerrainX + 640);

  const elapsedMin = (this.time.now - gameStartMs) / 60000;
  enemySpawnInterval =
    DIFFICULTY.SPAWN_BASE_INTERVAL / (1 + elapsedMin * DIFFICULTY.SPAWN_GROWTH_PER_MIN);
  enemySpawnInterval = Math.max(DIFFICULTY.SPAWN_MIN_INTERVAL, enemySpawnInterval);

  if (time > enemySpawnTimer + enemySpawnInterval) {
    const offsetX = Phaser.Math.Between(1500, 2000);
    let direction = (Math.random() < 0.8 ? 1 : -1);
    const spawnX = player.x + direction * offsetX;
    const groundY = findGroundYAtX(spawnX);
    if (groundY !== null) spawnEnemy(this, spawnX);
    enemySpawnTimer = time;
  }

  {
    const elapsedMin2 = (this.time.now - gameStartMs) / 60000;

    enemies.getChildren().forEach(e => {
      if (!e || !e.active) return;

      e.flipX = (player.x < e.x);

      const dx = player.x - e.x;
      const absDx = Math.abs(dx);
      const dir = Math.sign(dx) || 1;

      const stopDist = e.attackDistance ?? 300;
      const baseSpd  = e.walkSpeed    ?? 90;
      const speed    = baseSpd * (1 + 0.15 * elapsedMin2);
      const DEAD     = 10;

      const hereTop  = findGroundYAtX(e.x);
      const aheadTop = findGroundYAtX(e.x + dir * 30);
      const stepUp   = aheadTop < hereTop - 12;

      if ((e.body.blocked.left || e.body.blocked.right || stepUp) && e.body.onFloor()) {
        e.setVelocityY(-420);
      }

      if (absDx > stopDist + DEAD) {
        e.setVelocityX(dir * speed);
        if (!e.isShooting && e.anims.currentAnim?.key !== 'enemy_walk') e.play('enemy_walk', true);
        shootEnemyBullet(e, this);
      } else if (absDx < stopDist - DEAD) {
        e.setVelocityX(-dir * speed * 0.6);
        if (!e.isShooting && e.anims.currentAnim?.key !== 'enemy_walk') e.play('enemy_walk', true);
        shootEnemyBullet(e, this);
      } else {
        e.setVelocityX(0);
        if (!e.isShooting && e.anims.currentAnim?.key !== 'enemy_idle') e.play('enemy_idle', true);
        shootEnemyBullet(e, this);
      }
    });
  }

  updatePlayerHealthBar();

  if (!shieldKey.isDown) {
    if (keys.left.isDown) { player.setVelocityX(-200); lastDirection = -1; }
    else if (keys.right.isDown) { player.setVelocityX(200); lastDirection = 1; }
    else if (player.body.onFloor()) player.setVelocityX(0);

    if (keys.up.isDown && player.body.onFloor() && !isJumping) {
      player.setVelocityY(jumpVelocity);
      isJumping = true; jumpStartTime = time;
    }
    if (!keys.up.isDown && isJumping) {
      isJumping = false;
      if (player.body.velocity.y < 0) player.setVelocityY(player.body.velocity.y * 0.5);
    }
    if (isJumping && time - jumpStartTime > maxJumpTime) isJumping = false;
  } else {
    player.setVelocityX(0);
  }

  if (shieldKey.isDown) {
    const cursorSide = pointer.worldX >= player.x ? 1 : -1;
    shieldBody.setVisible(true).setPosition(player.x + 25 * cursorSide, player.y);
    shieldBody.body.enable = true;
    shieldBody.refreshBody();
  } else {
    shieldBody.setVisible(false);
    shieldBody.body.enable = false;
    shieldBody.refreshBody();
  }

  statusText.setText(`Distance: ${Math.floor(distanceTraveled)}m`);

  enemies.getChildren().forEach(e => {
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

  if (shieldKey.isDown) {
    player.setVelocityX(0);
    player.play('player_idle', true);
  } else {
    const currentAnim = player.anims.currentAnim && player.anims.currentAnim.key;
    if (currentAnim !== 'player_shoot') {
      if (keys.left.isDown)  { player.setVelocityX(-200); player.play('player_walk', true); player.flipX = true; }
      else if (keys.right.isDown) { player.setVelocityX(200); player.play('player_walk', true); player.flipX = false; }
      else { if (player.body.onFloor()) player.setVelocityX(0); player.play('player_idle', true); }
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
    scene.physics.add.existing(ground);
    ground.create(x, y, 'ground').setScale(2).refreshBody();

    for (let fy = y + tileHeight; fy <= config.height; fy += tileHeight) {
      ground.create(x, fy, 'ground').setScale(2).refreshBody();
    }

    lastTerrainX = x;
  }
}

function findSurfaceTile(x) {
  let surfaceBody = null;
  let bestTop = Infinity;

  for (const tile of ground.getChildren()) {
    const b = tile.body;
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

function spawnEnemy(scene, x) {
  const body = findSurfaceTile(x);
  if (!body) return;

  const topY = body.top;

  const e = enemies.create(x, topY, 'enemyidle')
    .setOrigin(0.5, 1)
    .setCollideWorldBounds(true);

  e.body.setSize(32, 80);
  e.body.setOffset((128 - 32) / 2, 128 - 80);
  e.body.allowGravity = true;

  e.attackDistance = Phaser.Math.Between(140, 380);
  e.walkSpeed      = Phaser.Math.Between(80, 110);
  e.lastShotTime   = 0;
  e.isShooting     = false;

  const elapsedMin = (scene.time.now - gameStartMs) / 60000;
  const healthMult = 1 + elapsedMin * DIFFICULTY.HEALTH_GROWTH_PER_MIN;
  e.maxHealth      = Math.round(ENEMY_BASE_HEALTH * healthMult);
  enemyHealthMap.set(e, e.maxHealth);

  e.play('enemy_idle');

  const hb = scene.add.graphics();
  enemyHealthBars.set(e, hb);
}

function shootEnemyBullet(enemy, scene) {
  if (scene.time.now - (enemy.lastShotTime || 0) < 1000) return;

  enemy.isShooting = true;
  enemy.flipX = player.x < enemy.x;

  const MUZZLE_OFFSET_X = 20, MUZZLE_OFFSET_Y = 40;
  const muzzleX = enemy.x + (enemy.flipX ? -MUZZLE_OFFSET_X : MUZZLE_OFFSET_X);
  const muzzleY = enemy.y - MUZZLE_OFFSET_Y;

  enemy.play('enemy_shoot');
  enemy.once('animationcomplete-enemy_shoot', () => {
    enemy.isShooting = false;
    const vx = Math.abs(enemy.body?.velocity?.x || 0);
    if (vx > 5) enemy.play('enemy_walk', true);
    else        enemy.play('enemy_idle', true);
  });

  const b = enemyBullets.get(muzzleX, muzzleY);
  if (!b) return;

  b.setScale(0.01).setActive(true).setVisible(true);
  b.body.setCircle(6);
  b.body.allowGravity = false;
  b.body.setCollideWorldBounds(true).onWorldBounds = true;

  const elapsedMin = (scene.time.now - gameStartMs) / 60000;
  const dmgMult = 1 + elapsedMin * DIFFICULTY.DAMAGE_GROWTH_PER_MIN;
  const minD = Math.round(ENEMY_BASE_DAMAGE_MIN * dmgMult);
  const maxD = Math.round(ENEMY_BASE_DAMAGE_MAX * dmgMult);
  const rawD = Phaser.Math.Between(minD, maxD) * enemyDamageMultiplier;
  b.damage = Math.max(rawD, 0.5);

  const AIM_HEIGHT_RATIO = 0.3;
  const targetY = player.y - (player.displayHeight * AIM_HEIGHT_RATIO);
  const angle = Math.atan2(targetY - muzzleY, player.x - muzzleX);

  b.body.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);

  enemy.lastShotTime = scene.time.now;
  scene.time.delayedCall(3000, () => { if (b.active) b.destroy(); });
}

// =====================
//  Shooting (player)
// =====================
function shootBullet() {
  if (shieldKey.isDown) return;

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
    const spreadRad   = Phaser.Math.DegToRad(40);

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

      this.time.delayedCall(400, () => { if (b.active) b.destroy(); });
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

  shopTabBg._draw();
  upgradeTabBg._draw();
  shopButtons.forEach(b => b._draw?.());

  updateTabVisuals();
}

// =====================
//  Game Over
// =====================
function showGameOver(scene) {
  // (unchanged from your current version)
  // ...
}
