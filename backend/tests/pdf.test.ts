import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { app } from "../src/app.ts";
import { generatePdfExpedition, validatePdfContent } from "../src/modules/game/pdf.ts";
import { initialGame } from "../src/modules/game/state.ts";

const content = () => ({
  readable: true, title: "Energi dan gerak",
  chapters: [{
    title: "Energi kinetik", summary: "Energi benda yang bergerak.", topics: ["Massa", "Kecepatan"],
    material: "Energi kinetik bergantung pada massa dan kuadrat kecepatan. Rumusnya Ek = 1/2 m v^2.", sourcePages: [1],
    questions: Array.from({ length: 10 }, (_, index) => ({
      prompt: `Berapa energi kinetik benda ${index + 1}?`, options: ["1 joule", "2 joule", "3 joule", "4 joule"],
      answerIndex: index % 4, explanation: "Gunakan Ek = 1/2 m v^2.", sourcePage: 1,
    })),
  }],
});

test("PDF content validation rejects empty content, invalid answers, duplicate options and nonexistent pages", () => {
  const valid = validatePdfContent(content(), 1);
  assert.equal(valid.regions[0].questions, 10);
  assert.equal(valid.regions[0].questionBank?.[0].id, "1-1");
  for (const mutate of [
    (data: ReturnType<typeof content>) => { data.readable = false; },
    (data: ReturnType<typeof content>) => { data.chapters = []; },
    (data: ReturnType<typeof content>) => { data.chapters[0].questions.pop(); },
    (data: ReturnType<typeof content>) => { data.chapters[0].questions[0].answerIndex = 4; },
    (data: ReturnType<typeof content>) => { data.chapters[0].questions[0].answerIndex = 1.5; },
    (data: ReturnType<typeof content>) => { data.chapters[0].questions[0].options[1] = "1 joule"; },
    (data: ReturnType<typeof content>) => { data.chapters[0].questions[0].sourcePage = 2; },
    (data: ReturnType<typeof content>) => { data.chapters[0].material = " "; },
    (data: ReturnType<typeof content>) => { data.chapters[0].questions[1].prompt = data.chapters[0].questions[0].prompt; },
  ]) {
    const data = content();
    mutate(data);
    assert.throws(() => validatePdfContent(data, 1));
  }
});

test("corrupt and zero-page PDFs fail before contacting Gemini", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("Must not contact Gemini"); });
  await assert.rejects(generatePdfExpedition("broken.pdf", Buffer.from("%PDF broken")), /corrupt or encrypted/);
  const empty = await PDFDocument.create();
  await assert.rejects(generatePdfExpedition("empty.pdf", Buffer.from(await empty.save({ addDefaultPage: false }))), /1-1000 pages/);
});

test("PDF generation accepts an injected provider and validates its output", async () => {
  const document = await PDFDocument.create();
  document.addPage().drawText("Kinetic energy: Ek = 1/2 m v^2.");
  const pdf = Buffer.from(await document.save());
  let calls = 0;
  const expedition = await generatePdfExpedition("notes.pdf", pdf, async (bytes, schema, pages, instruction) => {
    calls++;
    assert.deepEqual(bytes, pdf);
    assert.equal(pages, 1);
    assert.ok(schema);
    assert.match(instruction.user, /exactly 10/);
    assert.match(instruction.user, /Never substitute generic starter content/);
    assert.match(instruction.system, /untrusted source material/);
    return content();
  });
  assert.equal(calls, 1);
  assert.equal(expedition.file, "notes.pdf");
  assert.equal(expedition.regions[0].questionBank?.length, 10);
  await assert.rejects(generatePdfExpedition("notes.pdf", pdf, async () => ({ readable: false })), /no readable study material/);
  await assert.rejects(generatePdfExpedition("notes.pdf", pdf, async () => ({ readable: true })), /failed validation/);
});

