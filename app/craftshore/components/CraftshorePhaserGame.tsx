"use client";

import { useEffect, useRef } from "react";

// Type-only import so TS has types, but this is erased at runtime
import type * as PhaserType from "phaser";

type Building = { id: string; type: string; gridX: number };

type CraftshorePhaserGameProps = {
  gridWidthInTiles: number;
  tileSize: number;
  groundY: number;
  buildings: Building[];
  // Callbacks to let React update resources/skills
  onMine?: () => void;
  onFarm?: () => void;
  onChopWood?: () => void;
  onBarracksInteract?: () => void;
  onMarketInteract?: () => void;
};

// Match roughly your sky image height so we don't get weird repeats
const WORLD_HEIGHT = 540;

export default function CraftshorePhaserGame(
  props: CraftshorePhaserGameProps
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserType.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return; // prevent double init

    let cancelled = false;
    const worldWidth = props.gridWidthInTiles * props.tileSize;

    async function initGame() {
      const Phaser = (await import("phaser")) as typeof PhaserType;
      if (cancelled || !containerRef.current) return;

      class CraftshoreScene extends Phaser.Scene {
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private wasd!: {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
        };
        private interactKey!: Phaser.Input.Keyboard.Key;

        private player!: Phaser.GameObjects.Rectangle & {
          body: Phaser.Physics.Arcade.Body;
        };

        private buildingPositions: { type: string; x: number }[] = [];

        // Background layers as plain images (no tileSprite so we don't repeat vertically)
        private bgSky?: Phaser.GameObjects.Image;
        private bgMountains?: Phaser.GameObjects.Image;
        private bgTreeline?: Phaser.GameObjects.Image;

        constructor() {
          super("CraftshoreScene");
        }

        preload() {
          // --- BACKGROUNDS ---
          this.load.image("bg_sky", "/craftshore/bg/sky.png");
          this.load.image("bg_mountains", "/craftshore/bg/mountains.png");
          this.load.image("bg_treeline", "/craftshore/bg/treeline.png");

          // --- GROUND TILES ---
          this.load.image("tile_ground1", "/craftshore/tiles/ground_1.png");
          this.load.image("tile_ground2", "/craftshore/tiles/ground_2.png");
          this.load.image("tile_ground3", "/craftshore/tiles/ground_3.png");
          this.load.image("tile_ground4", "/craftshore/tiles/ground_4.png");
          this.load.image("tile_ground5", "/craftshore/tiles/ground_5.png");

          this.load.image(
            "tile_ground_side_left",
            "/craftshore/tiles/ground_side_left.png"
          );
          this.load.image(
            "tile_ground_side_right",
            "/craftshore/tiles/ground_side_right.png"
          );
        }

        create() {
          const W = this.scale.width; // 1280 from config
          const H = this.scale.height; // WORLD_HEIGHT

          // World bounds & camera
          this.cameras.main.setBackgroundColor(0x020617);
          this.cameras.main.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
          this.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);

          // --------------------------------
          // BACKGROUND LAYERS (NO REPEATING)
          // --------------------------------
          // Sky: fills whole viewport, static to camera
          this.bgSky = this.add
            .image(0, 0, "bg_sky")
            .setOrigin(0, 0)
            .setScrollFactor(0);

          this.bgSky.setDisplaySize(W, H);

          // Mountains: parallax, slightly slower than camera
          this.bgMountains = this.add
            .image(0, H, "bg_mountains")
            .setOrigin(0, 1)
            .setScrollFactor(0.25);

          // Stretch horizontally so it covers the world nicely
          const mTex = this.textures.get("bg_mountains").getSourceImage() as
            | HTMLImageElement
            | HTMLCanvasElement;
          if (mTex && this.bgMountains) {
            const scaleX = worldWidth / mTex.width;
            this.bgMountains.setDisplaySize(worldWidth, mTex.height * scaleX);
          }

          // Treeline: a bit faster
          this.bgTreeline = this.add
            .image(0, H, "bg_treeline")
            .setOrigin(0, 1)
            .setScrollFactor(0.5);

          const tTex = this.textures.get("bg_treeline").getSourceImage() as
            | HTMLImageElement
            | HTMLCanvasElement;
          if (tTex && this.bgTreeline) {
            const scaleX = worldWidth / tTex.width;
            this.bgTreeline.setDisplaySize(worldWidth, tTex.height * scaleX);
          }

          // --------------------------------
          // GROUND TILES (VISUAL) + COLLIDER
          // --------------------------------
          const groundTileKeys = [
            "tile_ground1",
            "tile_ground2",
            "tile_ground3",
            "tile_ground4",
            "tile_ground5",
          ];

          // Visual tiles – we scale them so they match your grid size
          for (let x = 0; x < props.gridWidthInTiles; x++) {
            const key = Phaser.Utils.Array.GetRandom(groundTileKeys);
            const worldX = x * props.tileSize + props.tileSize / 2;

            const tile = this.add
              .image(worldX, props.groundY, key)
              .setOrigin(0.5, 1)
              .setDepth(5);

            // Scale to fill the 64px grid width
            const baseW = tile.width || 48;
            const scale = props.tileSize / baseW;
            tile.setScale(scale);
          }

          // Optional left/right caps if you’re using them
          if (this.textures.exists("tile_ground_side_left")) {
            const leftCap = this.add
              .image(0, props.groundY, "tile_ground_side_left")
              .setOrigin(1, 1)
              .setDepth(5);
            const baseW = leftCap.width || 48;
            leftCap.setScale(props.tileSize / baseW);
          }

          if (this.textures.exists("tile_ground_side_right")) {
            const rightCap = this.add
              .image(worldWidth, props.groundY, "tile_ground_side_right")
              .setOrigin(0, 1)
              .setDepth(5);
            const baseW = rightCap.width || 48;
            rightCap.setScale(props.tileSize / baseW);
          }

          // Invisible physics ground so the player can stand
          const groundCollider = this.add.rectangle(
            worldWidth / 2,
            props.groundY + 4, // just slightly below the tile bottoms
            worldWidth,
            12,
            0xffffff,
            0
          ) as Phaser.GameObjects.Rectangle & {
            body: Phaser.Physics.Arcade.StaticBody;
          };
          this.physics.add.existing(groundCollider, true);

          // ----------------
          // PLAYER
          // ----------------
          this.player = this.add.rectangle(
            200,
            props.groundY - 40,
            32,
            48,
            0xf97316
          ) as Phaser.GameObjects.Rectangle & {
            body: Phaser.Physics.Arcade.Body;
          };
          this.physics.add.existing(this.player);

          this.player.body.setCollideWorldBounds(true);
          this.player.body.setGravityY(800);
          this.player.body.setBounce(0.05);

          // Collisions
          this.physics.add.collider(this.player, groundCollider);

          // ----------------
          // BUILDINGS
          // ----------------
          const buildingColorByType: Record<string, number> = {
            mine: 0x9ca3af, // gray
            farm: 0x22c55e, // green
            logging_camp: 0x8b5cf6, // purple
            barracks: 0xef4444, // red
            market: 0xfacc15, // yellow
          };

          props.buildings.forEach((b) => {
            const x = b.gridX * props.tileSize + props.tileSize / 2;

            const color = buildingColorByType[b.type] ?? 0x64748b;

            const rect = this.add.rectangle(
              x,
              props.groundY - 72,
              props.tileSize,
              112,
              color
            );
            rect.setStrokeStyle(2, 0x020617);
            rect.setDepth(6);

            const label = this.add.text(
              x,
              props.groundY - 120,
              b.type.replace("_", " "),
              {
                fontSize: "12px",
                color: "#e5e7eb",
              }
            );
            label.setOrigin(0.5);
            label.setDepth(7);

            this.buildingPositions.push({ type: b.type, x });
          });

          // Debug grid lines (very faint, behind everything)
          for (let i = 0; i <= props.gridWidthInTiles; i++) {
            const x = i * props.tileSize;
            const line = this.add
              .line(0, 0, x, 0, x, WORLD_HEIGHT, 0x111827, 0.25)
              .setOrigin(0, 0);
            line.setDepth(-5);
          }

          // Camera follows player
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

          // Controls
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.wasd = {
            up: this.input.keyboard!.addKey(
              Phaser.Input.Keyboard.KeyCodes.W
            ),
            down: this.input.keyboard!.addKey(
              Phaser.Input.Keyboard.KeyCodes.S
            ),
            left: this.input.keyboard!.addKey(
              Phaser.Input.Keyboard.KeyCodes.A
            ),
            right: this.input.keyboard!.addKey(
              Phaser.Input.Keyboard.KeyCodes.D
            ),
          };
          this.interactKey = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
          );

          // Helper text (fixed to camera)
          this.add
            .text(40, 20, "Move: WASD or arrows   •   Interact: E", {
              fontSize: "12px",
              color: "#9ca3af",
            })
            .setScrollFactor(0, 0)
            .setDepth(20);
        }

        update() {
          if (!this.player) return;

          const body = this.player.body;
          const speed = 260;

          const leftPressed =
            this.cursors.left?.isDown || this.wasd.left.isDown;
          const rightPressed =
            this.cursors.right?.isDown || this.wasd.right.isDown;
          const upPressed =
            this.cursors.up?.isDown || this.wasd.up.isDown;

          if (leftPressed) {
            body.setVelocityX(-speed);
          } else if (rightPressed) {
            body.setVelocityX(speed);
          } else {
            body.setVelocityX(0);
          }

          const onGround = body.blocked.down || body.touching.down;
          if (upPressed && onGround) {
            body.setVelocityY(-500);
          }

          // Interact (E)
          if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            const threshold = props.tileSize * 0.8;

            let closest: { type: string; x: number } | null = null;
            let closestDist = Infinity;

            for (const b of this.buildingPositions) {
              const dist = Math.abs(this.player.x - b.x);
              if (dist < closestDist && dist <= threshold) {
                closestDist = dist;
                closest = b;
              }
            }

            if (closest) {
              let text = "";

              if (closest.type === "mine" && props.onMine) {
                props.onMine();
                text = "+1 ore";
              } else if (closest.type === "farm" && props.onFarm) {
                props.onFarm();
                text = "+1 food";
              } else if (
                closest.type === "logging_camp" &&
                props.onChopWood
              ) {
                props.onChopWood();
                text = "+1 wood";
              } else if (
                closest.type === "barracks" &&
                props.onBarracksInteract
              ) {
                props.onBarracksInteract();
                text = "Barracks";
              } else if (
                closest.type === "market" &&
                props.onMarketInteract
              ) {
                props.onMarketInteract();
                text = "Expeditions";
              }

              if (text) {
                const floatText = this.add
                  .text(this.player.x, this.player.y - 40, text, {
                    fontSize: "12px",
                    color: "#f97316",
                  })
                  .setOrigin(0.5);

                this.tweens.add({
                  targets: floatText,
                  y: floatText.y - 30,
                  alpha: 0,
                  duration: 600,
                  onComplete: () => floatText.destroy(),
                });
              }
            }
          }
        }
      }

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 1280,
        height: WORLD_HEIGHT,
        parent: containerRef.current!,
        backgroundColor: "#020617",
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: CraftshoreScene,
      };

      gameRef.current = new Phaser.Game(config);
    }

    void initGame();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [
    props.gridWidthInTiles,
    props.tileSize,
    props.groundY,
    props.buildings,
    props.onMine,
    props.onFarm,
    props.onChopWood,
    props.onBarracksInteract,
    props.onMarketInteract,
  ]);

  return (
    <div
      ref={containerRef}
      // Fixed height that matches WORLD_HEIGHT so it stops changing
      className="w-full h-[540px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
    />
  );
}
