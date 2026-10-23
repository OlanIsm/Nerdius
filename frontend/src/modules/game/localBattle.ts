import type { BattleView } from "./types";

type SavedSelection = { questionId: string; selectedIndex: number };
type BattleDraft = { answers: SavedSelection[]; elapsedMs: number };

export function hasBattleAnswerBank(
  battle: Pick<BattleView, "total" | "questionBank"> | null | undefined,
): boolean {
  return Boolean(
    battle &&
      Array.isArray(battle.questionBank) &&
      battle.questionBank.length === battle.total &&
      battle.questionBank.every(
        (question) =>
          question &&
          typeof question.id === "string" &&
          Array.isArray(question.options) &&
          Number.isInteger(question.answerIndex) &&
          question.answerIndex >= 0 &&
          question.answerIndex < question.options.length &&
          typeof question.explanation === "string",
      ),
  );
}

function draftKey(battle: Pick<BattleView, "id">) {
  return `nerdungeon.battleDraft.${battle.id}`;
}

export function withLocalAnswers(battle: BattleView, answers: SavedSelection[]): BattleView {
  const correct = answers.filter((answer, index) =>
    answer.selectedIndex === battle.questionBank[index]?.answerIndex,
  ).length;
  const playerHp = Math.max(0, 500 - (answers.length - correct) * 50);
  const enemiesDefeated = Math.floor(correct / 2);
  const finished = playerHp === 0 || answers.length === battle.total;
  const previous = answers.at(-1);
  const answered = previous && battle.questionBank.find((question) => question.id === previous.questionId);

  return {
    ...battle,
    answers: answers.map((answer, index) => ({
      ...answer,
      correct: answer.selectedIndex === battle.questionBank[index]?.answerIndex,
    })),
    correct,
    playerHp,
    enemyHp: finished && correct > 0 && correct % 2 === 0 ? 0 : 100 - (correct % 2) * 50,
    enemiesDefeated,
    finished,
    pendingGold: battle.status === "active" ? enemiesDefeated * 100 : 0,
    pendingGems: battle.status === "active" ? enemiesDefeated * 50 : 0,
    question: !finished && battle.status === "active" ? battle.questionBank[answers.length] ?? null : null,
    feedback: previous && answered
      ? {
          ...answered,
          questionId: previous.questionId,
          selectedIndex: previous.selectedIndex,
          correct: previous.selectedIndex === answered.answerIndex,
        }
      : null,
  };
}

export function addLocalAnswer(battle: BattleView, questionId: string, selectedIndex: number): BattleView {
  const question = battle.question;
  if (
    battle.status !== "active" ||
    battle.finished ||
    !question ||
    question.id !== questionId ||
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= question.options.length
  ) {
    throw new Error("This answer is no longer available. Reload the chapter and try again.");
  }
  return withLocalAnswers(battle, [...battle.answers, { questionId, selectedIndex }]);
}

export function readBattleDraft(battle: BattleView): { battle: BattleView; elapsedMs: number } {
  const raw = localStorage.getItem(draftKey(battle));
  if (!raw) return { battle: withLocalAnswers(battle, battle.answers), elapsedMs: 0 };
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as BattleDraft).answers) ||
    typeof (parsed as BattleDraft).elapsedMs !== "number" ||
    !Number.isFinite((parsed as BattleDraft).elapsedMs) ||
    (parsed as BattleDraft).elapsedMs < 0
  ) {
    throw new Error("The saved local quiz progress is invalid. Restart the chapter to continue.");
  }
  const draft = parsed as BattleDraft;
  const savedAnswers = battle.answers;
  const draftAnswers = draft.answers;
  if (
    draftAnswers.length > battle.questionBank.length ||
    draftAnswers.some((answer, index) => {
      const question = battle.questionBank[index];
      return !answer ||
        answer.questionId !== question.id ||
        !Number.isInteger(answer.selectedIndex) ||
        answer.selectedIndex < 0 ||
        answer.selectedIndex >= question.options.length;
    })
  ) {
    throw new Error("The saved local quiz progress is invalid. Restart the chapter to continue.");
  }
  const matchesSavedPrefix = savedAnswers.every((answer, index) =>
    draftAnswers[index]?.questionId === answer.questionId &&
    draftAnswers[index]?.selectedIndex === answer.selectedIndex,
  );
  const useDraft = matchesSavedPrefix && draftAnswers.length >= savedAnswers.length;
  return {
    battle: withLocalAnswers(battle, useDraft ? draftAnswers : savedAnswers),
    elapsedMs: useDraft ? draft.elapsedMs : 0,
  };
}

export function writeBattleDraft(battle: BattleView, elapsedMs: number) {
  const draft: BattleDraft = {
    answers: battle.answers.map(({ questionId, selectedIndex }) => ({ questionId, selectedIndex })),
    elapsedMs,
  };
  localStorage.setItem(draftKey(battle), JSON.stringify(draft));
}

export function clearBattleDraft(battle: Pick<BattleView, "id">) {
  localStorage.removeItem(draftKey(battle));
}
