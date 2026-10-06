export type Question = { id: string; prompt: string; options: string[]; answerIndex: number; explanation: string; sourcePage: number };
export type Region = { chapter: number; title: string; summary: string; topics: string[]; questions: number; enemies: number; material?: string; sourcePages?: number[]; questionBank?: Question[] };
export type Expedition = { id: string; title: string; file: string; progress: number; regions: Region[] };
export type GameData = { gold: number; gems: number; xp: number; favor: number; inventory: string[]; expeditions: Expedition[]; lastAdventure: { expeditionId: string; chapter: number } | null; battle?: Battle; battleHistory?: BattleResult[] };

export type Answer = { questionId: string; selectedIndex: number; correct: boolean };
export type Battle = { id: string; expeditionId: string; chapter: number; answers: Answer[]; status: "active" | "passed" | "failed"; goldReward: number; gemsReward?: number; xpReward: number };
export type BattleResult = Battle & { total: number; correct: number; completedAt: string };

