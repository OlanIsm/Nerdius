const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// Run the renderer-independent TypeScript simulation with the installed compiler.
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { FantasyGame } = require("../frontend/src/game/FantasyGame.ts");
const { WORLD } = require("../frontend/src/game/level.ts");


function advance(game, seconds) {
  for (let tick = 0; tick < seconds * 60; tick++) game.update(1 / 60);
}
function coverage(game) {
  const ordered = [...game.chunks.pool].sort((a, b) => a.y - b.y);
  assert(ordered[0].y <= 0, "camera top covered");
  assert(ordered.at(-1).y + WORLD.chunkHeight >= game.chunks.viewportHeight - 0.001, "camera bottom covered");
  for (let i = 1; i < ordered.length; i++) assert(Math.abs(ordered[i].y - ordered[i - 1].y - WORLD.chunkHeight) < 0.001, "chunks join without gaps");
}

const game = new FantasyGame(780);
const hero = game.playerY;
const counts = [];
let stoppedAt = 0;
let walkingFrames = 0;
for (let frame = 0; frame < 30000 && game.state !== "result"; frame++) {
  const state = game.state;
  const distance = game.distance;
  if (state === "walking") walkingFrames++;
  game.update(1 / 60);
  coverage(game);
  assert.equal(game.playerY, hero, "hero stays fixed");
  if (state !== "walking") assert.equal(game.distance, distance, "world frozen outside walking");
  if (state === "walking" && game.state === "encounterStarting") {
    assert(Math.abs(walkingFrames / 60 - (game.cleared ? 5.5 : WORLD.walkSeconds)) <= 1 / 60, "each kill is followed by a full walk");
    walkingFrames = 0;
  }
  if (game.state === "encounter" || game.state === "bossEncounter") {
    counts.push(game.encounter.count);
    stoppedAt = game.distance;
    const positions = game.chunks.pool.map((chunk) => chunk.y);
    advance(game, 1);
    assert.deepEqual(game.chunks.pool.map((chunk) => chunk.y), positions, "encounter cannot drift");
    game.defeatEnemy();
    game.completeEncounter(counts.length === 5);
    game.completeEncounter();
  }
}
assert.deepEqual(counts, [1, 1, 1, 1, 1], "one monster per encounter, continues beyond authored boss");
assert.equal(game.state, "result");
assert.equal(game.cleared, 5, "duplicate completion ignored");
assert(game.distance > stoppedAt, "final kill walks while collecting before result");
const fresh = new FantasyGame(780);
for (let i = 0; i < 300; i++) { fresh.chunks.advance(100); coverage(fresh); }
assert(fresh.chunks.recycled > 50, "pool cycles repeatedly");
game.continueTrail();
game.togglePause();
const paused = game.distance;
advance(game, 2);
assert.equal(game.distance, paused);
game.togglePause();
game.triggerEncounter();
advance(game, 2);
assert.equal(game.state, "encounter", "debug encounter reaches same FSM");
game.completeEncounter();
advance(game, 2);
assert.equal(game.state, "walking");
game.setSpeed(Infinity);
assert.equal(game.speed, WORLD.speed);
game.setSpeed(999);
assert.equal(game.speed, WORLD.maxSpeed);
game.setSpeed(-9);
assert.equal(game.speed, WORLD.minSpeed);
const beforeSpike = game.distance;
game.update(30);
assert(game.distance - beforeSpike <= WORLD.maxSpeed * WORLD.maxDelta, "suspended frame cannot teleport world");
const size = game.chunks.pool.length;
for (let n = 0; n < 20; n++) {
  game.resize(n % 2 ? 780 : 900);
  advance(game, 2);
  coverage(game);
}
assert(game.chunks.pool.length <= size + 2, "viewport resizing does not leak pooled chunks");
console.log("Traversal: fixed hero, kill-driven encounters, full walks, final collection walk, pooling, pause and resize passed.");
