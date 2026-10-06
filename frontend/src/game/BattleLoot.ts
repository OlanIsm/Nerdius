import Phaser from "phaser";
import type { FantasyGame } from "./FantasyGame";
import { GameState } from "./types";
import { WORLD } from "./level";

// Decorative pieces represent the server's 100 gold / 50 gems per defeated enemy.
export class BattleLoot {
  private pieces: { image: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; color: number; trail: { x: number; y: number }[] }[] = [];
  private trails: Phaser.GameObjects.Graphics;
  private age = 0;
  private walking = 0;
  private origin = 0;
  private collected = 0;

  constructor(private scene: Phaser.Scene) {
    this.trails = scene.add.graphics().setDepth(16);
  }

  burst(distance: number) {
    this.clear();
    this.age = 0;
    this.walking = 0;
    this.origin = distance;
    this.collected = 0;
    for (let i = 0; i < 8; i++) {
      const gem = i % 3 === 0;
      this.pieces.push({
        image: this.scene.add.image(0, 0, gem ? "loot-gem" : "loot-coin").setDepth(18),
        shadow: this.scene.add.ellipse(0, 0, 14, 4, 0x473322, .22).setDepth(12),
        color: gem ? 0xce83ff : 0xffcb43,
        trail: [],
      });
    }
  }

  update(dt: number, model: FantasyGame, reduced: boolean) {
    this.age += dt;
    if (model.state === GameState.walking) this.walking += dt;
    const scale = this.scene.scale.width / WORLD.width;
    const ground = model.playerY - 7;
    const offset = model.distance - this.origin;
    this.trails.clear();
    this.pieces.forEach((piece, i) => {
      if (!piece.image.active) return;
      const landX = 244 + (i - 3.5) * 12 - offset;
      const launch = Math.min(1, Math.max(0, (this.age - i * .035) / .7));
      const pull = Math.min(1, Math.max(0, (this.walking - 1.1 - i * .055) / .65));
      let x = 244 - offset + (landX - (244 - offset)) * launch;
      let y = ground - 44 * (1 - launch) - Math.sin(Math.PI * launch) * (52 + i % 3 * 14);
      if (launch === 1) y -= Math.abs(Math.sin(Math.min(1, (this.age - .95) / .35) * Math.PI)) * 7;
      if (pull > 0) {
        const ease = pull * pull * pull;
        x = landX + (102 - landX) * ease;
        y = ground - 50 * ease - Math.sin(pull * Math.PI) * 28;
      }
      if (reduced) { x = landX; y = ground; }
      if (dt > 0) {
        piece.trail.push({ x, y });
        if (piece.trail.length > 9) piece.trail.shift();
      }
      if (!reduced && (launch < 1 || pull > 0)) {
        for (let n = 1; n < piece.trail.length; n++) {
          const a = piece.trail[n - 1], b = piece.trail[n];
          this.trails.lineStyle((1 + n / 3) * scale, piece.color, n / piece.trail.length * .65)
            .lineBetween(a.x * scale, a.y * scale, b.x * scale, b.y * scale);
        }
      }
      piece.image.setPosition(x * scale, y * scale).setDisplaySize(19 * scale, 19 * scale)
        .setRotation(reduced ? 0 : Math.sin(this.age * 7 + i) * .2)
        .setAlpha(reduced ? 1 - pull : 1);
      piece.shadow.setPosition(landX * scale, (ground + 7) * scale)
        .setDisplaySize(14 * scale, 4 * scale).setAlpha((1 - pull) * .22);
      if (pull === 1) { piece.image.destroy(); piece.shadow.destroy(); this.collected++; }
    });
    return { count: this.pieces.length - this.collected, phase: this.pieces.length === 0 || this.collected === this.pieces.length ? "empty" : this.walking > 1.1 ? "collecting" : this.age < 1 ? "burst" : "ground" };
  }

  private clear() {
    this.pieces.forEach(({ image, shadow }) => { image.destroy(); shadow.destroy(); });
    this.pieces = [];
    this.trails.clear();
  }
}
