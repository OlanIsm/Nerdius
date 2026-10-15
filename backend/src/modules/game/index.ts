import { Router } from "express";
import multer from "multer";
import { session } from "../account/index.ts";
import { applyGameAction } from "./state.ts";
import { changeState, readState } from "./store.ts";
import { forgeExpedition } from "./forge.ts";
import { gameSnapshot } from "./snapshot.ts";
import { HttpError } from "../../platform/errors.ts";

export const gameRouter = Router();

gameRouter.get("/game", async (_request, response) => {
  const { client, userId } = session(response.locals);
  response.json(gameSnapshot((await readState(client, userId)).state));
});

gameRouter.post("/game", async (request, response) => {
  const body: Record<string, unknown> = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError("Invalid JSON", 400);
  const { client, userId } = session(response.locals);
  const { game, result: rewards } = await changeState(client, userId, (game) => applyGameAction(game, body));
  response.json(gameSnapshot(game, rewards));
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
gameRouter.post("/game/forge", upload.single("file"), async (request, response) => {
  const { client, userId } = session(response.locals);
  response.json(gameSnapshot(await forgeExpedition(client, userId, request.file)));
});
