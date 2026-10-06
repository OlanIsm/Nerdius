import { randomInt } from "node:crypto";
import { summonPool } from "./summon.ts";
import { applyBattleAction, GameActionError } from "./battle.ts";
import { tutorialRegions } from "./tutorial.ts";

import type { Expedition, GameData } from "./types.ts";

function chapters(titles: string[]) {
  return titles.map((title, index) => ({ chapter: index + 1, title, summary: `Kuasai konsep inti ${title.toLowerCase()} sebelum menghadapi encounter di akhir region.`, topics: [`Konsep dasar ${title}`, "Penerapan dan contoh penting", "Kesalahan umum yang harus dihindari"], questions: 10, enemies: index + 1 }));
}
export function initialGame(): GameData {
  return {
    gold: 1450, gems: 320, xp: 0, favor: 3,
    inventory: ["Blue Mage Robe", "Quill Staff", "Spectacles", "HP Elixir"],
    lastAdventure: null,
    expeditions: [{ id: "tutorial", title: "Tutorial — Fotosintesis", file: "Tutorial", progress: 0, regions: tutorialRegions() }],
  };
}
export function newExpedition(file: string): Expedition {
  const title = file.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ").trim();
  return { id: crypto.randomUUID(), title, file, progress: 0, regions: chapters(["Fundamentals", "Practice", "Review"]) };
}

export function applyGameAction(game: GameData, body: Record<string, unknown>): string[] {
  if (body.action === "start" || body.action === "restart" || body.action === "exit" || body.action === "answer" || body.action === "complete") {
    applyBattleAction(game, body);
  } else if (body.action === "summon") {
    const cost = body.count === 10 ? 900 : body.count === 1 ? 100 : 0;
    if (!cost) throw new GameActionError("Invalid summon count");
    if (game.gems < cost) throw new GameActionError("Not enough gems");
    game.gems -= cost;
    game.favor = (game.favor + Number(body.count)) % 10;
    const rewards = Array.from({ length: Number(body.count) }, () => summonPool[randomInt(summonPool.length)].name);
    game.inventory.push(...rewards);
    return rewards;
  } else throw new GameActionError("Unknown action");
  return [];
}
