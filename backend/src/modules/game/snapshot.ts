import type { GameData } from "./types.ts";
import { summonPool } from "./summon.ts";
import { battleSnapshot } from "./battle.ts";

export const gameSnapshot = (game: GameData, rewards: string[] = []) => ({
  ...game, rewards, summonPool, battle: battleSnapshot(game),
  expeditions: game.expeditions.map((expedition) => ({
    ...expedition,
    regions: expedition.regions.map(({ questionBank: _questionBank, ...region }) => region),
  })),
});
