const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const source = ts.createSourceFile(
  "game.tsx",
  readFileSync("app/signal-bastion/page.tsx", "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const names = new Set([
  "PATH",
  "W",
  "H",
  "GENERATOR",
  "pointAt",
  "distanceToSegment",
  "validPadPosition",
  "hit",
  "rankScores",
  "coreReward",
  "TOWER_DATA",
  "TOWER_MAX_RANGE",
  "towerRangeCap",
  "towerRange",
  "playerLevel",
  "researchCost",
]);
const selected = source.statements
  .filter(
    (node) =>
      (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) ||
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((d) =>
          names.has(d.name.getText(source)),
        )),
  )
  .map((node) => node.getText(source))
  .join("\n");
const code = ts.transpileModule(selected, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const rules = vm.runInNewContext(
  code + ";({hit,rankScores,validPadPosition,coreReward,towerRange,playerLevel,researchCost})",
);
const enemy = (overrides) => ({
  id: 1,
  kind: "grunt",
  hp: 100,
  maxHp: 100,
  shield: 0,
  phaseClock: 0,
  progress: 100,
  ...overrides,
});
test("pads touch without overlap and avoid route/generator", () => {
  assert.equal(
    rules.validPadPosition({ x: 245, y: 165 }, [{ id: 1, x: 195, y: 165 }]),
    true,
  );
  assert.equal(
    rules.validPadPosition({ x: 244, y: 165 }, [{ id: 1, x: 195, y: 165 }]),
    false,
  );
  assert.equal(rules.validPadPosition({ x: 145, y: 105 }, []), false);
  assert.equal(rules.validPadPosition({ x: 455, y: 450 }, []), false);
});
test("dead and phased enemies cannot be damaged; shields absorb first", () => {
  const phased = enemy({ kind: "phase", phaseClock: 2.5 });
  rules.hit(phased, 100, [phased], 4);
  assert.equal(phased.hp, 100);
  const dead = enemy({ hp: 0 });
  rules.hit(dead, 10, [dead], 4);
  assert.equal(dead.hp, 0);
  const shielded = enemy({ shield: 30 });
  rules.hit(shielded, 40, [shielded], 4);
  assert.equal(shielded.hp, 90);
  assert.equal(shielded.shield, 0);
  assert.equal(shielded.hitAt, 4);
});
test("drone protection and armor reduce damage", () => {
  const armored = enemy({ kind: "juggernaut" });
  rules.hit(armored, 50, [armored], 1);
  assert.equal(armored.hp, 69);
  const target = enemy({});
  const drone = enemy({ id: 2, kind: "shield", progress: 120 });
  rules.hit(target, 40, [target, drone], 1);
  assert.equal(target.hp, 74);
});
test("scores rank by completed waves, bosses, then kills", () => {
  const rows = [
    { waves: 4, bosses_defeated: 1, enemies_defeated: 900 },
    { waves: 5, bosses_defeated: 0, enemies_defeated: 100 },
    { waves: 5, bosses_defeated: 1, enemies_defeated: 90 },
  ];
  rows.sort(rules.rankScores);
  assert.equal(rows[0].bosses_defeated, 1);
  assert.equal(rows[0].waves, 5);
  assert.equal(rows[2].waves, 4);
});
test("data cores reward milestones and bosses without rounding up", () => {
  assert.equal(rules.coreReward(4, 0), 0);
  assert.equal(rules.coreReward(5, 0), 1);
  assert.equal(rules.coreReward(19, 1), 5);
  assert.equal(rules.coreReward(20, 2), 8);
});
test("tower firing ranges stop growing at their combat caps", () => {
  const tower = { kind: "rail", level: 20 };
  assert.equal(rules.towerRange(tower, null), 220);
  assert.equal(rules.towerRange(tower, "longshot"), 220);
  assert.equal(rules.towerRange({ kind: "arc", level: 20 }, null), 175);
  assert.equal(rules.towerRange({ kind: "cryo", level: 20 }, null), 185);
  assert.equal(rules.towerRange({ kind: "miner", level: 20 }, null), 0);
});
test("commander level is the sum of all archive research levels", () => {
  const profile = {
    research: { longshot: 2, relay: 1, permafrost: 3, deepBore: 2 },
  };
  assert.equal(rules.playerLevel(profile), 8);
  assert.equal(rules.researchCost(0), 1);
  assert.equal(rules.researchCost(4), 5);
});
