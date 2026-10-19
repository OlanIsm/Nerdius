export const GameState = {
  walking: "walking",
  encounterStarting: "encounterStarting",
  encounter: "encounter",
  encounterComplete: "encounterComplete",
  bossEncounter: "bossEncounter",
  result: "result",
} as const;
export type GamePhase = (typeof GameState)[keyof typeof GameState];

export type ChunkType = "forestStraight" | "forestVariant" | "bridge" | "river" | "ruins" | "encounterArena" | "bossArena";
export type SavannahEnemy = "Hannah" | "Snarger" | "Nerdius";
export type PropKind = "tree" | "bush" | "rock" | "flower" | "ruins" | "signpost";
export type PropPlacement = { kind: PropKind; x: number; y: number; scale?: number };
export type ChunkDefinition = {
  type: ChunkType;
  label: string;
  props: readonly PropPlacement[];
  triggerY?: number;
  spawn?: { count: number; boss: boolean };
};
export type Chunk = {
  id: number;
  sequenceIndex: number;
  type: ChunkType;
  height: number;
  y: number;
  generation: number;
  canContainEncounter: boolean;
  encounterConsumed: boolean;
  definition: ChunkDefinition;
  spawn?: ChunkDefinition["spawn"];
};
export type ActiveEncounter = { count: number; boss: boolean; name: SavannahEnemy; debug: boolean };
