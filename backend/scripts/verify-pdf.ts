import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { app } from "../src/app.ts";
import { authClient, dataClient } from "../src/platform/supabase.ts";
import type { GameData } from "../src/modules/game/state.ts";

// Live smoke test: uses Gemini quota and a temporary anonymous Supabase account.
const client = dataClient();
const schema = await client.from("game_states").select("user_id").limit(0);
if (schema.error) throw new Error("Apply backend/supabase/migrations/20260930000000_game_backend.sql before running live PDF verification.");
const auth = authClient();
const signedIn = await auth.auth.signInAnonymously();
if (signedIn.error || !signedIn.data.session) throw new Error("Live verification could not create an anonymous account. Check Supabase Auth settings.");
const userId = signedIn.data.user!.id;
const secondAuth = authClient();
const secondSignIn = await secondAuth.auth.signInAnonymously();
if (secondSignIn.error || !secondSignIn.data.session) {
  await client.auth.admin.deleteUser(userId);
  throw new Error("Could not create the second verification account");
}
const secondUserId = secondSignIn.data.user!.id;
const server = app.listen(0);
let storedPath: string | undefined;
try {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/game`;
  const headers = { Authorization: `Bearer ${signedIn.data.session.access_token}` };
  const secondHeaders = { Authorization: `Bearer ${secondSignIn.data.session.access_token}` };
  async function action(body: object, expected = 200, requestHeaders = headers) {
    const response = await fetch(base, { method: "POST", headers: { ...requestHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.status, expected, `Action ${JSON.stringify(body)}: ${response.status}`);
    return response.json();
  }
  const document = await PDFDocument.create();
  const page = document.addPage();
  const lines = [
    "Kinetic energy is the energy of motion.",
    "Formula: Ek = 1/2 m v^2. Mass m is in kilograms, speed v in meters per second.",
    "The unit of kinetic energy is the joule.",
    "A 2 kg object moving at 3 m/s has 9 joules of kinetic energy.",
    "Doubling mass at fixed speed doubles kinetic energy.",
    "Doubling speed at fixed mass multiplies kinetic energy by four.",
    "An object at rest has zero kinetic energy.",
  ];
  lines.forEach((line, index) => page.drawText(line, { x: 35, y: 740 - index * 30, size: 12 }));
  const bytes = await document.save();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), "verify-kinetic-energy.pdf");
  const response = await fetch(`${base}/forge`, { method: "POST", headers, body: form });
  console.log("Live PDF forge HTTP", response.status);
  const snapshot = await response.json();
  if (!response.ok) throw new Error(snapshot.error ?? "Live PDF forge failed");
  const expedition = snapshot.expeditions.find((item: { id: string }) => item.id !== "tutorial");
  assert.ok(expedition);
  storedPath = `${userId}/${expedition.id}.pdf`;
  assert.match(JSON.stringify(expedition.regions), /kinetik|kinetic/i);
  assert.equal(expedition.regions[0].questionBank, undefined);
  const row = await client.from("game_states").select("state").eq("user_id", userId).single();
  if (row.error) throw new Error("Live verification could not read saved game state");
  const saved = (row.data.state as GameData).expeditions.find((item) => item.id === expedition.id)!;
  assert.ok(saved.regions.every((region) => region.material && region.questionBank && region.questionBank.length === 10));
  const file = await client.storage.from("expeditions").download(storedPath);
  if (file.error || !file.data) throw new Error("Live verification could not download saved source PDF");
  assert.deepEqual(Buffer.from(await file.data.arrayBuffer()), Buffer.from(bytes));
  const reloaded = await fetch(base, { headers });
  assert.equal(reloaded.status, 200);
  assert.equal((await reloaded.json()).expeditions.length, 2);
  const other = await fetch(base, { headers: secondHeaders });
  assert.equal(other.status, 200);
  assert.equal((await other.json()).expeditions.length, 1);
  await action({ action: "start", expeditionId: expedition.id, chapter: 1 }, 400, secondHeaders);
  const deniedFile = await secondAuth.storage.from("expeditions").download(storedPath);
  assert.ok(deniedFile.error, "Another account cannot read the source PDF");
  const deniedWrite = await auth.from("game_states").update({ state: { gold: 999999 } }).eq("user_id", userId);
  assert.ok(deniedWrite.error, "A browser account cannot grant itself resources directly");
  const deniedRead = await secondAuth.from("game_states").select("state").eq("user_id", userId);
  assert.ok(deniedRead.error || !deniedRead.data?.length, "Another account cannot read game state directly");
  const me = await fetch(base.replace("/game", "/me"), { headers });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.id, userId);
  let battleState = await action({ action: "start", expeditionId: expedition.id, chapter: 1 });
  const battleId = battleState.battle.id;
  assert.equal(battleState.battle.question.answerIndex, undefined);
  assert.equal(battleState.battle.question.explanation, undefined);
  await action({ action: "complete", battleId }, 400);
  await action({ action: "answer", battleId, questionId: battleState.battle.question.id, selectedIndex: 0 }, 400, secondHeaders);
  const questions = saved.regions[0].questionBank!;
  for (const [index, question] of questions.entries()) {
    const body = { action: "answer", battleId, questionId: question.id, selectedIndex: question.answerIndex };
    if (index === 0) {
      // Concurrent identical retries must produce one stored answer.
      await Promise.all([action(body), action(body)]);
      const resumed = await action({ action: "start", expeditionId: expedition.id, chapter: 1 });
      assert.equal(resumed.battle.id, battleId);
      assert.equal(resumed.battle.answers.length, 1);
      const partial = await fetch(base, { headers });
      assert.equal((await partial.json()).battle.answers.length, 1);
    } else {
      battleState = await action(body);
    }
  }
  const results = await Promise.all([action({ action: "complete", battleId }), action({ action: "complete", battleId })]);
  assert.ok(results.every((result) => result.battle.status === "passed" && result.gold === snapshot.gold + 950 && result.gems === snapshot.gems + 250 && result.xp === snapshot.xp + 100));
  const final = await fetch(base, { headers });
  const finalState = await final.json();
  assert.equal(finalState.battleHistory.length, 1);
  assert.equal(finalState.battle.answers.length, questions.length);
  assert.equal(finalState.battle.playerHp, 500);
  assert.equal(finalState.battle.enemiesDefeated, 5);
  const refreshed = await auth.auth.refreshSession({ refresh_token: signedIn.data.session.refresh_token });
  assert.ok(!refreshed.error && refreshed.data.session);
  const refreshCheck = await fetch(base, { headers: { Authorization: `Bearer ${refreshed.data.session.access_token}` } });
  assert.equal((await refreshCheck.json()).gold, finalState.gold);
  for (const [buffer, name, status] of [
    [new Uint8Array(), "empty.pdf", 400],
    [new TextEncoder().encode("not a PDF"), "wrong.pdf", 400],
    [new TextEncoder().encode("%PDF corrupt"), "corrupt.pdf", 422],
    [new Uint8Array(25 * 1024 * 1024 + 1), "oversized.pdf", 400],
  ] as const) {
    const invalid = new FormData();
    invalid.append("file", new Blob([new Uint8Array(buffer)]), name);
    const failed = await fetch(`${base}/forge`, { method: "POST", headers, body: invalid });
    assert.equal(failed.status, status, name);
  }
  const unchanged = await fetch(base, { headers });
  assert.equal((await unchanged.json()).expeditions.length, 2);
  console.log("PASS: PDF generation, source Storage, verified battle, concurrent retries, saved answers/results, token refresh, invalid uploads and two-account isolation", { chapters: saved.regions.length, questions: questions.length });
} finally {
  server.close();
  if (storedPath) {
    const removed = await client.storage.from("expeditions").remove([storedPath]);
    if (removed.error) console.error("Could not clean up the verification PDF");
  }
  const deleted = await client.auth.admin.deleteUser(userId);
  if (deleted.error) console.error("Could not clean up the verification account");
  const secondDeleted = await client.auth.admin.deleteUser(secondUserId);
  if (secondDeleted.error) console.error("Could not clean up the second verification account");
}
