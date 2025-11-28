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

// Slightly shorter world so we don't see extra space above/below
const WORLD_HEIGHT = 560;

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

        // Background layers (non-tiling images)
        private bgSky?: Phaser.GameObjects.Image;
        private bgMountains?: Phaser.GameObjects.Image;
        private bgTreeline?: Phaser.GameObjects.Image;

        constructor() {
          super("CraftshoreScene");
        }

        preload() {
          // Background layers
          this.load.image("bg_sky", "/craftshore/bg/sky.png");
          this.load.image("bg_mountains", "/craftshore/bg/mountains.png");
          this.load.image("bg_treeline", "/craftshore/bg/treeline.png");

          // Ground tiles
          this.load.image("tile_ground1", "/craftshore/tiles/ground_1.png");
          this.load.image("tile_ground2", "/craftshore/tiles/ground_2.png");
          this.load.image("tile_ground3", "/craftshore/tiles/ground_3.png");

          // Optional sides
          this.load.image(
            "tile_ground_side_left",
            "/craftshore/tiles/ground_side_left.png"
          );
          this.load.image(
            "tile_ground_side_right",
            "/craftshore/tiles/ground_side_right.png"
          );
        }

        private resizeBackgrounds(width: number, height: number) {
  // Negative offset pulls the whole background stack UP
  const BG_Y_OFFSET = 0;

  const fitLayer = (
    img: Phaser.GameObjects.Image | undefined,
    key: string
  ) => {
    if (!img || !this.textures.exists(key)) return;

    const tex = this.textures.get(key).getSourceImage() as any;
    const texW = tex?.width || width;
    const texH = tex?.height || height;

    // How far the main camera can scroll horizontally
    const maxScrollX = Math.max(0, worldWidth - width);

    // How “parallax-y” this layer is (0 = fixed to camera, 1 = full scroll)
    const f = img.scrollFactorX ?? 1;

    // Make the image wide enough so that, even when it slides with parallax,
    // it still covers the whole viewport at the furthest scroll position.
    const neededWidth = width + f * maxScrollX;
    const scale = neededWidth / texW;

    img.setScale(scale);

    const displayHeight = texH * scale;
    img.setPosition(0, height - displayHeight + BG_Y_OFFSET);
  };

  fitLayer(this.bgSky, "bg_sky");
  fitLayer(this.bgMountains, "bg_mountains");
  fitLayer(this.bgTreeline, "bg_treeline");
}


        create() {
          const W = this.scale.width;
          const H = this.scale.height;

          // --- NON-TILING PARALLAX BACKGROUND ---
          // Large images scaled uniformly to width. Parallax via scrollFactor.
          // No tiling, so no vertical repeat.

          this.bgSky = this.add
            .image(0, 0, "bg_sky")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-30);

          this.bgMountains = this.add
            .image(0, 0, "bg_mountains")
            .setOrigin(0, 0)
            .setScrollFactor(0.25) // slow parallax
            .setDepth(-20);

          this.bgTreeline = this.add
            .image(0, 0, "bg_treeline")
            .setOrigin(0, 0)
            .setScrollFactor(0.5) // a bit faster
            .setDepth(-10);

          this.resizeBackgrounds(W, H);

          // World bounds & camera
          this.cameras.main.setBackgroundColor(0x020617); // slate-950
          this.cameras.main.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
          this.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);

          // Invisible physics ground line. Player collides with THIS,
          // not the decorative tiles.
          const groundLine = this.add.rectangle(
            worldWidth / 2,
            props.groundY + 10,
            worldWidth,
            20,
            0x000000,
            0
          ) as Phaser.GameObjects.Rectangle & {
            body: Phaser.Physics.Arcade.StaticBody;
          };
          this.physics.add.existing(groundLine, true);

          // --- GROUND TILES (art only) ---
          // tileYOffset chosen so grass top sits on the physics ground.
          const groundTileKeys = [
            "tile_ground1",
            "tile_ground2",
            "tile_ground3",
          ];

          const tileYOffset = -24; // ground art is already tuned

          for (let x = 0; x < props.gridWidthInTiles; x++) {
            const key = Phaser.Utils.Array.GetRandom(groundTileKeys);
            this.add
              .image(x * props.tileSize, props.groundY + tileYOffset, key)
              .setOrigin(0, 0)
              .setDepth(5);
          }

          // Optional decorative sides at world edges
          if (this.textures.exists("tile_ground_side_left")) {
            this.add
              .image(0, props.groundY + tileYOffset, "tile_ground_side_left")
              .setOrigin(1, 0)
              .setDepth(5);
          }

          if (this.textures.exists("tile_ground_side_right")) {
            this.add
              .image(
                worldWidth,
                props.groundY + tileYOffset,
                "tile_ground_side_right"
              )
              .setOrigin(0, 0)
              .setDepth(5);
          }

          // Player
          this.player = this.add.rectangle(
            200,
            props.groundY - 40,
            32,
            48,
            0xf97316 // orange-500
          ) as Phaser.GameObjects.Rectangle & {
            body: Phaser.Physics.Arcade.Body;
          };
          this.physics.add.existing(this.player);

          this.player.body.setCollideWorldBounds(true);
          this.player.body.setGravityY(1000);
          this.player.body.setBounce(0.05);

          // Collisions
          this.physics.add.collider(this.player, groundLine);

          // Building slots
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

            // Move buildings DOWN a bit so they visually sit on the ground tiles
            const buildingHeight = 96;
            const rect = this.add.rectangle(
              x,
              props.groundY - 60, // was -72
              props.tileSize,
              buildingHeight,
              color
            );
            rect.setStrokeStyle(2, 0x020617);
            rect.setDepth(10);

            const label = this.add.text(
              x,
              props.groundY - 110, // lowered slightly with the rect
              b.type.replace("_", " "),
              {
                fontSize: "12px",
                color: "#e5e7eb",
              }
            );
            label.setOrigin(0.5);
            label.setDepth(10);

            this.buildingPositions.push({ type: b.type, x });
          });

        //   // Grid hint lines (very faint, behind everything)
        //   for (let i = 0; i <= props.gridWidthInTiles; i++) {
        //     const x = i * props.tileSize;
        //     const line = this.add
        //       .line(0, 0, x, 0, x, WORLD_HEIGHT, 0x1f2937, 0.4)
        //       .setOrigin(0, 0);
        //     line.setDepth(-5);
        //   }

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

          // Resize backgrounds when the canvas size changes (keep proportions)
          this.scale.on(
            "resize",
            (size: Phaser.Structs.Size) => {
              const { width, height } = size;
              this.resizeBackgrounds(width, height);
            },
            this
          );
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
            body.setVelocityY(-520);
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
      // This div is inside .craftshore-game-inner which already has aspect-ratio: 16/9
      className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
    />
  );
}
