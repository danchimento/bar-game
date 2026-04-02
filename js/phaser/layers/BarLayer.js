import {
  CANVAS_W, CANVAS_H, BAR_SURFACE_Y, BAR_FRONT_Y, BAR_MAX_W,
  BAR_LEFT, BAR_RIGHT, BAR_CABINET_TOP, BAR_CABINET_BOTTOM, FLOOR_Y,
} from '../../constants.js';

/**
 * Static background layers (top to bottom):
 *   Wall → Guest area → Bar top → Bar cabinets → Floor
 * The bar has a max width and is centered. The floor extends behind everything.
 */
export class BarLayer {
  constructor(scene, seats) {
    this.scene = scene;

    const barCenterX = (BAR_LEFT + BAR_RIGHT) / 2;

    // ── Wall ──
    scene.add.rectangle(CANVAS_W / 2, 18, CANVAS_W, 36, 0x252540).setDepth(0);

    // ── Floor — full width, from cabinet bottom to screen bottom ──
    const floorH = CANVAS_H - FLOOR_Y;
    scene.add.rectangle(CANVAS_W / 2, FLOOR_Y + floorH / 2, CANVAS_W, floorH, 0x3d2b1b)
      .setDepth(0);

    // ── Bar top surface — centered, max width ──
    const barTopH = BAR_FRONT_Y - BAR_SURFACE_Y + 5;
    scene.add.rectangle(barCenterX, BAR_SURFACE_Y + barTopH / 2, BAR_MAX_W, barTopH, 0x8B4513)
      .setDepth(6);

    // ── Bar cabinets — enclosed area below the bar top ──
    const cabinetH = BAR_CABINET_BOTTOM - BAR_CABINET_TOP;
    // Cabinet face (dark wood)
    scene.add.rectangle(barCenterX, BAR_CABINET_TOP + cabinetH / 2, BAR_MAX_W, cabinetH, 0x2a1a0e)
      .setDepth(6);
    // Cabinet top edge (lighter trim)
    scene.add.rectangle(barCenterX, BAR_CABINET_TOP, BAR_MAX_W, 2, 0x4d3a28)
      .setDepth(6);
    // Cabinet bottom edge
    scene.add.rectangle(barCenterX, BAR_CABINET_BOTTOM, BAR_MAX_W, 2, 0x1a0e06)
      .setDepth(6);

    // ── Stools ──
    this.stools = [];
    for (const seat of seats) {
      const stool = scene.add.image(seat.x, BAR_SURFACE_Y - 2, 'stool').setOrigin(0.5, 0).setDepth(4);
      const maxH = (BAR_FRONT_Y + 5) - (BAR_SURFACE_Y - 2);
      stool.setCrop(0, 0, 48, maxH);
      this.stools.push(stool);
    }

    // ── Wall clock ──
    const clockX = CANVAS_W - 80;
    const clockY = 150;
    const clockR = 28;
    this.clockGfx = scene.add.graphics().setDepth(0);
    this.clockGfx.fillStyle(0xf5f0e0, 1);
    this.clockGfx.fillCircle(clockX, clockY, clockR);
    this.clockGfx.lineStyle(3, 0x5a3a1a, 1);
    this.clockGfx.strokeCircle(clockX, clockY, clockR);
    for (let h = 0; h < 12; h++) {
      const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const inner = clockR - 5;
      const outer = clockR - 2;
      this.clockGfx.lineStyle(1.5, 0x3a2a1a, 1);
      this.clockGfx.lineBetween(
        clockX + Math.cos(angle) * inner, clockY + Math.sin(angle) * inner,
        clockX + Math.cos(angle) * outer, clockY + Math.sin(angle) * outer,
      );
    }
    this.clockHandsGfx = scene.add.graphics().setDepth(0);
    this._clockX = clockX;
    this._clockY = clockY;
    this._clockR = clockR;
  }

  updateClock(levelTimer, levelDuration) {
    const gfx = this.clockHandsGfx;
    gfx.clear();
    const cx = this._clockX;
    const cy = this._clockY;
    const progress = Math.min(1, levelTimer / levelDuration);
    const totalMinutes = Math.floor(progress * 360);
    const hour24 = 18 + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const hour12 = hour24 % 12;
    const hourAngle = ((hour12 + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    gfx.lineStyle(2.5, 0x1a1a1a, 1);
    gfx.lineBetween(cx, cy, cx + Math.cos(hourAngle) * 14, cy + Math.sin(hourAngle) * 14);
    const minAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    gfx.lineStyle(1.5, 0x1a1a1a, 1);
    gfx.lineBetween(cx, cy, cx + Math.cos(minAngle) * 20, cy + Math.sin(minAngle) * 20);
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(cx, cy, 2);
  }

  rebuildStools(seats) {
    this.stools.forEach(s => s.destroy());
    this.stools = [];
    for (const seat of seats) {
      const stool = this.scene.add.image(seat.x, BAR_SURFACE_Y - 2, 'stool').setOrigin(0.5, 0).setDepth(4);
      const maxH = (BAR_FRONT_Y + 5) - (BAR_SURFACE_Y - 2);
      stool.setCrop(0, 0, 48, maxH);
      this.stools.push(stool);
    }
  }

  destroy() {
    this.stools.forEach(s => s.destroy());
    if (this.clockGfx) this.clockGfx.destroy();
    if (this.clockHandsGfx) this.clockHandsGfx.destroy();
  }
}
