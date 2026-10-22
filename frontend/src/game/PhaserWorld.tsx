import { useEffect, useRef } from "react";
import Phaser from "phaser";
import atlas from "../../assets/character/mc-walk/spritesheet.json";
import olanIdleAtlas from "../../assets/character/olan-idle/spritesheet.json";
import olanAttackAtlas from "../../assets/character/olan-attack/spritesheet.json";
import hannahIdleAtlas from "../../assets/character/hannah-idle/spritesheet.json";
import hannahAttackAtlas from "../../assets/character/hannah-photo-attack/spritesheet.json";
import snargerIdleAtlas from "../../assets/character/snarger-idle/spritesheet.json";
import nerdIdleAtlas from "../../assets/character/nerd-idle/spritesheet.json";
import nerdAttackAtlas from "../../assets/character/nerd-well-actually/spritesheet.json";
import { FantasyGame } from "./FantasyGame";
import { GameState, type SavannahEnemy } from "./types";
import { WORLD } from "./level";
import { icons } from "../assets";
import { BattleLoot } from "./BattleLoot";
import {
  playCharacterAttackSound,
  playDamageHitSound,
  playImpactThudSound,
  playTreasureSound,
  setWalkingSound,
} from "../components/gameAudio";

const walkTexture = new URL(
  "../../assets/character/mc-walk/spritesheet.png",
  import.meta.url,
).href;
const olanIdleTexture = new URL(
  "../../assets/character/olan-idle/spritesheet.png",
  import.meta.url,
).href;
const olanAttackTexture = new URL(
  "../../assets/character/olan-attack/spritesheet.png",
  import.meta.url,
).href;
const hannahIdleTexture = new URL(
  "../../assets/character/hannah-idle/spritesheet.png",
  import.meta.url,
).href;
const hannahAttackTexture = new URL(
  "../../assets/character/hannah-photo-attack/spritesheet.png",
  import.meta.url,
).href;
const snargerIdleTexture = new URL(
  "../../assets/character/snarger-idle/spritesheet.png",
  import.meta.url,
).href;
const nerdIdleTexture = new URL(
  "../../assets/character/nerd-idle/spritesheet.png",
  import.meta.url,
).href;
const nerdAttackTexture = new URL(
  "../../assets/character/nerd-well-actually/spritesheet.png",
  import.meta.url,
).href;
const layers = [
  {
    name: "savannah-1",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/1.webp",
      import.meta.url,
    ).href,
    speed: 0,
  },
  {
    name: "savannah-2",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/2.webp",
      import.meta.url,
    ).href,
    speed: 0.04,
  },
  {
    name: "savannah-3",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/3.webp",
      import.meta.url,
    ).href,
    speed: 0.07,
  },
  {
    name: "savannah-4",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/4.webp",
      import.meta.url,
    ).href,
    speed: 0.1,
  },
  {
    name: "savannah-5",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/5.webp",
      import.meta.url,
    ).href,
    speed: 0.14,
  },
  {
    name: "savannah-6",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/6.webp",
      import.meta.url,
    ).href,
    speed: 0.2,
  },
  {
    name: "savannah-7",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/7.webp",
      import.meta.url,
    ).href,
    speed: 0.68,
  },
  {
    name: "savannah-8",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/8.webp",
      import.meta.url,
    ).href,
    speed: 0.76,
  },
  {
    name: "savannah-9",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/9.webp",
      import.meta.url,
    ).href,
    speed: 0.95,
  },
  {
    name: "savannah-10",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/10.webp",
      import.meta.url,
    ).href,
    speed: 1.05,
  },
  {
    name: "savannah-11",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/11.webp",
      import.meta.url,
    ).href,
    speed: 1.2,
  },
] as const;
const ACTOR_SIZE = (1.7 / 2.54) * 96;
const GAME_PIXELS_PER_MM = 96 / 25.4;
const OLAN_SPRITE_SCALE = ACTOR_SIZE / 768;
// Adjust these game-space pixel offsets relative to Olan's idle center.
const OLAN_ATTACK_PLACEMENT = { offsetX: 0, offsetY: 0 };
const PLAYER_POSITION = { x: 102, y: 0.71 };
const ENEMY_POSITION = { x: 244, y: 0.71 };
const ACTOR_DEPTH = layers.length - 3.5;
const FOREGROUND_DEPTH = layers.length - 1;
const BACKGROUND_HEIGHT_RATIO = 1;
const BACKGROUND_ASPECT_RATIO = 3973 / 3000;
const DAMAGE_COLORS = {
  olan: 0x9aaacb,
  hannah: 0xff3948,
  snarger: 0xff8a22,
  nerd: 0xffdc28,
} as const;
export const OLAN_ATTACK_SOUND_DELAY_MS = 0;
const GODRAYS = { enabled: true, alpha: 0.045, speed: 0.035, spacing: 150 };
type EnemyAssets = {
  idle: string;
  attack?: string;
  color: number;
  scale: number;
  verticalOffsetMm: number;
};
const ENEMY_ASSETS: Record<SavannahEnemy, EnemyAssets> = {
  Hannah: {
    idle: "hannah-idle",
    attack: "hannah-attack",
    color: DAMAGE_COLORS.hannah,
    scale: (ACTOR_SIZE / 768) * 1.5,
    verticalOffsetMm: 0,
  },
  Snarger: {
    idle: "snarger-idle",
    color: DAMAGE_COLORS.snarger,
    scale: (ACTOR_SIZE / 2101) * 1.5,
    verticalOffsetMm: 0,
  },
  Nerdius: {
    idle: "nerd-idle",
    attack: "nerd-well-actually",
    color: DAMAGE_COLORS.nerd,
    scale: ACTOR_SIZE / 768,
    verticalOffsetMm: 0,
  },
};
export type WorldControls = {
  model: FantasyGame;
  act: (action: () => void) => void;
  skipToNextEncounter: () => void;
  setActive: (active: boolean) => void;
  attackPlayer: (damage: number, defeatsEnemy: boolean, onComplete: () => void) => void;
  attackEnemy: (damage: number, onComplete: () => void) => void;
};
export function PhaserWorld({
  onReady,
  onChange,
  onError,
  reducedMotion,
}: {
  onReady: (world: WorldControls) => void;
  onChange: () => void;
  onError: () => void;
  reducedMotion: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const motion = useRef(reducedMotion);
  useEffect(() => {
    motion.current = reducedMotion;
  }, [reducedMotion]);
  useEffect(() => {
    const parent = host.current!;
    let disposed = false;
    let active = false;
    let lastRevision = -1;
    const model = new FantasyGame(
      parent.clientHeight / (parent.clientWidth / WORLD.width),
    );
    class TrailScene extends Phaser.Scene {
      private hero!: Phaser.GameObjects.Sprite;
      private scenery: Phaser.GameObjects.Image[][] = [];
      private enemies: Phaser.GameObjects.Sprite[] = [];
      private shadows: Phaser.GameObjects.Ellipse[] = [];
      private heroShadow!: Phaser.GameObjects.Ellipse;
      private godrays!: Phaser.GameObjects.Graphics;
      private olanAttackImage?: HTMLImageElement;
      private olanAttackContext?: CanvasRenderingContext2D;
      private olanAttackTexture?: Phaser.Textures.CanvasTexture;
      private encounterKey = "";
      private heroAttacking = false;
      private loot!: BattleLoot;
      private dropped = false;
      preload() {
        this.load.on("loaderror", () => {
          if (!disposed) onError();
        });
        this.load.atlas("scholar", walkTexture, atlas);
        this.load.atlas("olan-idle", olanIdleTexture, olanIdleAtlas);
        this.load.atlas("hannah-idle", hannahIdleTexture, hannahIdleAtlas);
        this.load.atlas("hannah-attack", hannahAttackTexture, hannahAttackAtlas);
        this.load.atlas("snarger-idle", snargerIdleTexture, snargerIdleAtlas);
        this.load.atlas("nerd-idle", nerdIdleTexture, nerdIdleAtlas);
        this.load.atlas("nerd-well-actually", nerdAttackTexture, nerdAttackAtlas);
        this.load.image("loot-coin", icons.coins);
        this.load.image("loot-gem", icons.gems);
        layers.forEach((layer) => this.load.image(layer.name, layer.url));
      }
      create() {
        if (disposed) return;
        if (
          !this.textures.exists("scholar") ||
          !this.textures.exists("olan-idle") ||
          !this.textures.exists("hannah-idle") ||
          !this.textures.exists("hannah-attack") ||
          !this.textures.exists("snarger-idle") ||
          !this.textures.exists("nerd-idle") ||
          !this.textures.exists("nerd-well-actually") ||
          !this.textures.exists("loot-coin") ||
          !this.textures.exists("loot-gem") ||
          layers.some((layer) => !this.textures.exists(layer.name))
        ) {
          onError();
          return;
        }
        [
          "scholar",
          "olan-idle",
          "hannah-idle",
          "hannah-attack",
          "snarger-idle",
          "nerd-idle",
          "nerd-well-actually",
          ...layers.map((layer) => layer.name),
        ].forEach((key) =>
          this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR),
        );
        const framesFor = (texture: string, sheet: { frames: Record<string, unknown> }) =>
          Object.keys(sheet.frames).sort().map((frame) => ({ key: texture, frame }));
        this.anims.create({
          key: "scholar-walk",
          frames: framesFor("scholar", atlas),
          frameRate: 12,
          repeat: -1,
        });
        this.anims.create({
          key: "olan-idle",
          frames: framesFor("olan-idle", olanIdleAtlas),
          frameRate: 7,
          repeat: -1,
        });
        this.anims.create({
          key: "hannah-idle",
          frames: framesFor("hannah-idle", hannahIdleAtlas),
          frameRate: 7,
          repeat: -1,
        });
        this.anims.create({
          key: "hannah-attack",
          frames: framesFor("hannah-attack", hannahAttackAtlas),
          frameRate: 12,
          repeat: 0,
        });
        this.anims.create({
          key: "snarger-idle",
          frames: framesFor("snarger-idle", snargerIdleAtlas),
          frameRate: 7,
          repeat: -1,
        });
        this.anims.create({
          key: "nerd-idle",
          frames: framesFor("nerd-idle", nerdIdleAtlas),
          frameRate: 7,
          repeat: -1,
        });
        this.anims.create({
          key: "nerd-well-actually",
          frames: framesFor("nerd-well-actually", nerdAttackAtlas),
          frameRate: 12,
          repeat: 1,
        });
        this.scenery = layers.map(() => []);
        this.heroShadow = this.add
          .ellipse(0, 0, ACTOR_SIZE * 0.75, 4, 0x443423, 0.24)
          .setDepth(ACTOR_DEPTH);
        this.hero = this.add
          .sprite(0, 0, "olan-idle")
          .setOrigin(0.5, 1)
          .setScale(OLAN_SPRITE_SCALE)
          .setDepth(ACTOR_DEPTH);
        this.hero.play("olan-idle");
        this.godrays = this.add.graphics().setDepth(FOREGROUND_DEPTH + 1);
        const particle = this.add.graphics();
        particle.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
        particle.generateTexture("impact-dot", 8, 8);
        particle.destroy();
        const reportFrame = () => {
          parent.dataset.walkFrame = this.hero.frame.name;
          parent.dataset.distance = String(model.distance);
        };
        this.hero.on("animationupdate", reportFrame);
        this.hero.on("animationstart", reportFrame);
        this.loot = new BattleLoot(this, ACTOR_DEPTH);
        parent.dataset.layers = JSON.stringify(
          layers.map((layer) => layer.url),
        );
        parent.dataset.renderer =
          this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas";
        parent.dataset.actorSize = String(ACTOR_SIZE);
        parent.dataset.actorDepth = String(ACTOR_DEPTH);
        parent.dataset.foregroundDepth = String(FOREGROUND_DEPTH);
        parent.dataset.playerPosition = JSON.stringify(PLAYER_POSITION);
        parent.dataset.walkFrame = this.hero.frame.name;
        this.loadOlanAttackTexture(() => {
          if (disposed) return;
          this.layout();
          this.sync();
          onReady({
            model,
            act: (action) => {
              action();
              this.sync();
            },
            skipToNextEncounter: () => {
              this.loot.clear();
              this.dropped = true;
              model.skipToNextEncounter();
              this.sync();
            },
            setActive: (value) => {
              active = value;
              this.sync();
            },
            attackPlayer: (damage, defeatsEnemy, onComplete) =>
              this.attackPlayer(damage, defeatsEnemy, onComplete),
            attackEnemy: (damage, onComplete) =>
              this.attackEnemy(damage, onComplete),
          });
        });
      }
      private loadOlanAttackTexture(onReady: () => void) {
        const image = new Image();
        image.onerror = () => {
          if (!disposed) {
            console.error("Olan's attack spritesheet could not be decoded.");
            onError();
          }
        };
        image.onload = () => {
          if (disposed) return;
          const frames = Object.entries(olanAttackAtlas.frames).sort(
            ([left], [right]) => left.localeCompare(right),
          );
          const first = frames[0]?.[1].frame;
          if (!first) {
            console.error("Olan's attack spritesheet contains no frames.");
            onError();
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = first.w;
          canvas.height = first.h;
          const context = canvas.getContext("2d");
          if (!context) {
            console.error("A 2D canvas context is unavailable for Olan's attack.");
            onError();
            return;
          }
          const texture = this.textures.addCanvas("olan-attack-live", canvas);
          if (!texture) {
            console.error("Olan's attack texture could not be created.");
            onError();
            return;
          }
          texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
          this.olanAttackImage = image;
          this.olanAttackContext = context;
          this.olanAttackTexture = texture;
          onReady();
        };
        image.src = olanAttackTexture;
      }
      layout() {
        if (!this.hero) return;
        const { width, height } = this.scale;
        const scale = width / WORLD.width;
        const logicalHeight = height / scale;
        if (model.chunks.viewportHeight !== logicalHeight)
          model.resize(logicalHeight);
        const tileHeight = height * BACKGROUND_HEIGHT_RATIO;
        const tileWidth = tileHeight * BACKGROUND_ASPECT_RATIO;
        parent.dataset.backgroundSize = JSON.stringify({
          width: tileWidth,
          height: tileHeight,
        });
        const imageTop = 0;
        parent.dataset.backgroundBottom = String(imageTop + tileHeight);
        const count = Math.ceil(width / tileWidth) + 1;
        this.scenery.forEach((images, layerIndex) => {
          while (images.length > count) images.pop()!.destroy();
          while (images.length < count)
            images.push(
              this.add
                .image(0, imageTop, layers[layerIndex].name)
                .setOrigin(0)
                .setDepth(layerIndex),
            );
          images.forEach((image) =>
            image.setDisplaySize(tileWidth, tileHeight).setY(imageTop),
          );
        });
        this.hero
          .setPosition(
            PLAYER_POSITION.x * scale,
            imageTop + tileHeight * PLAYER_POSITION.y,
          )
          .setScale(OLAN_SPRITE_SCALE);
        this.heroShadow
          .setPosition(
            PLAYER_POSITION.x * scale,
            imageTop + tileHeight * PLAYER_POSITION.y - 3,
          )
          .setDisplaySize(ACTOR_SIZE * 0.75, 4);
        this.updateEnemies(true);
        this.renderParallax();
      }
      private renderParallax() {
        const tileHeight = this.scale.height * BACKGROUND_HEIGHT_RATIO;
        const tileWidth = tileHeight * BACKGROUND_ASPECT_RATIO;
        this.scenery.forEach((images, index) => {
          const offset = (model.distance * layers[index].speed) % tileWidth;
          images.forEach((image, copy) =>
            image.setX(copy * tileWidth - offset),
          );
        });
        this.renderGodrays();
      }
      private renderGodrays() {
        if (!GODRAYS.enabled || !this.godrays) return;
        const width = this.scale.width;
        const height = this.scale.height;
        const drift = (model.distance * GODRAYS.speed) % GODRAYS.spacing;
        this.godrays.clear();
        const source = width * 0.08 - drift;
        for (let i = 0; i < 5; i++) {
          const top = source + i * 10;
          const spread = height * 0.16 + i * GODRAYS.spacing;
          this.godrays
            .fillStyle(0xfff5d6, GODRAYS.alpha)
            .fillPoints(
              [
                { x: top, y: 0 },
                { x: top + 16, y: 0 },
                { x: top + spread + 52, y: height },
                { x: top + spread, y: height },
              ],
              true,
            );
        }
      }
      private updateEnemies(force = false) {
        const encounter = model.encounter;
        const visible =
          encounter && !model.enemyDefeated && (model.state === GameState.encounter || model.state === GameState.bossEncounter);
        const key = visible ? `${encounter.name}:${encounter.count}:${encounter.boss}` : "";
        if (key !== this.encounterKey || force) {
          this.encounterKey = key;
          this.enemies.forEach((enemy) => enemy.destroy());
          this.shadows.forEach((shadow) => shadow.destroy());
          this.enemies = [];
          this.shadows = [];
          if (visible) {
            const scale = this.scale.width / WORLD.width;
            const x = ENEMY_POSITION.x * scale;
            const tileHeight = this.scale.height * BACKGROUND_HEIGHT_RATIO;
            const character = ENEMY_ASSETS[encounter.name];
            const y =
              tileHeight * ENEMY_POSITION.y +
              character.verticalOffsetMm * GAME_PIXELS_PER_MM * scale;
            this.shadows.push(
              this.add
                .ellipse(
                  x,
                  y - 3,
                  ACTOR_SIZE * 0.75,
                  4,
                  0x443423,
                  0.24,
                )
                .setDepth(ACTOR_DEPTH),
            );
            const enemy = this.add
                .sprite(x, y, character.idle)
                .setOrigin(0.5, 1)
                .setScale(character.scale)
                .setDepth(ACTOR_DEPTH);
            enemy.play(character.idle);
            this.enemies.push(enemy);
            parent.dataset.enemySize = String(ACTOR_SIZE);
            parent.dataset.enemyPosition = JSON.stringify(ENEMY_POSITION);
            parent.dataset.enemyDepth = String(ACTOR_DEPTH);
          }
        }
        if (!visible) {
          delete parent.dataset.enemySize;
          delete parent.dataset.enemyPosition;
          delete parent.dataset.enemyDepth;
        }
        this.enemies.forEach((enemy) =>
          enemy.setAlpha(
            model.state === GameState.encounterComplete ? 0.35 : 1,
          ),
        );
        if (parent.dataset.enemies !== String(this.enemies.length))
          parent.dataset.enemies = String(this.enemies.length);
      }
      private attackPlayer(
        damage: number,
        defeatsEnemy: boolean,
        onComplete: () => void,
      ) {
        if (this.heroAttacking) return;
        this.heroAttacking = true;
        this.playOlanAttack(this.enemies[0], () => {
          this.heroAttacking = false;
          this.syncHeroAnimation();
          const enemy = this.enemies[0];
          if (!enemy) {
            if (defeatsEnemy) model.defeatEnemy();
            this.sync();
            onComplete();
            return;
          }
          const name = model.encounter?.name;
          if (!name) {
            onComplete();
            return;
          }
          const character = ENEMY_ASSETS[name];
          this.showImpact(enemy, character.color, damage, defeatsEnemy, () => {
            if (defeatsEnemy) model.defeatEnemy();
            this.sync();
            onComplete();
          });
        });
        playCharacterAttackSound("olan", OLAN_ATTACK_SOUND_DELAY_MS);
      }
      private playOlanAttack(
        target: Phaser.GameObjects.Sprite | undefined,
        onComplete: () => void,
      ) {
        const image = this.olanAttackImage;
        const context = this.olanAttackContext;
        const texture = this.olanAttackTexture;
        if (!image || !context || !texture) {
          throw new Error("Olan's attack animation is not ready.");
        }
        const frames = Object.values(olanAttackAtlas.frames).sort(
          (left, right) => right.frame.x - left.frame.x,
        );
        const idlePosition = { x: this.hero.x, y: this.hero.y };
        const idleCenter = {
          x: idlePosition.x,
          y: idlePosition.y - this.hero.displayHeight / 2,
        };
        let frameIndex = 0;
        const drawFrame = () => {
          const frame = frames[frameIndex].frame;
          context.clearRect(0, 0, frame.w, frame.h);
          context.drawImage(
            image,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            0,
            0,
            frame.w,
            frame.h,
          );
          texture.refresh();
          if (frameIndex === 6 && target?.active) this.playPlayerBeam(target);
        };
        this.hero.anims.stop();
        this.hero
          .setTexture("olan-attack-live")
          .setOrigin(0.5, 0.5)
          .setPosition(
            idleCenter.x + OLAN_ATTACK_PLACEMENT.offsetX,
            idleCenter.y + OLAN_ATTACK_PLACEMENT.offsetY,
          );
        drawFrame();
        if (parent.dataset.heroTexture !== "olan-attack-live")
          parent.dataset.heroTexture = "olan-attack-live";
        this.time.addEvent({
          delay: 1000 / 12,
          repeat: frames.length - 1,
          callback: () => {
            frameIndex++;
            if (frameIndex < frames.length) drawFrame();
          },
        });
        this.time.delayedCall((frames.length * 1000) / 12, () => {
          this.hero
            .setTexture("olan-idle")
            .setOrigin(0.5, 1)
            .setPosition(idlePosition.x, idlePosition.y)
            .play("olan-idle");
          parent.dataset.heroTexture = "olan-idle";
          onComplete();
        });
      }
      private playPlayerBeam(target: Phaser.GameObjects.Sprite) {
        const playerBounds = this.hero.getBounds();
        const startX = playerBounds.left + playerBounds.width * 0.78;
        const endX = target.x - target.displayWidth * 0.28;
        const centerY = playerBounds.centerY;
        const length = Math.max(0, endX - startX);
        if (length === 0) return;
        const beam = this.add.container((startX + endX) / 2, centerY)
          .setDepth(FOREGROUND_DEPTH + 2)
          .setBlendMode(Phaser.BlendModes.ADD);
        const glow = this.add.graphics();
        glow.fillStyle(0x168bff, 0.8).fillRoundedRect(-length / 2, -30, length, 60, 30);
        glow.fillStyle(0x65caff, 0.95).fillRoundedRect(-length / 2, -16, length, 32, 16);
        glow.fillStyle(0xc9f5ff, 1).fillRoundedRect(-length / 2, -8, length, 16, 8);
        glow.fillStyle(0xffffff, 1).fillRoundedRect(-length / 2, -3, length, 6, 3);
        beam.add(glow);
        beam.setScale(1, 0.2).setAlpha(0);
        this.tweens.add({
          targets: beam,
          scaleY: 1.15,
          duration: 87.5,
          yoyo: true,
          repeat: 3,
          ease: "Sine.InOut",
        });
        this.tweens.add({
          targets: beam,
          alpha: 1,
          duration: 350,
          yoyo: true,
          ease: "Sine.InOut",
          onComplete: () => beam.destroy(),
        });
      }
      private flashHannah(enemy: Phaser.GameObjects.Sprite) {
        const width = this.scale.width;
        const height = this.scale.height;
        const centerY = enemy.y - enemy.displayHeight * 0.52;
        const spread = height * 0.34;
        const shift = width * 0.11;
        const flash = this.add.graphics().setDepth(FOREGROUND_DEPTH + 1);
        flash.fillStyle(0x000000, 1).fillRect(0, 0, width, height);
        flash.fillStyle(0xffffff, 1).fillPoints(
          [
            { x: -width, y: centerY - spread - shift },
            { x: -width, y: centerY + spread - shift },
            { x: enemy.x - 8, y: centerY + 12 },
            { x: enemy.x - 8, y: centerY - 12 },
          ],
          true,
        );
        const enemyDepth = enemy.depth;
        const heroDepth = this.hero.depth;
        enemy.setDepth(FOREGROUND_DEPTH + 3).setTintFill(0xffffff);
        this.hero.setDepth(FOREGROUND_DEPTH + 3).setTintFill(0x000000);
        this.time.delayedCall(1000 / 12, () => {
          flash.destroy();
          if (enemy.active) enemy.setDepth(enemyDepth).clearTint();
          if (this.hero.active) this.hero.setDepth(heroDepth).clearTint();
        });
      }
      private emitMathSymbols(enemy: Phaser.GameObjects.Sprite) {
        const symbols = [
          "%", "+", "-", "÷", "×", "π", "sin()", "cos()", "∫", "√",
          "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
          "x", "y", "α", "β", "θ", "λ", "μ", "Ω", "∞", "=",
        ];
        const playerBounds = this.hero.getBounds();
        const originX = enemy.x - enemy.displayWidth * 0.25;
        const originY = enemy.y - enemy.displayHeight * 0.55;
        const targetX = playerBounds.centerX;
        const targetY = playerBounds.centerY;
        const baseAngle = Math.atan2(targetY - originY, targetX - originX);
        for (let count = 0; count < 2; count++) {
          const symbol = symbols[Math.floor(Math.random() * symbols.length)];
          const angle = baseAngle + Phaser.Math.DegToRad(
            Phaser.Math.Between(-30, 30) / 10,
          );
          const distance = Phaser.Math.Distance.Between(
            originX,
            originY,
            targetX,
            targetY,
          );
          const text = this.add.text(
            originX + Phaser.Math.Between(-12, 12),
            originY + Phaser.Math.Between(-24, 24),
            symbol,
            {
              fontFamily: "Arial",
              fontSize: "40px",
              color: "#e7a0ff",
              stroke: "#6815a8",
              strokeThickness: 2,
            },
          )
            .setOrigin(0.5)
            .setDepth(FOREGROUND_DEPTH + 2)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setShadow(0, 0, "#bb43ff", 12, true, true);
          const travel = Math.max(20, distance);
          this.tweens.add({
            targets: text,
            x: text.x + Math.cos(angle) * travel,
            y: text.y + Math.sin(angle) * travel,
            alpha: 0,
            rotation: Phaser.Math.FloatBetween(-0.5, 0.5),
            duration: Phaser.Math.Between(650, 950),
            ease: "Cubic.Out",
            onComplete: () => text.destroy(),
          });
        }
      }
      private playSnargerZap(enemy: Phaser.GameObjects.Sprite, onComplete: () => void) {
        const graphics = this.add.graphics()
          .setDepth(FOREGROUND_DEPTH + 2)
          .setBlendMode(Phaser.BlendModes.ADD);
        const bubble = this.add.graphics()
          .setDepth(FOREGROUND_DEPTH + 1)
          .setBlendMode(Phaser.BlendModes.ADD);
        const heroDepth = this.hero.depth;
        this.hero.setDepth(FOREGROUND_DEPTH + 1.5);
        const startX = enemy.x - enemy.displayWidth * 0.24;
        const startY = enemy.y - enemy.displayHeight * 0.52;
        const endX = this.hero.x + this.hero.displayWidth * 0.22;
        const endY = this.hero.y - this.hero.displayHeight * 0.5;
        let elapsed = 0;
        const drawBolt = () => {
          graphics.clear();
          const points: Phaser.Geom.Point[] = [
            new Phaser.Geom.Point(startX, startY),
          ];
          const segments = 12;
          for (let index = 1; index < segments; index++) {
            const progress = index / segments;
            points.push(new Phaser.Geom.Point(
              Phaser.Math.Linear(startX, endX, progress) +
                Phaser.Math.Between(-13, 13),
              Phaser.Math.Linear(startY, endY, progress) +
                Phaser.Math.Between(-15, 15),
            ));
          }
          points.push(new Phaser.Geom.Point(endX, endY));
          graphics.lineStyle(16, 0xffe66b, 0.16).strokePoints(points);
          graphics.lineStyle(8, 0xfff3ad, 0.48).strokePoints(points);
          graphics.lineStyle(3, 0xffffff, 1).strokePoints(points);
        };
        drawBolt();
        this.time.addEvent({
          delay: 45,
          repeat: 10,
          callback: () => {
            elapsed += 45;
            drawBolt();
            if (elapsed >= 270) {
              bubble.clear();
              bubble.fillStyle(0xfff5a6, 0.2)
                .fillCircle(this.hero.x, endY, this.hero.displayWidth * 0.6);
              bubble.lineStyle(5, 0xfff08a, 0.9)
                .strokeCircle(this.hero.x, endY, this.hero.displayWidth * 0.6);
              bubble.lineStyle(2, 0xffffff, 1)
                .strokeCircle(this.hero.x, endY, this.hero.displayWidth * 0.48);
              this.hero.setTintFill(0xffffc2);
            }
          },
        });
        this.time.delayedCall(500, () => {
          graphics.destroy();
          bubble.destroy();
          if (this.hero.active) this.hero.setDepth(heroDepth).clearTint();
          onComplete();
        });
      }
      private attackEnemy(damage: number, onComplete: () => void) {
        const enemy = this.enemies[0];
        const name = model.encounter?.name as keyof typeof ENEMY_ASSETS | undefined;
        if (!enemy || !name) {
          onComplete();
          return;
        }
        const character = ENEMY_ASSETS[name];
        const strike = () => {
          if (enemy.active) enemy.play(character.idle);
          this.showImpact(this.hero, DAMAGE_COLORS.olan, damage, false, onComplete);
        };
        if (name === "Snarger") {
          this.playSnargerZap(enemy, strike);
        } else if (character.attack) {
          const onAnimationUpdate = (
            _animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame,
          ) => {
            if (name === "Hannah") {
              const frames = Object.keys(hannahAttackAtlas.frames).sort();
              if (frame.textureFrame === frames[7]) this.flashHannah(enemy);
            } else if (name === "Nerdius") {
              this.emitMathSymbols(enemy);
            }
          };
          enemy.on("animationupdate", onAnimationUpdate);
          enemy.once("animationcomplete", () => {
            enemy.off("animationupdate", onAnimationUpdate);
            strike();
          });
          enemy.play(character.attack);
          if (name === "Hannah") playCharacterAttackSound("hannah");
        } else {
          this.tweens.add({
            targets: enemy,
            x: enemy.x - 16,
            duration: 130,
            yoyo: true,
            onComplete: strike,
          });
        }
      }
      private showImpact(
        target: Phaser.GameObjects.Sprite,
        color: number,
        damage: number,
        defeated: boolean,
        onComplete: () => void,
      ) {
        const x = target.x;
        const y = target.y;
        const scaleX = target.scaleX;
        const scaleY = target.scaleY;
        const knockback = target === this.hero ? -14 : 14;
        target.setTintFill(0xffffff);
        const particles = this.add.particles(x, y - target.displayHeight * 0.55, "impact-dot", {
          speed: { min: 60, max: 150 },
          angle: { min: 205, max: 335 },
          lifespan: 480,
          gravityY: 150,
          quantity: 20,
          tint: color,
          blendMode: Phaser.BlendModes.ADD,
          scale: { start: 1.4, end: 0 },
        }).setDepth(FOREGROUND_DEPTH + 2);
        particles.explode(16);
        this.time.delayedCall(550, () => particles.destroy());
        const label = this.add
          .text(x, y - target.displayHeight * 0.78, `-${damage}`, {
            fontFamily: "JasonHandwriting3",
            fontSize: "50px",
            fontStyle: "bold",
            color: "#fff8df",
            stroke: "#342318",
            strokeThickness: 4,
          })
          .setOrigin(0.5, 1)
          .setDepth(FOREGROUND_DEPTH + 1);
        this.tweens.add({
          targets: label,
          y: label.y - 35,
          alpha: 0,
          duration: 620,
          ease: "Cubic.Out",
          onComplete: () => label.destroy(),
        });
        this.tweens.add({
          targets: target,
          x: x + knockback,
          scaleX: scaleX * 1.14,
          scaleY: scaleY * 0.84,
          duration: 110,
          yoyo: true,
          onStart: () => {
            playDamageHitSound();
          },
          onComplete: () => {
            if (target.active) target.clearTint();
            if (defeated) {
              this.cameras.main.shake(200, 0.008);
              playImpactThudSound();
            }
            onComplete();
          },
        });
      }
      private syncHeroAnimation() {
        if (!this.hero || this.heroAttacking) return;
        const isWalking =
          active &&
          !model.paused &&
          model.state === GameState.walking &&
          !document.hidden &&
          !motion.current;
        const animation = isWalking ? "scholar-walk" : "olan-idle";
        if (this.hero.anims.currentAnim?.key !== animation)
          this.hero.play(animation);
        if (!active || model.paused || document.hidden || motion.current)
          this.hero.anims.pause();
        else this.hero.anims.resume();
        this.hero.setScale(OLAN_SPRITE_SCALE);
        parent.dataset.walkFrame = this.hero.frame.name;
      }
      sync() {
        if (!this.hero) return;
        const isWalking =
          active &&
          !model.paused &&
          model.state === GameState.walking &&
          !document.hidden;
        setWalkingSound(isWalking);
        this.syncHeroAnimation();
        if (parent.dataset.heroTexture !== this.hero.texture.key)
          parent.dataset.heroTexture = this.hero.texture.key;
        if (model.enemyDefeated && !this.dropped) {
          this.loot.burst(model.distance);
          playTreasureSound();
          this.dropped = true;
        }
        if (!model.enemyDefeated) this.dropped = false;
        this.updateEnemies();
        parent.dataset.phase = model.state;
        parent.dataset.distance = String(model.distance);
        const revision = model.revision + model.chunks.revision;
        if (lastRevision !== revision) {
          lastRevision = revision;
          onChange();
        }
      }
      update(_time: number, delta: number) {
        if (disposed || !this.hero) return;
        const dt = active && !document.hidden && !model.paused ? Math.min(delta / 1000, WORLD.maxDelta) : 0;
        model.update(dt);
        const scale = this.scale.width / WORLD.width;
        const lootGround = PLAYER_POSITION.y * this.scale.height / scale;
        const loot = this.loot.update(dt, model, motion.current, lootGround);
        parent.dataset.lootCount = String(loot.count);
        parent.dataset.lootPhase = loot.phase;
        this.renderParallax();
        this.sync();
      }
    }
    const scene = new TrailScene("trail");
    const engine = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: parent.clientWidth,
      height: parent.clientHeight,
      backgroundColor: "#d9bd91",
      audio: { noAudio: true },
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      roundPixels: false,
      banner: false,
      scene,
      fps: { target: 60 },
    });
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0 && !disposed) {
        engine.scale.resize(width, height);
        scene.layout();
      }
    });
    resize.observe(parent);
    const lost = (event: Event) => {
      event.preventDefault();
      if (!disposed) onError();
    };
    engine.canvas.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      setWalkingSound(false);
      resize.disconnect();
      engine.canvas.removeEventListener("webglcontextlost", lost);
      engine.destroy(true);
    };
  }, [onReady, onChange, onError]);
  return (
    <div
      className="phaser-host"
      ref={host}
      role="img"
      aria-label="Olan exploring the savannah"
      data-testid="phaser-world"
    />
  );
}
