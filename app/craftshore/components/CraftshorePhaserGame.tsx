// app/craftshore/components/CraftshorePhaserGame.tsx
"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

type CraftshorePhaserGameProps = {
  gridWidthInTiles: number;
  tileSize: number;
  groundY: number;
  buildings: { id: string; type: string; gridX: number }[];
};

const WORLD_HEIGHT = 600;

export default function CraftshorePhaserGame(props: CraftshorePhaserGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return; // prevent double init

    const worldWidth = props.gridWidthInTiles * props.tileSize;

    class CraftshoreScene extends Phaser.Scene {
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private player!: Phaser.GameObjects.Rectangle & {
        body: Phaser.Physics.Arcade.Body;
      };

      constructor() {
        super("CraftshoreScene");
      }

      preload() {
        // no assets yet - using rectangles
      }

      create() {
        // World bounds & camera
        this.cameras.main.setBackgroundColor(0x0f172a); // slate-900
        this.cameras.main.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
        this.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);

        // Simple parallax-style background stripes for some visual depth
        const bg = this.add.rectangle(
          worldWidth / 2,
          WORLD_HEIGHT / 2,
          worldWidth,
          WORLD_HEIGHT,
          0x020617
        );
        bg.setDepth(-10);

        const distantHills = this.add.rectangle(
          worldWidth / 2,
          props.groundY - 150,
          worldWidth,
          200,
          0x1e293b
        );
        distantHills.setDepth(-5);

        // Ground
        const ground = this.add.rectangle(
          worldWidth / 2,
          props.groundY + 40,
          worldWidth,
          80,
          0x334155
        ) as Phaser.GameObjects.Rectangle & {
          body: Phaser.Physics.Arcade.StaticBody;
        };
        this.physics.add.existing(ground, true);

        // Player (simple rectangle for now)
        this.player = this.add.rectangle(
          200,
          props.groundY - 60,
          32,
          48,
          0xf97316 // orange-500
        ) as Phaser.GameObjects.Rectangle & {
          body: Phaser.Physics.Arcade.Body;
        };
        this.physics.add.existing(this.player);

        this.player.body.setCollideWorldBounds(true);
        this.player.body.setGravityY(800);
        this.player.body.setBounce(0.05);

        // Collisions
        this.physics.add.collider(this.player, ground);

        // Building slots -> colored rectangles & labels
        const buildingColorByType: Record<string, number> = {
          mine: 0x9ca3af, // gray
          farm: 0x22c55e, // green
          logging_camp: 0x8b5cf6, // purple
          barracks: 0xef4444, // red
          market: 0xfacc15, // yellow
        };

        props.buildings.forEach((b) => {
          const x =
            b.gridX * props.tileSize + props.tileSize / 2; // center of grid

          const color = buildingColorByType[b.type] ?? 0x64748b; // default slate

          const rect = this.add.rectangle(
            x,
            props.groundY - 64,
            props.tileSize,
            96,
            color
          );
          rect.setStrokeStyle(2, 0x020617);

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
        });

        // Grid hint lines (subtle)
        for (let i = 0; i <= props.gridWidthInTiles; i++) {
          const x = i * props.tileSize;
          const line = this.add
            .line(0, 0, x, 0, x, WORLD_HEIGHT, 0x1f2937, 0.4)
            .setOrigin(0, 0);
          line.setDepth(-1);
        }

        // Camera follows player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cursors = this.input.keyboard!.createCursorKeys();
      }

      update() {
        if (!this.cursors || !this.player) return;

        const body = this.player.body;
        const speed = 260;

        if (this.cursors.left?.isDown) {
          body.setVelocityX(-speed);
        } else if (this.cursors.right?.isDown) {
          body.setVelocityX(speed);
        } else {
          body.setVelocityX(0);
        }

        // Jump if on ground
        const onGround = body.blocked.down || body.touching.down;
        if (this.cursors.up?.isDown && onGround) {
          body.setVelocityY(-500);
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 960,
      height: WORLD_HEIGHT,
      parent: containerRef.current!,
      backgroundColor: "#020617",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 }, // we use per-body gravity
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

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [props.gridWidthInTiles, props.tileSize, props.groundY, props.buildings]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-5xl mx-auto aspect-[16/10] bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
    />
  );
}
