import { ChunkManager } from "./ChunkManager";
import { encounters, WORLD } from "./level";
import { GameState, type GamePhase, type ActiveEncounter } from "./types";

const transitions: Record<GamePhase, readonly GamePhase[]> = {
  walking: [GameState.encounterStarting, GameState.result],
  encounterStarting: [GameState.encounter, GameState.bossEncounter],
  encounter: [GameState.encounterComplete],
  bossEncounter: [GameState.encounterComplete],
  encounterComplete: [GameState.walking, GameState.result],
  result: [GameState.walking],
};

export class FantasyGame {
  state: GamePhase = GameState.walking;
  chunks: ChunkManager;
  playerY: number;
  speed: number = WORLD.speed;
  velocity = 0;
  distance = 0;
  walkTime = 0;
  paused = false;
  revision = 0;
  cleared = 0;
  enemyDefeated = false;
  private finished = false;
  encounter: ActiveEncounter | null = null;
  private elapsed = 0;
  private debugStop: number | null = null;
  private nextEncounter = 0;

  constructor(height: number) {
    this.playerY = height * WORLD.playerRatio;
    this.chunks = new ChunkManager(height);
  }

  private transition(next: GamePhase) {
    if (!transitions[this.state].includes(next)) throw new Error(`Invalid game transition: ${this.state} -> ${next}`);
    this.state = next;
    this.elapsed = 0;
    this.velocity = 0;
    this.revision++;
  }

  resize(height: number) {
    const playerY = height * WORLD.playerRatio;
    this.chunks.resize(height, playerY - this.playerY);
    this.playerY = playerY;
    this.revision++;
  }

  setSpeed(speed: number) {
    if (!Number.isFinite(speed)) return;
    this.speed = Math.max(WORLD.minSpeed, Math.min(WORLD.maxSpeed, speed));
    this.revision++;
  }

  togglePause() { this.paused = !this.paused; this.revision++; }

  triggerEncounter() {
    if (this.state !== GameState.walking || this.debugStop !== null) return;
    this.debugStop = this.distance + Math.max(1, this.velocity * WORLD.brakeSeconds / 2);
    this.revision++;
  }

  private beginEncounter(spawn?: Omit<ActiveEncounter, "debug">) {
    this.encounter = spawn
      ? { ...spawn, count: 1, debug: false }
      : { count: 1, boss: false, name: "Forest Imp", debug: true };
    this.debugStop = null;
    this.enemyDefeated = false;
    this.transition(GameState.encounterStarting);
  }

  defeatEnemy() {
    if (this.enemyDefeated) return;
    this.enemyDefeated = true;
    this.revision++;
  }

  completeEncounter(finished = false) {
    if (this.state !== GameState.encounter && this.state !== GameState.bossEncounter) return;
    this.finished = finished;
    this.cleared++;
    this.transition(GameState.encounterComplete);
  }

  continueTrail() {
    if (this.state === GameState.result) this.transition(GameState.walking);
  }

  update(delta: number) {
    if (this.paused || !Number.isFinite(delta) || delta <= 0) return;
    const dt = Math.min(delta, WORLD.maxDelta);
    if (this.state !== GameState.walking) {
      this.elapsed += dt;
      if (this.state === GameState.encounterStarting && this.elapsed >= WORLD.revealSeconds) {
        this.transition(this.encounter?.boss ? GameState.bossEncounter : GameState.encounter);
      } else if (this.state === GameState.encounterComplete && this.elapsed >= WORLD.completeSeconds) {
        this.encounter = null;
        this.transition(this.finished && !this.enemyDefeated ? GameState.result : GameState.walking);
      }
      return;
    }

    this.elapsed += dt;
    if (this.finished && this.elapsed >= 3) { this.transition(GameState.result); return; }
    const remaining = this.debugStop === null ? Infinity : Math.max(0, this.debugStop - this.distance);
    const brakingDistance = this.speed * WORLD.brakeSeconds / 2;
    let movement: number;
    let reached = false;
    if (remaining <= brakingDistance + 0.001) {
      // Brake inside WALKING so every other state has strictly frozen chunks.
      const velocity = this.velocity || this.speed;
      const deceleration = velocity * velocity / (2 * Math.max(remaining, 0.000001));
      const step = Math.min(dt, velocity / deceleration);
      movement = velocity * step - deceleration * step * step / 2;
      this.velocity = Math.max(0, velocity - deceleration * step);
      if (remaining - movement < 0.02 || this.velocity < 0.01) { movement = remaining; reached = true; }
    } else {
      this.velocity += Math.max(-this.speed * dt * 2, Math.min(this.speed * dt * 2, this.speed - this.velocity));
      movement = Math.min(this.velocity * dt, remaining - brakingDistance);
    }
    this.chunks.advance(movement);
    this.distance += movement;
    this.walkTime += dt;
    if (reached) this.beginEncounter();
    else if (this.debugStop === null && !this.finished && this.elapsed >= (this.cleared ? 5.5 : WORLD.walkSeconds)) {
      this.beginEncounter(encounters[this.nextEncounter++ % encounters.length]);
    }
  }
}
