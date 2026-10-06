import type { GameData, Question, Region } from "./state.ts";

export class GameActionError extends Error {}
export type Answer = { questionId: string; selectedIndex: number; correct: boolean };
export type Battle = { id: string; expeditionId: string; chapter: number; answers: Answer[]; status: "active" | "passed" | "failed"; goldReward: number; gemsReward?: number; xpReward: number };
export type BattleResult = Battle & { total: number; correct: number; completedAt: string };

function combat(battle: Battle, total: number) {
  const correct = battle.answers.filter((answer) => answer.correct).length;
  const playerHp = Math.max(0, 500 - (battle.answers.length - correct) * 50);
  const enemiesDefeated = Math.floor(correct / 2);
  const finished = playerHp === 0 || battle.answers.length === total;
  return { playerHp, playerMaxHp: 500, enemyHp: finished && correct > 0 && correct % 2 === 0 ? 0 : 100 - correct % 2 * 50, enemyMaxHp: 100, enemiesDefeated, finished };
}

function activeRegion(game: GameData, battle: Pick<Battle, "expeditionId" | "chapter">): Region {
  const region = game.expeditions.find((item) => item.id === battle.expeditionId)?.regions.find((item) => item.chapter === battle.chapter);
  if (!region?.questionBank?.length) throw new GameActionError("This chapter has no generated questions. Upload a PDF to study.");
  return region;
}

export function applyBattleAction(game: GameData, body: Record<string, unknown>): void {
  if (body.action === "exit") {
    if (typeof body.battleId !== "string" || !body.battleId) throw new GameActionError("Invalid battle to exit");
    if (!game.battle) return; // Retry after a lost response is safe once the attempt is removed.
    if (game.battle.id !== body.battleId) throw new GameActionError("Invalid battle to exit");
    delete game.battle;
    return;
  }
  if (body.action === "start" || body.action === "restart") {
    const expedition = game.expeditions.find((item) => item.id === body.expeditionId);
    const chapter = body.chapter;
    const unlocked = expedition ? Math.min(expedition.regions.length, Math.round(expedition.progress * expedition.regions.length / 100) + 1) : 0;
    if (!expedition || typeof chapter !== "number" || !Number.isInteger(chapter) || chapter < 1 || chapter > unlocked) throw new GameActionError("Invalid chapter");
    const region = activeRegion(game, { expeditionId: expedition.id, chapter });
    const existing = game.battle;
    if (body.action === "restart" && (!existing || body.battleId !== existing.id)) throw new GameActionError("Invalid battle to restart");
    if (region.questionBank!.length !== 10 && !(body.action !== "restart" && existing?.status === "active" && existing.expeditionId === expedition.id && existing.chapter === chapter)) {
      throw new GameActionError("This chapter has an older question bank. Upload the PDF again to create a 10-question region.");
    }
    if (body.action === "restart" || !existing || existing.status !== "active" || existing.expeditionId !== expedition.id || existing.chapter !== chapter) {
      game.battle = { id: crypto.randomUUID(), expeditionId: expedition.id, chapter, answers: [], status: "active", goldReward: 0, xpReward: 0 };
    }
    game.lastAdventure = { expeditionId: expedition.id, chapter };
    return;
  }
  const battle = game.battle;
  if (!battle || body.battleId !== battle.id) throw new GameActionError("Invalid battle. Start or resume the chapter first.");
  const questions = activeRegion(game, battle).questionBank!;
  if (body.action === "answer") {
    const selected = body.selectedIndex;
    if (typeof selected !== "number" || !Number.isInteger(selected)) throw new GameActionError("Choose a valid answer");
    const previous = battle.answers.find((answer) => answer.questionId === body.questionId);
    if (previous) {
      if (previous.selectedIndex !== selected) throw new GameActionError("This question has already been answered");
      return; // A retry after a lost response must not submit or score the answer twice.
    }
    const question = questions[battle.answers.length];
    if (battle.status !== "active" || combat(battle, questions.length).finished || !question || body.questionId !== question.id || selected < 0 || selected >= question.options.length) throw new GameActionError("Invalid or out-of-order question");
    battle.answers.push({ questionId: question.id, selectedIndex: selected, correct: selected === question.answerIndex });
    return;
  }
  if (body.action !== "complete") throw new GameActionError("Unknown action");
  if (battle.status !== "active") return;
  const outcome = combat(battle, questions.length);
  if (!outcome.finished) throw new GameActionError("Answer every question before completing the chapter");
  const correct = battle.answers.filter((answer) => answer.correct).length;
  battle.status = outcome.playerHp > 0 ? "passed" : "failed";
  const expedition = game.expeditions.find((item) => item.id === battle.expeditionId)!;
  const progress = Math.round(battle.chapter / expedition.regions.length * 100);
  if (battle.status === "passed" && progress > expedition.progress) {
    expedition.progress = progress;
    battle.goldReward = 450;
    battle.xpReward = 100;
    game.gold += battle.goldReward;
    game.xp += battle.xpReward;
  }
  if (battle.status === "passed") {
    const dropGold = outcome.enemiesDefeated * 100;
    battle.goldReward += dropGold;
    battle.gemsReward = outcome.enemiesDefeated * 50;
    game.gold += dropGold;
    game.gems += battle.gemsReward;
  }
  // ponytail: retain the latest 20 completed attempts in the state row; use a result table for longer history.
  game.battleHistory = [...(game.battleHistory ?? []), { ...structuredClone(battle), total: questions.length, correct, completedAt: new Date().toISOString() }].slice(-20);
}

export function battleSnapshot(game: GameData) {
  const battle = game.battle;
  if (!battle) return null;
  const questions = activeRegion(game, battle).questionBank!;
  const hp = combat(battle, questions.length);
  const next = battle.status === "active" && !hp.finished ? questions[battle.answers.length] : undefined;
  const previous = battle.answers.at(-1);
  const answered = previous ? questions.find((question) => question.id === previous.questionId) : undefined;
  const publicQuestion = (question: Question) => ({ id: question.id, prompt: question.prompt, options: question.options, sourcePage: question.sourcePage });
  return {
    ...battle, total: questions.length, correct: battle.answers.filter((answer) => answer.correct).length,
    ...hp,
    pendingGold: battle.status === "active" ? hp.enemiesDefeated * 100 : 0,
    pendingGems: battle.status === "active" ? hp.enemiesDefeated * 50 : 0,
    question: next ? publicQuestion(next) : null,
    feedback: previous && answered ? { ...publicQuestion(answered), ...previous, answerIndex: answered.answerIndex, explanation: answered.explanation } : null,
  };
}
