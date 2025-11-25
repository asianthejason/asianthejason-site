// app/api/craftshore/state/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // TODO: replace this with real user & DB lookup
  const state = {
    townName: "Frontier Haven",
    playerName: "Pioneer_001",
    resources: {
      wood: 120,
      stone: 80,
      ore: 35,
      food: 50,
      gold: 10,
    },
    // basic building slots we'll mirror visually in Phaser
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
  };

  return NextResponse.json(state);
}
