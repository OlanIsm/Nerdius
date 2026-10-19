import type { ChunkDefinition, ChunkType, PropPlacement } from "./types";

export const WORLD = {
  width: 360,
  chunkHeight: 420,
  playerRatio: 0.7,
  speed: 96,
  minSpeed: 48,
  maxSpeed: 288,
  speedStep: 48,
  walkSeconds: 2,
  brakeSeconds: 0.55,
  revealSeconds: 0.35,
  completeSeconds: 0.65,
  maxDelta: 0.05,
};

export const SAVANNAH_ENEMIES = ["Hannah", "Snarger", "Nerdius"] as const;

export const level: readonly { type: ChunkType; enemyCount?: number }[] = [
  { type: "forestStraight" }, { type: "forestVariant" },
  { type: "encounterArena", enemyCount: 1 }, { type: "forestStraight" },
  { type: "bridge" }, { type: "encounterArena", enemyCount: 2 },
  { type: "forestVariant" }, { type: "bossArena", enemyCount: 1 },
];
export const loop: readonly ChunkType[] = ["forestStraight", "forestVariant", "bridge", "river", "ruins"];

const forest: readonly PropPlacement[] = [
  { kind: "tree", x: 38, y: 100 }, { kind: "tree", x: 321, y: 176 },
  { kind: "tree", x: 65, y: 307 }, { kind: "tree", x: 317, y: 410, scale: 1.12 },
  { kind: "bush", x: 304, y: 64 }, { kind: "bush", x: 36, y: 226 },
  { kind: "rock", x: 270, y: 264 }, { kind: "flower", x: 94, y: 146 },
  { kind: "flower", x: 251, y: 363 }, { kind: "signpost", x: 97, y: 387 },
];
const variant: readonly PropPlacement[] = [
  { kind: "tree", x: 315, y: 107 }, { kind: "tree", x: 42, y: 193, scale: 1.1 },
  { kind: "tree", x: 297, y: 329 }, { kind: "bush", x: 53, y: 384 },
  { kind: "rock", x: 89, y: 62 }, { kind: "rock", x: 279, y: 211 },
  { kind: "flower", x: 87, y: 279 }, { kind: "flower", x: 274, y: 385 },
  { kind: "bush", x: 21, y: 73 }, { kind: "bush", x: 337, y: 236 },
];
const arena: readonly PropPlacement[] = [
  { kind: "tree", x: 31, y: 92 }, { kind: "tree", x: 329, y: 92 },
  { kind: "tree", x: 24, y: 286 }, { kind: "tree", x: 338, y: 308 },
  { kind: "bush", x: 57, y: 382 }, { kind: "bush", x: 309, y: 388 },
  { kind: "flower", x: 73, y: 135 }, { kind: "flower", x: 285, y: 144 },
];

export const chunks: Record<ChunkType, ChunkDefinition> = {
  forestStraight: { type: "forestStraight", label: "Whispering Woods", props: forest },
  forestVariant: { type: "forestVariant", label: "Wildflower Trail", props: variant },
  bridge: {
    type: "bridge", label: "Willow Bridge",
    props: [forest[0], forest[3], forest[4], forest[8], { kind: "signpost", x: 95, y: 355 }],
  },
  river: { type: "river", label: "Riverbank Walk", props: variant.filter((prop) => prop.x > 70) },
  ruins: { type: "ruins", label: "Old Scholar Ruins", props: [...arena, { kind: "ruins", x: 72, y: 238 }, { kind: "ruins", x: 285, y: 244 }] },
  encounterArena: { type: "encounterArena", label: "Sunlit Clearing", props: arena, triggerY: 320, spawn: { count: 1, boss: false } },
  bossArena: { type: "bossArena", label: "Guardian's Grove", props: [...arena, { kind: "ruins", x: 75, y: 185 }, { kind: "ruins", x: 288, y: 185 }], triggerY: 320, spawn: { count: 1, boss: true } },
};

export const encounters = level.flatMap((step) => {
  const spawn = chunks[step.type].spawn;
  return spawn ? [{ ...spawn, count: step.enemyCount ?? spawn.count }] : [];
});
