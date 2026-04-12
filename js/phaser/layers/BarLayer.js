import { DEPTH } from '../../constants/depths.js';
import { STOOL_SPRITE_W, STOOL_LEG_W, CLOCK_OFFSET_Y } from '../../constants/layout.js';

/**
 * Static background layers derived from BarLayout zones:
 *   wall → guest_area → bar_top → bar_cabinet → floor → counter
 */
export class BarLayer {
  constructor(scene, barLayout) {
    this.scene = scene;
    this._bl = barLayout;
    const bl = barLayout;

    const barCenterX = (bl.barLeft + bl.barRight) / 2;

    // ── Wall ──
    scene.add.tileSprite(0, bl.wall.top, bl.canvasW, bl.wall.height, 'tile_wall')
      .setOrigin(0, 0).setDepth(DEPTH.BACKGROUND);

    // ── Floor (spans bartender area + back counter) ──
    const floorTop = bl.bartenderArea.top;
    const floorH = bl.backCounter.bottom - floorTop;
    scene.add.tileSprite(0, floorTop, bl.canvasW, floorH, 'tile_floor')
      .setOrigin(0, 0).setDepth(DEPTH.BACKGROUND);

    // ── Bar top surface ──
    scene.add.tileSprite(bl.barLeft, bl.barCounter.surfaceTop, bl.barWidth, bl.barCounter.surfaceHeight, 'tile_bar_top')
      .setOrigin(0, 0).setDepth(DEPTH.BAR_SURFACE);

    // ── Bar cabinets (front face) ──
    scene.add.tileSprite(bl.barLeft, bl.barCounter.cabinetTop, bl.barWidth, bl.barCounter.cabinetHeight, 'tile_cabinet')
      .setOrigin(0, 0).setDepth(DEPTH.BAR_SURFACE);

    // ── U-shaped bar legs ──
    const legTop = bl.barSurfaceY;
    const legH = bl.counterSurfaceY - legTop;
    scene.add.tileSprite(bl.barLeft, legTop, STOOL_LEG_W, legH, 'tile_bar_top')
      .setOrigin(0, 0).setDepth(DEPTH.BAR_SURFACE);
    scene.add.tileSprite(bl.barRight - STOOL_LEG_W, legTop, STOOL_LEG_W, legH, 'tile_bar_top')
      .setOrigin(0, 0).setDepth(DEPTH.BAR_SURFACE);

    // ── Stools ──
    this.stools = [];
    for (const seat of bl.seats) {
      const stool = scene.add.image(seat.x, bl.barSurfaceY - 2, 'stool')
        .setOrigin(0.5, 0).setDepth(DEPTH.STOOLS);
      const maxH = bl.barCounter.surfaceBottom - (bl.barSurfaceY - 2);
      stool.setCrop(0, 0, STOOL_SPRITE_W, maxH);
      this.stools.push(stool);
    }

    // ── Wall clock ──
    const clockX = bl.canvasW - 80;
    const clockY = bl.customerArea.top + CLOCK_OFFSET_Y;
    const clockR = 28;
    this.clockGfx = scene.add.graphics().setDepth(DEPTH.BACKGROUND);
    this.clockGfx.fillStyle(0xf5f0e0, 1);
    this.clockGfx.fillCircle(clockX, clockY, clockR);
    this.clockGfx.lineStyle(3, 0x5a3a1a, 1);
    this.clockGfx.strokeCircle(clockX, clockY, clockR);
    for (let h = 0; h < 12; h++) {
      const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
      this.clockGfx.lineStyle(1.5, 0x3a2a1a, 1);
      this.clockGfx.lineBetween(
        clockX + Math.cos(angle) * (clockR - 5), clockY + Math.sin(angle) * (clockR - 5),
        clockX + Math.cos(angle) * (clockR - 2), clockY + Math.sin(angle) * (clockR - 2),
      );
    }
    this.clockHandsGfx = scene.add.graphics().setDepth(DEPTH.BACKGROUND);
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
    const bl = this._bl;
    this.stools.forEach(s => s.destroy());
    this.stools = [];
    for (const seat of seats) {
      const stool = this.scene.add.image(seat.x, bl.barSurfaceY - 2, 'stool')
        .setOrigin(0.5, 0).setDepth(DEPTH.STOOLS);
      const maxH = bl.barCounter.surfaceBottom - (bl.barSurfaceY - 2);
      stool.setCrop(0, 0, STOOL_SPRITE_W, maxH);
      this.stools.push(stool);
    }
  }

  destroy() {
    this.stools.forEach(s => s.destroy());
    if (this.clockGfx) this.clockGfx.destroy();
    if (this.clockHandsGfx) this.clockHandsGfx.destroy();
  }
}
