import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { accountRouter, authenticate } from "./modules/account/index.ts";
import { gameRouter } from "./modules/game/index.ts";
import { GameActionError } from "./modules/game/battle.ts";
import { HttpError } from "./platform/errors.ts";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use("/api", (request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  const origin = process.env.CORS_ORIGIN;
  if (origin && request.headers.origin === origin) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
    response.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (request.method === "OPTIONS") return void response.sendStatus(204);
  next();
});
app.use("/api", authenticate, accountRouter, gameRouter);

const errors: ErrorRequestHandler = (error: Error & { status?: number; type?: string }, _request, response, _next) => {
  if (error instanceof multer.MulterError) return void response.status(400).json({ error: "Choose a PDF or DOCX up to 25 MB" });
  if (error.type === "entity.parse.failed") return void response.status(400).json({ error: "Invalid JSON" });
  if (error instanceof HttpError) return void response.status(error.status).json({ error: error.message });
  if (error.status && error.status < 500) return void response.status(error.status).json({ error: error.message });
  if (error instanceof GameActionError) return void response.status(400).json({ error: error.message });
  console.error(error);
  response.status(500).json({ error: "Server unavailable" });
};
app.use(errors);
