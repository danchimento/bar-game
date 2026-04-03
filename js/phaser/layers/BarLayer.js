import {
  CANVAS_W, ZONES, BAR_SURFACE_Y, BAR_FRONT_Y, BAR_MAX_W,
  BAR_LEFT, BAR_RIGHT, BAR_CABINET_TOP, BAR_CABINET_BOTTOM,
  COUNTER_SURFACE_Y,
} from '../../constants.js';

/**
 * Static background layers derived from ZONES:
 *   wall → guest_area → bar_top → bar_cabinet → floor → counter
 */
export class BarLayer {
  constructor(scene, seats) {
    this.scene = scene;
    const barCenterX = (BAR_LEFT + BAR_RIGHT) / 2;

    // ── Wall — tiled brick texture ──
    const wall = ZONES.wall;
    scene.add.tileSprite(0, wall.top, CANVAS_W, wall.height, 'tile_wall')
      .setOrigin(0, 0).setDepth(0);

    // ── Floor — tiled hardwood, spans floor + counter zones ──
    const floorTop = ZONES.floor.top;
    const floorH = ZONES.counter.bottom - floorTop;
    scene.add.tileSprite(0, floorTop, CANVAS_W, floorH, 'tile_floor')
      .setOrigin(0, 0).setDepth(0);

    // ── Bar top surface — tiled polished wood ──
    const barTopH = BAR_FRONT_Y - BAR_SURFACE_Y + 5;
    scene.add.tileSprite(barCenterX - BAR_MAX_W / 2, BAR_SURFACE_Y, BAR_MAX_W, barTopH, 'tile_bar_top')
      .setOrigin(0, 0).setDepth(6);

    // ── Bar cabinets — tiled dark wood panel ──
    const cabinetH = BAR_CABINET_BOTTOM - BAR_CABINET_TOP;
    scene.add.tileSprite(barCenterX - BAR_MAX_W / 2, BAR_CABINET_TOP, BAR_MAX_W, cabinetH, 'tile_cabinet')
      .setOrigin(0, 0).setDepth(6);

    // ── U-shaped bar legs — counter tile extends down from bar edges ──
    const legWidth = 72;
    const legTop = BAR_SURFACE_Y;
    const legH = COUNTER_SURFACE_Y - legTop;
    // Left leg
    scene.add.tileSprite(BAR_LEFT, legTop, legWidth, legH, 'tile_bar_top')
      .setOrigin(0, 0).setDepth(6);
    // Right leg
    scene.add.tileSprite(BAR_RIGHT - legWidth, legTop, legWidth, legH, 'tile_bar_top')
      .setOrigin(0, 0).setDepth(6);

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
    const clockY = ZONES.guest_area.top + 80;
    const clockR = 28;
    this.clockGfx = scene.add.graphics().setDepth(0);
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
