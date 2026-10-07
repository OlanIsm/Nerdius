import { useCallback, useEffect, useRef, useState } from "react";
import { art, icons } from "../assets";
import { Button, Icon, useReducedMotion } from "../components/GameUI";
import type { WorldControls } from "../game/PhaserWorld";
import { GameState, type GamePhase } from "../game/types";
import type { ScreenProps } from "../types";
import type { BattleView } from "../gameApi";
import { BattleQuiz } from "../components/BattleQuiz";
import { playDamageSound, setOverworldSound } from "../components/gameAudio";

const status: Record<GamePhase, string> = {
  walking: "Walking east",
  encounterStarting: "Something stirs ahead…",
  encounter: "Forest encounter",
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
  const [WorldRenderer, setWorldRenderer] =
    useState<typeof import("../game/PhaserWorld").PhaserWorld>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [, render] = useState(0);
  const [menu, setMenu] = useState<"pause" | "restart" | "exit" | null>(null);
  const [answering, setAnswering] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string>();
  const menuDialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const recorded = useRef(false);
  const loadingStarted = useRef(0);
  const previousHp = useRef<{ battleId: string; hp: number } | undefined>(
    undefined,
  );
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
      frame = requestAnimationFrame(() => setClosed(true));
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
    const timer = setTimeout(() => setPhase("opening"), 0);
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
  useEffect(() => {
    if (battleId === undefined || playerHp === undefined) return;
    const previous = previousHp.current;
    if (
      previous?.battleId === battleId &&
      playerHp < previous.hp
    ) {
      playDamageSound();
    }
    previousHp.current = { battleId, hp: playerHp };
  }, [battleId, playerHp]);
  useEffect(() => {
    if (menu) menuDialog.current?.showModal();
    else menuDialog.current?.close();
  }, [menu]);
  const game = world?.model;
  const gameState = game?.state;
  useEffect(() => {
    if (gameState === GameState.result && !recorded.current) {
      recorded.current = true;
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
  const inEncounter =
    gameState === GameState.encounter || gameState === GameState.bossEncounter;
  useEffect(() => {
    if (world && inEncounter && battle?.feedback?.correct && battle.correct % 2 === 0 && battle.feedback.questionId !== acknowledged) {
      world.act(() => world.model.defeatEnemy());
    }
  }, [world, inEncounter, battle, acknowledged]);
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
      <div className="battle-stage" data-testid="combat-visual">
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
              <button type="button" aria-label="Battle menu" aria-haspopup="dialog" disabled={answering || saving} onClick={() => setMenu("pause")} className="battle-menu-toggle">
                <span aria-hidden="true">&#9776;</span>
              </button>
            </header>
            {inEncounter && !game.enemyDefeated && <HealthBar enemy hp={battle.enemyHp} max={battle.enemyMaxHp} label={`Enemy ${battle.enemiesDefeated + (battle.enemyHp > 0 ? 1 : 0)}`} />}
            {!inEncounter && game.state !== GameState.result && (
              <div className="east"><Icon name="arrow-right" size={18} color="#fff4c8" />EAST</div>
            )}
          </div>
        )}
      </div>
      {world && game && battle && (
        <div className="battle-lower" aria-hidden={phase !== "ready"} inert={phase !== "ready"}>
          <HealthBar hp={battle.playerHp} max={battle.playerMaxHp} label="Player health" />
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
              onAcknowledge={setAcknowledged}
              tutorial={tutorial}
              onAnswer={async (questionId, selectedIndex) => {
                setAnswering(true);
                try { await onAnswer(questionId, selectedIndex); }
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
function HealthBar({ hp, max, label, enemy = false }: { hp: number; max: number; label: string; enemy?: boolean }) {
  const id = enemy ? "enemy-hp" : "player-hp";
  return <section className={`battle-health ${enemy ? "combat-hud" : "player-health"}`} aria-label={enemy ? "Enemy health" : "Player health"} style={enemy ? undefined : { backgroundImage: `url("${art.navPlank}")` }}>
    {enemy && <label htmlFor={id}><span>{label}</span><strong>{hp} / {max} HP</strong></label>}
    <div className="health-bar"><img className="health-heart" src={icons.heart} alt="" /><div className="health-frame"><progress id={id} aria-label={label} max={max} value={hp} /></div></div>
  </section>;
}
