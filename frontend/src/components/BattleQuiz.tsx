import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { characterProfiles } from "../assets";
import type { BattleView } from "../modules/game/types";
import { Button } from "./GameUI";
import { startCharacterVoice, type VoiceCharacter } from "./gameAudio";

export function BattleQuiz({
  battle,
  acknowledged,
  onAcknowledge,
  tutorial,
  onAnswer,
  onAdvance,
  speaker,
  attackInProgress,
  speechBubbleTarget,
}: {
  battle: BattleView;
  acknowledged?: string;
  onAcknowledge: (id: string) => void;
  tutorial: boolean;
  onAnswer: (questionId: string, selectedIndex: number) => Promise<void>;
  onAdvance: () => void;
  speaker: string;
  attackInProgress: boolean;
  speechBubbleTarget: HTMLElement | null;
}) {
  const [selected, setSelected] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const feedback = battle.feedback && battle.feedback.questionId !== acknowledged ? battle.feedback : null;
  const question = battle.question;
  const cleared = battle.finished || Boolean(battle.feedback?.correct && battle.correct % 2 === 0 && feedback);
  const normalizedSpeaker = speaker.toLowerCase();
  const voice = (normalizedSpeaker === "hannah" ? "hannah"
    : normalizedSpeaker === "snarger" ? "snarger" : "nerdius") satisfies VoiceCharacter;
  const questionColor = normalizedSpeaker === "hannah"
    ? "#702b39"
    : normalizedSpeaker === "snarger"
      ? "#194b2d"
      : "#62318a";
  const [typedPrompt, setTypedPrompt] = useState("");
  const prompt = question?.prompt;
  const questionId = question?.id;
  const voiceQuestionId = feedback ? undefined : question?.id;
  const speechBubble =
    speechBubbleTarget && question && !feedback
      ? createPortal(
          <div className="battle-question-bubble" aria-hidden="true">
            <img src={characterProfiles[voice]} alt="" />
            <span className="battle-question-text" style={{ color: questionColor }}>
              {typedPrompt}
            </span>
          </div>,
          speechBubbleTarget,
        )
      : null;
  useEffect(() => {
    if (prompt === undefined || feedback) {
      setTypedPrompt("");
      return;
    }
    setTypedPrompt("");
    let visibleCharacters = 0;
    const stopVoice = startCharacterVoice(voice);
    const typing = window.setInterval(() => {
      visibleCharacters = Math.min(visibleCharacters + 1, prompt.length);
      setTypedPrompt(prompt.slice(0, visibleCharacters));
      if (visibleCharacters === prompt.length) {
        window.clearInterval(typing);
        stopVoice();
      }
    }, 28);
    return () => {
      window.clearInterval(typing);
      stopVoice();
    };
  }, [questionId, prompt, voiceQuestionId, voice, feedback]);
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
      {speechBubble}
      {feedback ? (
        <div className="quiz-feedback" role="status">
          <h2>{feedback.correct ? "Correct!" : "Not quite"}</h2>
          <div className="feedback-explanation"><p>{feedback.explanation}</p></div>
          {!feedback.correct && <p className="feedback-correction"><strong>Correction:</strong> {feedback.options[feedback.answerIndex]}</p>}
          <Button label="Next" tone="gold" disabled={attackInProgress} onPress={() => {
            onAcknowledge(feedback.questionId);
            if (cleared) onAdvance();
          }} />
        </div>
      ) : cleared || !question ? (
        <Button label="Continue trail" tone="gold" onPress={onAdvance} />
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={busy}>
            <legend className="visually-hidden">{prompt}</legend>
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
