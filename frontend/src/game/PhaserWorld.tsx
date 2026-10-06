import { useEffect, useRef } from "react";
import Phaser from "phaser";
import atlas from "../../assets/character/mc-walk/spritesheet.json";
import { FantasyGame } from "./FantasyGame";
import { GameState } from "./types";
import { WORLD } from "./level";

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
      preload() {
        this.load.on("loaderror", () => {
          if (!disposed) onError();
        });
        this.load.atlas("scholar", walkTexture, atlas);
        this.load.image("scholar-idle", idleTexture);
        this.load.image("soda", enemyTexture);
        layers.forEach((layer) => this.load.image(layer.name, layer.url));
      }
      create() {
        if (disposed) return;
        if (
          !this.textures.exists("scholar") ||
          !this.textures.exists("scholar-idle") ||
          !this.textures.exists("soda") ||
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
          .ellipse(0, 0, 80, 5, 0x443423, 0.24)
          .setDepth(12);
        this.hero = this.add
          .sprite(0, 0, "scholar-idle")
          .setOrigin(0.5, 1)
          .setDepth(13);
        const reportFrame = () => {
          parent.dataset.walkFrame = this.hero.frame.name;
          parent.dataset.distance = String(model.distance);
        };
        this.hero.on("animationupdate", reportFrame);
        this.hero.on("animationstart", reportFrame);
        this.guides = this.add.graphics().setDepth(15);
        parent.dataset.layers = JSON.stringify(
          layers.map((layer) => layer.url),
        );
        parent.dataset.renderer =
          this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas";
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
        const tileWidth = (height * 3973) / 3000;
        const imageTop = model.playerY * scale - (height * 657) / 844;
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
            image.setDisplaySize(tileWidth, height).setY(imageTop),
          );
        });
        this.hero
          .setPosition(102 * scale, model.playerY * scale)
          .setDisplaySize(Math.min(116 * scale, height * 0.32), Math.min(116 * scale, height * 0.32));
        this.heroShadow
          .setPosition(102 * scale, model.playerY * scale - 3 * scale)
          .setDisplaySize(80 * scale, 5 * scale);
        this.updateEnemies(true);
        this.renderParallax();
      }
      private renderParallax() {
        const scale = this.scale.width / WORLD.width;
        const tileWidth = (this.scale.height * 3973) / 3000;
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
          encounter && model.state !== GameState.encounterStarting;
        const key = visible ? `${encounter.count}:${encounter.boss}` : "";
        if (key !== this.encounterKey || force) {
          this.encounterKey = key;
          this.enemies.forEach((enemy) => enemy.destroy());
          this.shadows.forEach((shadow) => shadow.destroy());
          this.enemies = [];
          this.shadows = [];
          if (visible) {
            const scale = this.scale.width / WORLD.width;
            const size = Math.min((encounter.boss ? 168 : 108) * scale, this.scale.height * 0.34);
            const x = 244 * scale;
            this.shadows.push(
              this.add
                .ellipse(
                  x,
                  model.playerY * scale - 3 * scale,
                  size * 0.7,
                  size * 0.04,
                  0x443423,
                  0.24,
                )
                .setDepth(12),
            );
            this.enemies.push(
              this.add
                .image(x, model.playerY * scale, "soda")
                .setOrigin(0.5, 1)
                .setDisplaySize(size, size)
                .setDepth(14),
            );
          }
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
            const size = Math.min(116 * (this.scale.width / WORLD.width), this.scale.height * 0.32);
            this.hero.setDisplaySize(size, size);
            parent.dataset.walkFrame = this.hero.frame.name;
          }
        } else if (walking) {
          if (this.hero.texture.key !== "scholar") {
            this.hero.play("scholar-walk");
            const size = Math.min(116 * (this.scale.width / WORLD.width), this.scale.height * 0.32);
            this.hero.setDisplaySize(size, size);
          } else this.hero.anims.resume();
        } else this.hero.anims.pause();
        if (parent.dataset.heroTexture !== this.hero.texture.key)
          parent.dataset.heroTexture = this.hero.texture.key;
        this.updateEnemies();
        const revision = model.revision + model.chunks.revision;
        if (lastRevision !== revision) {
          lastRevision = revision;
          onChange();
        }
      }
      update(_time: number, delta: number) {
        if (disposed || !this.hero) return;
        if (active && !document.hidden) model.update(delta / 1000);
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
