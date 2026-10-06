import { useRef, useState } from "react";
import type { BattleView } from "../modules/game/types";
import { Button } from "./GameUI";

export function BattleQuiz({ battle, acknowledged, onAcknowledge, tutorial, onAnswer, onAdvance }: {
  battle: BattleView; acknowledged?: string; onAcknowledge: (id: string) => void; tutorial: boolean;
  onAnswer: (questionId: string, selectedIndex: number) => Promise<void>;
  onAdvance: () => void;
}) {
  const [selected, setSelected] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const feedback = battle.feedback && battle.feedback.questionId !== acknowledged ? battle.feedback : null;
  const question = battle.question;
  const cleared = battle.finished || Boolean(battle.feedback?.correct && battle.correct % 2 === 0 && feedback);
  async function submit() {
    if (!question || selected === undefined || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await onAnswer(question.id, selected);
      setSelected(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your answer. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="battle-quiz" aria-label="Chapter question">
      {feedback ? (
        <div className="quiz-feedback" role="status">
          <h2>{feedback.correct ? "Correct!" : "Not quite"}</h2>
          <div className="feedback-explanation"><p>{feedback.explanation}</p></div>
          {!feedback.correct && <p className="feedback-correction"><strong>Correction:</strong> {feedback.options[feedback.answerIndex]}</p>}
          <Button label="Next" tone="gold" onPress={() => {
            onAcknowledge(feedback.questionId);
            if (cleared) onAdvance();
          }} />
        </div>
      ) : cleared || !question ? (
        <Button label="Continue trail" tone="gold" onPress={onAdvance} />
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={busy}>
            <legend>{question.prompt}</legend>
            <div className="quiz-options">
              {question.options.map((option, index) => (
                <label key={`${question.id}-${index}`} className={`quiz-option ${selected === index ? "selected" : ""}`}>
                  <input type="radio" name={`answer-${question.id}`} value={index} checked={selected === index} onChange={() => setSelected(index)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="quiz-source">{tutorial ? "Tutorial material" : `PDF page ${question.sourcePage}`}</p>
          {error && <p className="quiz-error" role="alert">{error}</p>}
          <Button label={busy ? "Saving answer…" : "Submit answer"} tone="gold" disabled={selected === undefined || busy} onPress={() => void submit()} />
        </form>
      )}
    </section>
  );
}
