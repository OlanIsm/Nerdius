import { useCallback, useEffect, useRef, useState } from "react";
import { art, characterProfiles, icons } from "../assets";
import { Button, Icon, useReducedMotion } from "../components/GameUI";
import type { WorldControls } from "../game/PhaserWorld";
import { GameState, type GamePhase } from "../game/types";
import type { ScreenProps } from "../types";
import type { BattleView } from "../modules/game/types";
import { BattleQuiz } from "../components/BattleQuiz";
import {
  playCorrectAnswerSound,
  playDamageSound,
  playFireGustSound,
  playWinSound,
  playWrongAnswerSound,
  setOverworldSound,
} from "../components/gameAudio";
import { playDoorCloseSound, playDoorOpenSound } from "../components/doorAudio";

const status: Record<GamePhase, string> = {
  walking: "Walking east",
  encounterStarting: "Something stirs ahead…",
  encounter: "Savannah encounter",
  encounterComplete: "Path cleared!",
  bossEncounter: "The grove guardian",
  result: "Trail complete!",
};
export function BattleScreen({
  navigate,
  onComplete,
  onAnswer,
  onRestart,
  onExit,
  battle,
  title,
  tutorial,
}: ScreenProps & {
  battle: BattleView | null;
  title: string;
  tutorial: boolean;
  onAnswer: (questionId: string, selectedIndex: number) => Promise<void>;
  onComplete: () => Promise<void>;
  onRestart: () => Promise<void>;
  onExit: () => Promise<void>;
}) {
  const reducedMotion = useReducedMotion();
  const battleReady = battle !== null;
  const [phase, setPhase] = useState<
    "closing" | "loading" | "opening" | "ready"
  >("closing");
  const [closed, setClosed] = useState(false);
  const [doorsLoaded, setDoorsLoaded] = useState(() => new Set<number>());
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [world, setWorld] = useState<WorldControls>();
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null);
  const [WorldRenderer, setWorldRenderer] =
    useState<typeof import("../game/PhaserWorld").PhaserWorld>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [, render] = useState(0);
  const [menu, setMenu] = useState<"pause" | "restart" | "exit" | null>(null);
  const [answering, setAnswering] = useState(false);
  const [attackInProgress, setAttackInProgress] = useState(false);
  const [streak, setStreak] = useState(0);
  const [acknowledged, setAcknowledged] = useState<string>();
  const menuDialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const recorded = useRef(false);
  const submittedAnswerKey = useRef<string | undefined>(undefined);
  const lastFeedbackKey = useRef<string | undefined>(undefined);
  const loadingStarted = useRef(0);
  const previousHp = useRef<
    { battleId: string; playerHp: number; enemyHp: number } | undefined
  >(undefined);
  const reportReady = useCallback(
    (controls: WorldControls) => setWorld(controls),
    [],
  );
  const reportChange = useCallback(() => render((value) => value + 1), []);
  const reportError = useCallback(() => setLoadError(true), []);
  useEffect(() => {
    if (phase !== "loading" || WorldRenderer) return;
    let active = true;
    import("../game/PhaserWorld").then(
      (module) => {
        if (active) setWorldRenderer(() => module.PhaserWorld);
      },
      () => {
        if (active) reportError();
      },
    );
    return () => {
      active = false;
    };
  }, [phase, WorldRenderer, reportError, attempt]);
  useEffect(() => {
    if (phase !== "closing" || doorsLoaded.size !== 2 || loadError) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        playDoorCloseSound();
        setClosed(true);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [phase, doorsLoaded.size, loadError]);
  useEffect(() => {
    if (phase !== "closing" || !closed) return;
    const timer = setTimeout(
      () => {
        loadingStarted.current = performance.now();
        setPhase("loading");
      },
      reducedMotion ? 0 : 650,
    );
    return () => clearTimeout(timer);
  }, [phase, closed, reducedMotion]);
  useEffect(() => {
    if (phase !== "loading") return;
    const timer = setTimeout(() => setMinimumElapsed(true), 1500);
    return () => clearTimeout(timer);
  }, [phase, attempt]);
  useEffect(() => {
    if (phase === "ready" || phase === "opening" || loadError || (phase === "loading" && !battleReady)) return;
    const timer = setTimeout(reportError, 20000);
    return () => clearTimeout(timer);
  }, [phase, attempt, loadError, reportError, battleReady]);
  useEffect(() => {
    if (phase !== "loading" || !world || !minimumElapsed || loadError) return;
    const timer = setTimeout(() => {
      playDoorOpenSound();
      setPhase("opening");
    }, 0);
    return () => clearTimeout(timer);
  }, [phase, world, minimumElapsed, loadError]);
  useEffect(() => {
    if (phase !== "opening") return;
    const timer = setTimeout(() => setPhase("ready"), reducedMotion ? 0 : 750);
    return () => clearTimeout(timer);
  }, [phase, reducedMotion]);
  useEffect(() => {
    world?.setActive(phase === "ready" && !loadError && menu === null);
  }, [phase, world, loadError, menu]);
  useEffect(() => {
    setOverworldSound(phase === "ready" && !loadError && menu === null);
    return () => setOverworldSound(false);
  }, [phase, loadError, menu]);
  const battleId = battle?.id;
  const playerHp = battle?.playerHp;
  const enemyHp = battle?.enemyHp;
  const feedback = battle?.feedback;
  const feedbackKey = feedback && battleId
    ? `${battleId}:${feedback.questionId}`
    : undefined;
  const game = world?.model;
  const gameState = game?.state;
  const inEncounter =
    gameState === GameState.encounter || gameState === GameState.bossEncounter;
  const showingEnemyDefeat =
    attackInProgress &&
    feedback?.correct === true &&
    battle !== null &&
    battle.correct > 0 &&
    battle.correct % 2 === 0;
  useEffect(() => {
    setStreak(0);
    setAttackInProgress(false);
    previousHp.current = undefined;
    lastFeedbackKey.current = undefined;
  }, [battleId]);
  useEffect(() => {
    if (!feedbackKey) {
      lastFeedbackKey.current = undefined;
      return;
    }
    if (feedbackKey === lastFeedbackKey.current) return;
    lastFeedbackKey.current = feedbackKey;
    if (submittedAnswerKey.current !== feedbackKey) return;
    submittedAnswerKey.current = undefined;
    if (!battle || !world || !inEncounter || !feedback) return;
    const previous = previousHp.current;
    const sameBattle = previous?.battleId === battle.id;
    const enemyDamage = sameBattle
      ? Math.max(0, previous.enemyHp - battle.enemyHp)
      : 0;
    const playerDamage = sameBattle
      ? Math.max(0, previous.playerHp - battle.playerHp)
      : 0;
    previousHp.current = {
      battleId: battle.id,
      playerHp: battle.playerHp,
      enemyHp: battle.enemyHp,
    };
    setAttackInProgress(true);
    if (feedback.correct) {
      world.attackPlayer(
        enemyDamage || Math.min(50, battle.enemyMaxHp),
        battle.correct > 0 && battle.correct % 2 === 0,
        () => {
          setAttackInProgress(false);
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          if (nextStreak > 5) playFireGustSound();
          playCorrectAnswerSound();
        },
      );
    } else {
      setStreak(0);
      playWrongAnswerSound();
      if (playerDamage > 0) playDamageSound();
      world.attackEnemy(
        playerDamage || Math.min(50, battle.playerMaxHp),
        () => setAttackInProgress(false),
      );
    }
  }, [battle, feedback, feedbackKey, inEncounter, streak, world]);
  useEffect(() => {
    if (battleId === undefined || playerHp === undefined || enemyHp === undefined) return;
    const previous = previousHp.current;
    if (previous?.battleId !== battleId) {
      previousHp.current = { battleId, playerHp, enemyHp };
    } else {
      previousHp.current = { ...previous, playerHp, enemyHp };
    }
  }, [battleId, enemyHp, playerHp]);
  useEffect(() => {
    if (menu) menuDialog.current?.showModal();
    else menuDialog.current?.close();
  }, [menu]);
  useEffect(() => {
    if (gameState === GameState.result && !recorded.current) {
      recorded.current = true;
      playWinSound();
      setSaving(true);
      onComplete()
        .catch((error) =>
          setSaveError(
            error instanceof Error
              ? error.message
              : "Could not save the result. Try again.",
          ),
        )
        .finally(() => setSaving(false));
    }
  }, [gameState, onComplete]);
  function retry() {
    setWorld(undefined);
    setLoadError(false);
    setMinimumElapsed(false);
    setClosed(false);
    setDoorsLoaded(new Set());
    setPhase("closing");
    setAttempt((value) => value + 1);
    recorded.current = false;
  }
  return (
    <div
      className="battle-screen"
      data-phase={phase}
      data-testid="fight-page"
      data-loading-started={loadingStarted.current}
    >
      <div
        ref={setStageElement}
        className="battle-stage"
        data-testid="combat-visual"
      >
        {phase !== "closing" && WorldRenderer && battle && (
          <WorldRenderer
            key={attempt}
            onReady={reportReady}
            onChange={reportChange}
            onError={reportError}
            reducedMotion={reducedMotion}
          />
        )}
        {world && game && battle && (
          <div aria-hidden={phase !== "ready"} inert={phase !== "ready"}>
            <header className="battle-header">
              <div className="battle-heading">
                <h1>{title}</h1>
                <p>
                  Chapter {battle.chapter} · {battle.total} questions
                </p>
              </div>
              {streak > 0 && (
                <div
                  key={streak}
                  className="battle-streak"
                  data-testid="battle-streak"
                  aria-label={`${streak} correct answers in a row`}
                  style={{
                    boxShadow: `0 0 ${12 + Math.min(streak, 10) * 3}px rgba(255, 160, 32, ${Math.min(0.55, 0.3 + streak * 0.025)})`,
                  }}
                >
                  <img
                    src={icons.fire}
                    alt=""
                    style={{
                      filter: `drop-shadow(0 0 ${4 + Math.min(streak, 10) * 2}px #ff8a1a) brightness(${1 + Math.min(streak, 10) * 0.04})`,
                    }}
                  />
                  <span>{streak}</span>
                </div>
              )}
              <button type="button" aria-label="Battle menu" aria-haspopup="dialog" disabled={answering || saving} onClick={() => setMenu("pause")} className="battle-menu-toggle">
                <span aria-hidden="true">&#9776;</span>
              </button>
            </header>
            {!inEncounter && game.state !== GameState.result && (
              <div className="east"><Icon name="arrow-right" size={18} color="#fff4c8" />EAST</div>
            )}
          </div>
        )}
      </div>
      {world && game && battle && (
        <div className="battle-lower" aria-hidden={phase !== "ready"} inert={phase !== "ready"}>
          <div className="battle-health-row">
            <HealthBar
              hp={battle.playerHp}
              max={battle.playerMaxHp}
              label="Player health"
              profile={characterProfiles.olan}
            />
            {inEncounter && !game.enemyDefeated && (
              <HealthBar
                enemy
                hp={showingEnemyDefeat ? 0 : battle.enemyHp}
                max={battle.enemyMaxHp}
                label={`Enemy ${battle.enemiesDefeated + (battle.enemyHp > 0 ? 1 : 0)}`}
                profile={characterProfiles[(game.encounter?.name ?? "Nerdius") === "Hannah"
                  ? "hannah"
                  : (game.encounter?.name ?? "Nerdius") === "Snarger"
                    ? "snarger"
                    : "nerdius"]}
              />
            )}
          </div>
        <footer
          className="battle-footer"
          data-testid="combat-quiz"
          data-encounter={inEncounter}
          aria-hidden={phase !== "ready"}
          inert={phase !== "ready"}
        >
          <div className="battle-status">
            <div className="battle-status-copy">
              <h2 data-testid="fight-status" aria-live="polite">
                {game.state === GameState.result
                  ? battle.status === "passed"
                    ? "Chapter cleared!"
                    : battle.status === "failed"
                      ? "Defeated"
                      : "Saving result…"
                  : game.paused
                    ? "Journey paused"
                    : status[game.state]}
              </h2>
              {!inEncounter && <p>
                {game.state === GameState.result
                    ? `${battle.correct} / ${battle.total} correct. ${battle.status === "passed" ? `+${battle.goldReward} gold · +${battle.gemsReward ?? 0} gems / +${battle.xpReward} XP` : battle.status === "failed" ? "Your HP reached 0. Retry the chapter." : "Saving your combat result."}`
                    : game.state === GameState.encounterComplete
                      ? "The trail opens up again."
                      : "Follow the path toward the next clearing."}
              </p>}
            </div>
            <div className="battle-cleared">
              <Icon name="flag-checkered" size={19} color="#506837" />
              <span>{battle.enemiesDefeated} defeated</span>
            </div>
          </div>
          {inEncounter && (
            <BattleQuiz
              battle={battle}
              acknowledged={acknowledged}
              speaker={game.encounter?.name ?? "Nerdius"}
              attackInProgress={attackInProgress}
              speechBubbleTarget={stageElement}
              onAcknowledge={setAcknowledged}
              tutorial={tutorial}
              onAnswer={async (questionId, selectedIndex) => {
                const submittedKey = `${battle.id}:${questionId}`;
                submittedAnswerKey.current = submittedKey;
                setAnswering(true);
                try {
                  await onAnswer(questionId, selectedIndex);
                } catch (error) {
                  if (submittedAnswerKey.current === submittedKey)
                    submittedAnswerKey.current = undefined;
                  throw error;
                }
                finally { setAnswering(false); }
              }}
              onAdvance={() => world.act(() => game.completeEncounter(battle.finished))}
            />
          )}
          {game.state === GameState.result && (
            <div className="result-actions">
              {saveError && (
                <p className="quiz-error" role="alert">
                  {saveError}
                </p>
              )}
              {battle.status === "active" ? (
                <Button
                  label={saving ? "Saving result…" : "Retry saving"}
                  disabled={saving}
                  tone="gold"
                  onPress={() => {
                    setSaving(true);
                    setSaveError(undefined);
                    onComplete()
                      .catch((error) => setSaveError(error.message))
                      .finally(() => setSaving(false));
                  }}
                />
              ) : (
                <>
                  <Button
                    label="Back to chapter"
                    tone="gold"
                    onPress={() => navigate("RegionDetail")}
                  />
                  <Button
                    label={saving ? "Starting…" : "Retry chapter"}
                    disabled={saving}
                    tone="quiet"
                    onPress={() => {
                      setSaving(true);
                      setSaveError(undefined);
                      onRestart()
                        .catch((error) => setSaveError(error.message))
                        .finally(() => setSaving(false));
                    }}
                  />
                </>
              )}
            </div>
          )}
        </footer>
        </div>
      )}
      <dialog ref={menuDialog} className="battle-menu" aria-labelledby="battle-menu-title" onCancel={(event) => { event.preventDefault(); if (!saving) setMenu(menu === "pause" ? null : "pause"); }}>
        <div className="battle-menu-card">
          <h2 id="battle-menu-title">{menu === "restart" ? "Restart battle?" : menu === "exit" ? "Exit battle?" : "Paused"}</h2>
          {menu === "pause" ? <>
            <Button label="Continue" tone="gold" onPress={() => setMenu(null)} />
            <Button label="Restart" onPress={() => setMenu("restart")} />
            <Button label="Exit" style={exitStyle} onPress={() => setMenu("exit")} />
          </> : <>
            <p>{menu === "restart" ? "Restart resets your answers and HP. Unclaimed gold and gems from this attempt will be lost." : "Exit resets this attempt. Unclaimed gold and gems will be lost. Win the chapter to keep your drops."}</p>
            {saveError && <p className="quiz-error" role="alert">{saveError}</p>}
            <Button label={saving ? (menu === "exit" ? "Exiting..." : "Restarting...") : menu === "restart" ? "Confirm restart" : "Confirm exit"} disabled={saving} tone="gold" style={menu === "exit" ? exitStyle : undefined} onPress={() => {
              setSaving(true); setSaveError(undefined);
              const action = menu === "exit" ? onExit().then(() => navigate("RegionDetail")) : onRestart();
              action.catch((error) => setSaveError(error.message)).finally(() => setSaving(false));
            }} />
            <Button label="Cancel" tone="quiet" disabled={saving} onPress={() => { setSaveError(undefined); setMenu("pause"); }} />
          </>}
        </div>
      </dialog>
      {(phase !== "ready" || loadError) && (
        <div
          className={`gate ${loadError ? "loading" : phase} ${closed ? "closed" : ""}`}
          data-testid={`gate-${phase}`}
          aria-label="Loading adventure"
          aria-live="polite"
        >
          {[art.doorLeft, art.doorRight].map((source, index) => (
            <div
              key={`${attempt}-${index}`}
              className={`gate-door ${index === 0 ? "left" : "right"}`}
            >
              <img
                src={source}
                alt=""
                onLoad={() =>
                  setDoorsLoaded((current) =>
                    current.has(index) ? current : new Set(current).add(index),
                  )
                }
                onError={reportError}
              />
            </div>
          ))}
          {!loadError && ((phase === "closing" && closed) || phase === "loading") && (
            <img
              className="gate-loading-character"
              src={art.nerdLoading}
              alt="Loading adventure"
            />
          )}
          {loadError && (
            <div className="loading-actions" role="alert">
              <p>Some assets failed to load.</p>
              {saveError && <p>{saveError}</p>}
              <Button
                label={saving ? "Exiting..." : "Exit"}
                tone="quiet"
                disabled={saving || !battleReady}
                onPress={() => {
                  setSaving(true); setSaveError(undefined);
                  onExit().then(() => navigate("RegionDetail")).catch((error) => setSaveError(error.message)).finally(() => setSaving(false));
                }}
              />
              <Button label="Retry" tone="gold" onPress={retry} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const exitStyle = { backgroundColor: "#b9322c", color: "#fff8e7", borderColor: "#76241e" };
function HealthBar({
  hp,
  max,
  label,
  enemy = false,
  profile,
}: {
  hp: number;
  max: number;
  label: string;
  enemy?: boolean;
  profile: string;
}) {
  const id = enemy ? "enemy-hp" : "player-hp";
  return <section className={`battle-health ${enemy ? "combat-hud" : "player-health"}`} aria-label={label}>
    <div className={`health-bar ${enemy ? "enemy-health-bar" : ""}`}>
      {!enemy && <img className="health-profile" src={profile} alt="" />}
      <div className="health-frame"><progress id={id} aria-label={label} max={max} value={hp} /></div>
      {enemy && <img className="health-profile" src={profile} alt="" />}
    </div>
  </section>;
}
