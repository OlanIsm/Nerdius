import { useEffect, useRef } from "react";
import Phaser from "phaser";
import atlas from "../../assets/character/mc-walk/spritesheet.json";
import { FantasyGame } from "./FantasyGame";
import { GameState } from "./types";
import { WORLD } from "./level";
import { icons } from "../assets";
import { BattleLoot } from "./BattleLoot";

const walkTexture = new URL(
  "../../assets/character/mc-walk/spritesheet.png",
  import.meta.url,
).href;
const enemyTexture = new URL(
  "../../assets/character/soda-cutout.png",
  import.meta.url,
).href;
const idleTexture = new URL(
  "../../assets/optimized/scholar.webp",
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
    speed: 0.28,
  },
  {
    name: "savannah-8",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/8.webp",
      import.meta.url,
    ).href,
    speed: 0.38,
  },
  {
    name: "savannah-9",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/9.webp",
      import.meta.url,
    ).href,
    speed: 0.5,
  },
  {
    name: "savannah-10",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/10.webp",
      import.meta.url,
    ).href,
    speed: 0.72,
  },
  {
    name: "savannah-11",
    url: new URL(
      "../../assets/savannah parallax/Savannah Parallax/compressed/11.webp",
      import.meta.url,
    ).href,
    speed: 1,
  },
] as const;
const ACTOR_SIZE = (1.5 / 2.54) * 96;
const PLAYER_POSITION = { x: 102, y: 0 };
const ENEMY_POSITION = { x: 244, y: 0 };
const ACTOR_DEPTH = layers.length - 1.5;
const FOREGROUND_DEPTH = layers.length - 1;
const BACKGROUND_HEIGHT = 480;
const BACKGROUND_WIDTH = (BACKGROUND_HEIGHT * 3973) / 3000;
const BACKGROUND_BASELINE = 657 / 844;
export type WorldControls = {
  model: FantasyGame;
  act: (action: () => void) => void;
  setActive: (active: boolean) => void;
  setDebug: (bounds: boolean, triggers: boolean) => void;
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
    let bounds = false;
    let triggers = false;
    let lastRevision = -1;
    const model = new FantasyGame(
      parent.clientHeight / (parent.clientWidth / WORLD.width),
    );
    class TrailScene extends Phaser.Scene {
      private hero!: Phaser.GameObjects.Sprite;
      private scenery: Phaser.GameObjects.Image[][] = [];
      private enemies: Phaser.GameObjects.Image[] = [];
      private shadows: Phaser.GameObjects.Ellipse[] = [];
      private heroShadow!: Phaser.GameObjects.Ellipse;
      private guides!: Phaser.GameObjects.Graphics;
      private encounterKey = "";
      private loot!: BattleLoot;
      private dropped = false;
      preload() {
        this.load.on("loaderror", () => {
          if (!disposed) onError();
        });
        this.load.atlas("scholar", walkTexture, atlas);
        this.load.image("scholar-idle", idleTexture);
        this.load.image("soda", enemyTexture);
        this.load.image("loot-coin", icons.coins);
        this.load.image("loot-gem", icons.gems);
        layers.forEach((layer) => this.load.image(layer.name, layer.url));
      }
      create() {
        if (disposed) return;
        if (
          !this.textures.exists("scholar") ||
          !this.textures.exists("scholar-idle") ||
          !this.textures.exists("soda") ||
          !this.textures.exists("loot-coin") ||
          !this.textures.exists("loot-gem") ||
          layers.some((layer) => !this.textures.exists(layer.name))
        ) {
          onError();
          return;
        }
        const frames = Object.keys(atlas.frames)
          .sort()
          .map((frame) => ({ key: "scholar", frame }));
        this.anims.create({
          key: "scholar-walk",
          frames,
          frameRate: 12,
          repeat: -1,
        });
        this.scenery = layers.map(() => []);
        this.heroShadow = this.add
          .ellipse(0, 0, ACTOR_SIZE * 0.75, 4, 0x443423, 0.24)
          .setDepth(ACTOR_DEPTH);
        this.hero = this.add
          .sprite(0, 0, "scholar-idle")
          .setOrigin(0.5, 1)
          .setDepth(ACTOR_DEPTH);
        const reportFrame = () => {
          parent.dataset.walkFrame = this.hero.frame.name;
          parent.dataset.distance = String(model.distance);
        };
        this.hero.on("animationupdate", reportFrame);
        this.hero.on("animationstart", reportFrame);
        this.guides = this.add.graphics().setDepth(15);
        this.loot = new BattleLoot(this);
        parent.dataset.layers = JSON.stringify(
          layers.map((layer) => layer.url),
        );
        parent.dataset.renderer =
          this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas";
        parent.dataset.actorSize = String(ACTOR_SIZE);
        parent.dataset.actorDepth = String(ACTOR_DEPTH);
        parent.dataset.foregroundDepth = String(FOREGROUND_DEPTH);
        parent.dataset.playerPosition = JSON.stringify(PLAYER_POSITION);
        parent.dataset.backgroundSize = JSON.stringify({
          width: BACKGROUND_WIDTH,
          height: BACKGROUND_HEIGHT,
        });
        parent.dataset.walkFrame = this.hero.frame.name;
        this.layout();
        this.sync();
        onReady({
          model,
          act: (action) => {
            action();
            this.sync();
          },
          setActive: (value) => {
            active = value;
            this.sync();
          },
          setDebug: (showBounds, showTriggers) => {
            bounds = showBounds;
            triggers = showTriggers;
            this.drawGuides();
          },
        });
      }
      layout() {
        if (!this.hero) return;
        const { width, height } = this.scale;
        const scale = width / WORLD.width;
        const logicalHeight = height / scale;
        if (model.chunks.viewportHeight !== logicalHeight)
          model.resize(logicalHeight);
        const tileWidth = BACKGROUND_WIDTH * scale;
        const tileHeight = BACKGROUND_HEIGHT * scale;
        const imageTop = model.playerY * scale - tileHeight * BACKGROUND_BASELINE;
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
            (model.playerY + PLAYER_POSITION.y) * scale,
          )
          .setDisplaySize(ACTOR_SIZE, ACTOR_SIZE);
        this.heroShadow
          .setPosition(
            PLAYER_POSITION.x * scale,
            (model.playerY + PLAYER_POSITION.y) * scale - 3,
          )
          .setDisplaySize(ACTOR_SIZE * 0.75, 4);
        this.updateEnemies(true);
        this.renderParallax();
      }
      private renderParallax() {
        const scale = this.scale.width / WORLD.width;
        const tileWidth = BACKGROUND_WIDTH * scale;
        this.scenery.forEach((images, index) => {
          const offset =
            (model.distance * scale * layers[index].speed) % tileWidth;
          images.forEach((image, copy) =>
            image.setX(copy * tileWidth - offset),
          );
        });
      }
      private updateEnemies(force = false) {
        const encounter = model.encounter;
        const visible =
          encounter && !model.enemyDefeated && (model.state === GameState.encounter || model.state === GameState.bossEncounter);
        const key = visible ? `${encounter.count}:${encounter.boss}` : "";
        if (key !== this.encounterKey || force) {
          this.encounterKey = key;
          this.enemies.forEach((enemy) => enemy.destroy());
          this.shadows.forEach((shadow) => shadow.destroy());
          this.enemies = [];
          this.shadows = [];
          if (visible) {
            const scale = this.scale.width / WORLD.width;
            const x = ENEMY_POSITION.x * scale;
            const y = (model.playerY + ENEMY_POSITION.y) * scale;
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
            this.enemies.push(
              this.add
                .image(x, y, "soda")
                .setOrigin(0.5, 1)
                .setDisplaySize(ACTOR_SIZE, ACTOR_SIZE)
                .setDepth(ACTOR_DEPTH),
            );
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
      private drawGuides() {
        this.guides.clear();
        if (!bounds && !triggers) return;
        const scale = this.scale.width / WORLD.width;
        model.chunks.pool.forEach((chunk) => {
          const left = (102 + model.playerY - chunk.y - chunk.height) * scale;
          if (bounds)
            this.guides
              .lineStyle(2, 0xf7f1b0)
              .strokeRect(left, 0, chunk.height * scale, this.scale.height);
          if (triggers && chunk.definition.triggerY !== undefined) {
            const x = left + (chunk.height - chunk.definition.triggerY) * scale;
            this.guides
              .lineStyle(2, 0xc43c61)
              .lineBetween(x, 0, x, this.scale.height);
          }
        });
      }
      sync() {
        if (!this.hero) return;
        const walking =
          active &&
          !model.paused &&
          model.state === GameState.walking &&
          !document.hidden &&
          !motion.current;
        if (model.state !== GameState.walking) {
          if (this.hero.texture.key !== "scholar-idle") {
            this.hero.stop().setTexture("scholar-idle");
            this.hero.setDisplaySize(ACTOR_SIZE, ACTOR_SIZE);
            parent.dataset.walkFrame = this.hero.frame.name;
          }
        } else if (walking) {
          if (this.hero.texture.key !== "scholar") {
            this.hero.play("scholar-walk");
            this.hero.setDisplaySize(ACTOR_SIZE, ACTOR_SIZE);
          } else this.hero.anims.resume();
        } else this.hero.anims.pause();
        if (parent.dataset.heroTexture !== this.hero.texture.key)
          parent.dataset.heroTexture = this.hero.texture.key;
        if (model.enemyDefeated && !this.dropped) { this.loot.burst(model.distance); this.dropped = true; }
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
        const loot = this.loot.update(dt, model, motion.current);
        parent.dataset.lootCount = String(loot.count);
        parent.dataset.lootPhase = loot.phase;
        this.renderParallax();
        this.drawGuides();
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
      aria-label="Nerd Mage exploring the forest"
      data-testid="phaser-world"
    />
  );
}
