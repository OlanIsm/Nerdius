import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { characterProfiles } from "../assets";
import type { BattleView } from "../modules/game/types";
import { Button } from "./GameUI";
import { usePreference } from "../modules/settings/preferences";
import { startCharacterVoice, type VoiceCharacter } from "./gameAudio";

const nerdPhrases = [
  "Ummm, actually... statistically speaking, according to my calculated calculations, this is simple.",
  "Ummm, actually...........................................",
  "One does not simply walk into this neighborhood without a map.",
  "Technically speaking, water isn't wet; it just makes other things wet.",
  "[Insert Star Wars reference]",
];
const nerdCorrectPhrases = [
  "Ummm, actually... that was correct, but technically incomplete.",
  "Hmph. Adequate result.",
  "Acceptable choice, but I would have answered faster.",
];
const nerdWrongPhrases = [
  "Ummm, actually... WRONG! Did you even study?",
  "Allow me to lower your grade.",
];
const snargerPhrases = [
  "Japan is turning footsteps into electricity.",
  "Quick, I don't have all day.",
  "I'm hungry...",
  "Hiss.",
  "Hissssssssssssssssssssssssss...",
];
const snargerCorrectPhrases = [
  "Hisssss... My battery is draining...",
  "Hissss... cut me some slack, they're gonna do this to me at work tomorrow.",
];
const snargerWrongPhrases = ["Hissssssss... Focus!", "Hisssss... Pay attention!"];
const hannahPhrases = [
  "Lemme check this reel real quick.",
  "Oh shoot, I lost the question bank, hold on.",
  "*Scrolls*",
  "*Ding*",
  "Looks like someone's got an exam soon, huh?",
];
const hannahCorrectPhrases = [
  "Whatever.",
  "You got that right.",
  "Nice.",
];
const hannahWrongPhrases = [
  "Say cheese!",
  "Might wanna post this.",
  "*Plays a song*",
];

function hash(value: string) {
  return [...value].reduce((total, character) => total * 31 + character.charCodeAt(0), 7) >>> 0;
}

function choose<T>(items: T[], seed: number) {
  return items[seed % items.length];
}

function addNounEmojis(prompt: string) {
  const emojis: Record<string, string> = {
    tree: "🌳", cell: "🧫", water: "💧", plant: "🌱", animal: "🐾",
    energy: "⚡", force: "💪", matter: "🧱", atom: "⚛️", molecule: "🧬",
    rock: "🪨", soil: "🌱", sun: "☀️", moon: "🌙", planet: "🪐",
    heart: "❤️", brain: "🧠", blood: "🩸", root: "🌿", leaf: "🍃",
    flower: "🌼", food: "🍎", air: "🌬️", gas: "💨", light: "💡",
    sound: "🔊", heat: "🔥", electricity: "⚡", ocean: "🌊", river: "🏞️",
    photosynthesis: "🌿", evaporation: "☁️", ecosystem: "🌎", organism: "🦠",
    environment: "🌳", species: "🐾", climate: "🌦️", temperature: "🌡️",
    mass: "⚖️", volume: "🧪", speed: "💨", gravity: "🍎", friction: "🛞",
    acceleration: "🚀", circuit: "🔌", current: "⚡", voltage: "🔋",
    resistance: "🧱", metal: "🔩", element: "⚛️", compound: "🧪",
    mixture: "🥣", solution: "🧪", acid: "🧪", base: "🧪",
    reaction: "💥", chemical: "🧪", chromosome: "🧬", dna: "🧬",
    nucleus: "⚛️", membrane: "🫧", tissue: "🧫", organ: "🫀",
    system: "⚙️", seed: "🌰", fruit: "🍎", bacteria: "🦠", virus: "🦠",
  };
  const nounPattern = new RegExp(`\\b(${Object.keys(emojis).join("|")})\\b`, "gi");
  return prompt.replace(nounPattern, (noun) => `${noun} ${emojis[noun.toLowerCase()]}`);
}