test("forge sends PDF bytes to Gemini, persists validated content and never saves failed generations", async (t) => {
  const previous = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", SUPABASE_SECRET_KEY: "sb_secret_test", GEMINI_API_KEY: "test-key" });
  t.after(() => {
    for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "GEMINI_API_KEY"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  });
  const document = await PDFDocument.create();
  document.addPage().drawText("Kinetic energy: Ek = 1/2 m v^2.");
  const pdf = Buffer.from(await document.save());
  let state = initialGame();
  let mode = "busy-once";
  let uploads = 0;
  let writes = 0;
  let removes = 0;
  let generationRequests = 0;
  const nativeFetch = globalThis.fetch;
  t.mock.method(console, "error", () => {});
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "info", () => {});
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("generativelanguage.googleapis.com")) {
      generationRequests++;
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.contents[0].parts[0].inlineData.data, pdf.toString("base64"));
      assert.equal(payload.contents[0].parts[0].inlineData.mimeType, "application/pdf");
      assert.ok(payload.generationConfig.responseJsonSchema);
      if (mode === "network") throw new Error("Network unavailable");
      if (mode === "quota") return Response.json({}, { status: 429 });
      if (mode === "missing-model") return Response.json({}, { status: 404 });
      if (mode === "unauthorized") return Response.json({}, { status: 401 });
      if (mode === "forbidden") return Response.json({}, { status: 403 });
      if (mode === "busy") return Response.json({}, { status: 503 });
      if (mode === "busy-once" && generationRequests === 1) return Response.json({}, { status: 503 });
      if (mode === "input-limit") return Response.json({ error: { status: "INVALID_ARGUMENT", message: "Input token count exceeds the context limit" } }, { status: 400 });
      if (mode === "bad-json") return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "broken json" }] } }] });
      const data = content();
      if (mode === "unreadable") { data.readable = false; data.chapters = []; }
      if (mode === "invalid") data.chapters[0].questions[0].sourcePage = 999;
      return Response.json({ candidates: [{ finishReason: mode === "truncated" ? "MAX_TOKENS" : "STOP", content: { parts: [{ text: JSON.stringify(data) }] } }] });
    }
    if (url.includes("/auth/v1/user")) return Response.json({ id: "test-user", email: null });
    if (url.includes("/storage/v1/object/")) {
      if (init?.method === "DELETE") { removes++; return Response.json([]); }
      uploads++;
      return mode === "storage-failure" ? Response.json({ message: "Storage unavailable" }, { status: 500 }) : Response.json({ Key: "test-path" });
    }
    if (url.includes("/rest/v1/game_states")) {
      if (init?.method === "PATCH") {
        writes++;
        if (mode === "database-failure") return Response.json({ message: "Database unavailable" }, { status: 500 });
        state = JSON.parse(String(init.body)).state;
        return Response.json([{ version: 1 }]);
      }
      return Response.json([{ state, version: 0 }]);
    }
    throw new Error("Unexpected external request");
  });
  const server = app.listen(0);
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/game`;
  async function forge(bytes = pdf) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), "notes.pdf");
    return nativeFetch(`${base}/forge`, { method: "POST", headers: { Authorization: "Bearer test-token" }, body: form });
  }
  const response = await forge();
  assert.equal(response.status, 200);
  assert.equal(generationRequests, 2, "A temporary 503 is retried before saving one expedition");
  const snapshot = await response.json();
  assert.equal(state.expeditions.length, 2);
  assert.equal(state.expeditions[1].title, "Energi dan gerak");
  assert.equal(state.expeditions[1].regions[0].questionBank?.length, 10);
  assert.equal(snapshot.expeditions[1].regions[0].material, content().chapters[0].material);
  assert.equal(snapshot.expeditions[1].regions[0].questionBank, undefined);
  const reload = await nativeFetch(base, { headers: { Authorization: "Bearer test-token" } });
  assert.equal((await reload.json()).expeditions[1].regions[0].questions, 10);
  const before = structuredClone(state);
  for (const [failure, status] of [["unreadable", 422], ["invalid", 502], ["truncated", 502], ["bad-json", 502], ["quota", 503], ["busy", 503], ["input-limit", 422], ["network", 504], ["missing-model", 502], ["unauthorized", 502], ["forbidden", 502]] as const) {
    mode = failure;
    const attemptsBefore: number = generationRequests;
    const failed = await forge();
    assert.equal(failed.status, status, failure);
    const error = (await failed.json()).error;
    assert.ok(error);
    assert.equal(generationRequests - attemptsBefore, failure === "busy" ? 3 : 1);
    if (failure === "busy") assert.match(error, /after 3 attempts/);
    if (failure === "input-limit") assert.match(error, /input limit/);
    if (failure === "missing-model") assert.match(error, /GEMINI_MODEL/);
    if (failure === "unauthorized" || failure === "forbidden") assert.match(error, /GEMINI_API_KEY/);
    assert.equal(uploads, 1);
    assert.equal(writes, 1);
    assert.deepEqual(state, before);
  }
  const requestsBefore = generationRequests;
  assert.equal((await forge(Buffer.from("%PDF corrupt"))).status, 422);
  assert.equal(generationRequests, requestsBefore);
  delete process.env.GEMINI_API_KEY;
  assert.equal((await forge()).status, 503);
  assert.equal(generationRequests, requestsBefore);
  process.env.GEMINI_API_KEY = "test-key";
  mode = "database-failure";
  assert.equal((await forge()).status, 500);
  assert.equal(removes, 1);
  assert.deepEqual(state, before);
  mode = "storage-failure";
  assert.equal((await forge()).status, 500);
  assert.equal(writes, 2);
  assert.deepEqual(state, before);
});
