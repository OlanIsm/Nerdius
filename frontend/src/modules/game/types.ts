export type Region = {
  chapter: number;
  title: string;
  summary: string;
  topics: string[];
  questions: number;
  enemies: number;
  material?: string;
  sourcePages?: number[];
};
export type Expedition = {
  id?: string;
  title: string;
  file: string;
  progress: number;
  regions: Region[];
};
export type SummonItem = {
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  chance: number;
};

export type GameData = {
  gold: number;
  gems: number;
  xp: number;
  favor: number;
  inventory: string[];
  expeditions: Expedition[];
  lastAdventure: { expeditionId: string; chapter: number } | null;
  rewards?: string[];
  summonPool?: SummonItem[];
  battle?: BattleView | null;
};
export type BattleQuestion = { id: string; prompt: string; options: string[]; sourcePage: number };
export type BattleView = {
  id: string; expeditionId: string; chapter: number;
  status: "active" | "passed" | "failed";
  total: number; correct: number;
  playerHp: number; playerMaxHp: number; enemyHp: number; enemyMaxHp: number; enemiesDefeated: number; finished: boolean;
  goldReward: number; gemsReward?: number; xpReward: number;
  pendingGold: number; pendingGems: number;
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
  question: BattleQuestion | null;
  feedback: (BattleQuestion & { questionId: string; selectedIndex: number; correct: boolean; answerIndex: number; explanation: string }) | null;
};