function characterPrompt(
  speaker: string,
  questionId: string,
  prompt: string,
  quotesEnabled: boolean,
) {
  const seed = hash(questionId);
  const normalizedSpeaker = speaker.toLowerCase();
  let text = prompt;
  if (normalizedSpeaker === "nerdius") {
    text = addNounEmojis(text);
    if (quotesEnabled && seed % 10 < 3) text = `${choose(nerdPhrases, seed >>> 3)} ${text}`;
  } else if (normalizedSpeaker === "snarger") {
    if (quotesEnabled) {
      text = `Hiss${"s".repeat(5 + (seed % 12))}... ${text}`;
      if (seed % 4 === 0) text = `${text} Ssssspeak fast.`;
      else if (seed % 4 === 1) text = `${choose(snargerPhrases, seed >>> 2)} ${text}`;
    }
  } else if (quotesEnabled && seed % 10 < 3) {
    text = `${choose(hannahPhrases, seed >>> 3)} ${text}`;
  }
  return text;
}

function characterFeedback(
  speaker: string,
  questionId: string,
  correct: boolean,
  quotesEnabled: boolean,
) {
  if (!quotesEnabled) return "";
  const seed = hash(`${questionId}:feedback`);
  const normalizedSpeaker = speaker.toLowerCase();
  if (normalizedSpeaker === "snarger")
    return choose(correct ? snargerCorrectPhrases : snargerWrongPhrases, seed);
  if (normalizedSpeaker === "hannah")
    return choose(correct ? hannahCorrectPhrases : hannahWrongPhrases, seed >>> 1);
  return choose(correct ? nerdCorrectPhrases : nerdWrongPhrases, seed);
}

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
  const [characterQuotes] = usePreference("nerdungeon.characterQuotes", "on");
  const quotesEnabled = characterQuotes !== "off";
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
  const prompt = question
    ? characterPrompt(speaker, question.id, question.prompt, quotesEnabled)
    : undefined;
  const questionId = question?.id;
  const voiceQuestionId = feedback ? undefined : question?.id;
  const speechBubble =
    speechBubbleTarget && question
      ? createPortal(
          <div className="battle-question-bubble" aria-hidden="true">
            <img src={characterProfiles[voice]} alt="" />
            <span className="battle-question-text" style={{ color: questionColor }}>
              {feedback
                ? characterFeedback(speaker, feedback.questionId, feedback.correct, quotesEnabled)
                : typedPrompt}
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
    const stopVoice = quotesEnabled ? startCharacterVoice(voice) : () => {};
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
  }, [questionId, prompt, voiceQuestionId, voice, feedback, quotesEnabled]);
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
        <div className="quiz-feedback" data-correct={feedback.correct} role="status">
          <h2>
            {feedback.correct
              ? Array.from("Correct!", (letter, index) => (
                  <span
                    className="correct-wave-letter"
                    key={`${letter}-${index}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {letter}
                  </span>
                ))
              : "Not quite"}
          </h2>
          <div className="feedback-explanation">
            {characterFeedback(speaker, feedback.questionId, feedback.correct, quotesEnabled) && (
              <p className="character-reaction">
                {characterFeedback(speaker, feedback.questionId, feedback.correct, quotesEnabled)}
              </p>
            )}
            <p>{feedback.explanation}</p>
          </div>
          {!feedback.correct && (
            <p className="feedback-correction">
              {normalizedSpeaker === "nerdius"
                ? `${hash(feedback.questionId) % 2 === 0 ? "Well actually..." : "Ummm, actually..."} it's ${feedback.options[feedback.answerIndex]} 🤓`
                : <><strong>Correct Answer:</strong> {feedback.options[feedback.answerIndex]}</>}
            </p>
          )}
          <Button label="Next" tone="gold" className="battle-primary-action" disabled={attackInProgress} onPress={() => {
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
          {busy && <p className="quiz-checking" role="status">Checking against the chapter answer key…</p>}
          <Button label={busy ? "Checking answer…" : "Submit answer"} tone="gold" className="battle-primary-action" disabled={selected === undefined || busy} onPress={() => void submit()} />
        </form>
      )}
    </section>
  );
}
