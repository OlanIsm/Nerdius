import { GameActionError } from "../src/modules/game/battle.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyGameAction, initialGame } from "../src/modules/game/state.ts";
import { app } from "../src/app.ts";
import { readState } from "../src/modules/game/store.ts";

test("legacy tutorial gains questions without resetting saved resources or progress", async () => {
  const state = initialGame();
  state.gold = 237;
  state.xp = 200;
  state.expeditions[0].progress = 67;
  for (const region of state.expeditions[0].regions) delete region.questionBank;
  const uploaded = { ...structuredClone(state.expeditions[0]), id: "legacy-upload" };
  state.expeditions.push(uploaded);
  const row = { state, version: 7 };
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row, error: null }) };
  const client = { from: () => query } as unknown as Parameters<typeof readState>[0];
  const loaded = await readState(client, "legacy-user");
  assert.equal(loaded.version, 7);
  assert.equal(loaded.state.gold, 237);
  assert.equal(loaded.state.xp, 200);
  assert.equal(loaded.state.expeditions[0].progress, 67);
  assert.ok(loaded.state.expeditions[0].regions.every((region) => region.questionBank?.length === 10));
  assert.deepEqual(loaded.state.expeditions[1], uploaded);
});

test("new accounts start with only the tutorial and chapter rewards cannot be claimed twice", () => {
  const game = initialGame();
  assert.deepEqual(game.expeditions.map((item) => item.id), ["tutorial"]);
  assert.throws(() => applyGameAction(game, { action: "complete" }), GameActionError);
  assert.throws(() => applyGameAction(game, { action: "start", expeditionId: "tutorial", chapter: 2 }), GameActionError);
  applyGameAction(game, { action: "start", expeditionId: "tutorial", chapter: 1 });
  const battleId = game.battle!.id;
  assert.throws(() => applyGameAction(game, { action: "complete", battleId }), /Answer every question/);
  for (const question of game.expeditions[0].regions[0].questionBank!) {
    applyGameAction(game, { action: "answer", battleId, questionId: question.id, selectedIndex: question.answerIndex });
  }
  applyGameAction(game, { action: "complete", battleId });
  assert.equal(game.expeditions[0].progress, 33);
  assert.equal(game.gold, 2400);
  assert.equal(game.gems, 570);
  applyGameAction(game, { action: "complete", battleId });
  assert.equal(game.gold, 2400);
  assert.equal(game.gems, 570);
  assert.throws(() => applyGameAction(game, { action: "start", expeditionId: "tutorial", chapter: 4 }), GameActionError);
});

test("unfinished three-question tutorial expands to ten without changing accepted answers", async () => {
  const state = initialGame();
  const region = state.expeditions[0].regions[0];
  applyGameAction(state, { action: "start", expeditionId: "tutorial", chapter: 1 });
  region.questionBank = region.questionBank!.slice(0, 3);
  region.questions = 3;
  const oldBank = structuredClone(region.questionBank);
  const battleId = state.battle!.id;
  applyGameAction(state, { action: "answer", battleId, questionId: oldBank[0].id, selectedIndex: oldBank[0].answerIndex });
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { state, version: 2 }, error: null }) };
  const loaded = await readState({ from: () => query } as unknown as Parameters<typeof readState>[0], "legacy-user");
  assert.equal(loaded.state.expeditions[0].regions[0].questions, 10);
  assert.deepEqual(loaded.state.expeditions[0].regions[0].questionBank!.slice(0, 3), oldBank);
  assert.equal(loaded.state.battle!.id, battleId);
  assert.equal(loaded.state.battle!.answers.length, 1);
});

test("summons charge the requested amount and reject invalid counts", () => {
  const game = initialGame();
  assert.equal(applyGameAction(game, { action: "summon", count: 1 }).length, 1);
  assert.equal(game.gems, 220);
  assert.throws(() => applyGameAction(game, { action: "summon", count: 2 }), GameActionError);
  assert.equal(game.gems, 220);
});

test("game API rejects requests without an access token", async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/game`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "unauthenticated" });
  } finally {
    server.close();
  }
});
