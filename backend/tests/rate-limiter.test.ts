import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createRateLimiter, forgeRateLimiter } from "../src/platform/rateLimiter.ts";

test("rate limiter allows requests up to max and sets standard headers", async (t) => {
  const limiter = createRateLimiter({
    windowMs: 5000,
    max: 3,
    message: "Limit reached",
  });
  t.after(() => limiter.reset());

  const app = express();
  app.use(limiter);
  app.get("/test", (_req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  t.after(() => server.close());
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/test`;

  // First 3 requests should succeed
  for (let i = 1; i <= 3; i++) {
    const res = await fetch(url);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("RateLimit-Limit"), "3");
    assert.equal(res.headers.get("RateLimit-Remaining"), String(3 - i));
    assert.ok(res.headers.get("RateLimit-Reset"));
  }

  // 4th request must be blocked with HTTP 429
  const blocked = await fetch(url);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("RateLimit-Remaining"), "0");
  assert.ok(blocked.headers.get("Retry-After"));
  const data = await blocked.json();
  assert.equal(data.error, "Limit reached");

  // Reset clears limits immediately
  limiter.reset();
  const retry = await fetch(url);
  assert.equal(retry.status, 200);
  assert.equal(retry.headers.get("RateLimit-Remaining"), "2");
});

test("rate limiter isolates quotas per user key", async (t) => {
  const limiter = createRateLimiter({
    windowMs: 5000,
    max: 2,
    keyGenerator: (req) => (req.headers["x-user-id"] as string) || "anon",
  });
  t.after(() => limiter.reset());

  const app = express();
  app.use(limiter);
  app.get("/resource", (_req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  t.after(() => server.close());
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/resource`;

  // User A consumes quota (2 requests)
  assert.equal((await fetch(url, { headers: { "x-user-id": "user-A" } })).status, 200);
  assert.equal((await fetch(url, { headers: { "x-user-id": "user-A" } })).status, 200);
  // User A 3rd request is blocked
  assert.equal((await fetch(url, { headers: { "x-user-id": "user-A" } })).status, 429);

  // User B still has fresh quota
  const resUserB = await fetch(url, { headers: { "x-user-id": "user-B" } });
  assert.equal(resUserB.status, 200);
  assert.equal(resUserB.headers.get("RateLimit-Remaining"), "1");
});

test("forgeRateLimiter throttles repeated forge calls per userId", async (t) => {
  forgeRateLimiter.reset();
  t.after(() => forgeRateLimiter.reset());

  const prevMax = process.env.RATE_LIMIT_FORGE_MAX;
  process.env.RATE_LIMIT_FORGE_MAX = "2";
  t.after(() => {
    if (prevMax === undefined) delete process.env.RATE_LIMIT_FORGE_MAX;
    else process.env.RATE_LIMIT_FORGE_MAX = prevMax;
  });

  const app = express();
  app.use((_req, res, next) => {
    res.locals.userId = "test-user-123";
    next();
  });
  app.post("/forge", forgeRateLimiter, (_req, res) => res.json({ forged: true }));

  const server = app.listen(0);
  t.after(() => server.close());
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/forge`;

  // Request 1 and 2 succeed
  assert.equal((await fetch(url, { method: "POST" })).status, 200);
  assert.equal((await fetch(url, { method: "POST" })).status, 200);

  // Request 3 is throttled with 429
  const response = await fetch(url, { method: "POST" });
  assert.equal(response.status, 429);
  const json = await response.json();
  assert.match(json.error, /Gemini AI/);
});
