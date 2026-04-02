import {
  CANVAS_W, CANVAS_H, BAR_TOP_Y, WALK_TRACK_Y, SEAT_Y, STATION_Y,
} from '../../constants.js';

/**
 * Static background: wall, floor, bar top surface, walk track.
 * Created once, never updated.
 */
export class BarLayer {
  constructor(scene, seats) {
    this.scene = scene;

    // Wall
    scene.add.rectangle(CANVAS_W / 2, 18, CANVAS_W, 36, 0x252540).setDepth(0);

    // Floor
    const floorH = CANVAS_H - BAR_TOP_Y;
    scene.add.rectangle(CANVAS_W / 2, BAR_TOP_Y + floorH / 2, CANVAS_W, floorH, 0x2d1b0e).setDepth(0);

    // Walk track shadow
    scene.add.rectangle(CANVAS_W / 2, WALK_TRACK_Y, 900, 30, 0x3c3228, 0.3).setDepth(0);

    // Bar top surface (tiled) — depth 6: in front of guests (depth 5)
    const barY = BAR_TOP_Y + 4;
    for (let x = 20; x < CANVAS_W; x += 192) {
      scene.add.image(x, barY, 'bar_top').setOrigin(0, 0).setDepth(6);
    }

    // Bar front edge — depth 6
    scene.add.rectangle(CANVAS_W / 2, BAR_TOP_Y + 26, 920, 10, 0x6b3410).setDepth(6);

    // Stools — depth 4: positioned at bar surface so cushion peeks out
    // Bar surface tiles start at barSurfaceY = BAR_TOP_Y + 4
    // Guest bottom is at barSurfaceY, stool top is 2px above that
    const barSurfaceY = BAR_TOP_Y + 4;
    this.stools = [];
    for (const seat of seats) {
      const stool = scene.add.image(seat.x, barSurfaceY - 2, 'stool').setOrigin(0.5, 0).setDepth(4);
      // Crop so nothing extends past bar front edge bottom
      const maxH = (BAR_TOP_Y + 30) - (barSurfaceY - 2);
      stool.setCrop(0, 0, 48, maxH);
      this.stools.push(stool);
    }

    // Wall clock (right side of bar, on the wall behind guests)
    const clockX = CANVAS_W - 80;
    const clockY = 150;
    const clockR = 28;
    this.clockGfx = scene.add.graphics().setDepth(0);
    // Clock face
    this.clockGfx.fillStyle(0xf5f0e0, 1);
    this.clockGfx.fillCircle(clockX, clockY, clockR);
    this.clockGfx.lineStyle(3, 0x5a3a1a, 1);
    this.clockGfx.strokeCircle(clockX, clockY, clockR);
    // Hour markers
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

    // Clock hands (drawn each frame)
    this.clockHandsGfx = scene.add.graphics().setDepth(0);
    this._clockX = clockX;
    this._clockY = clockY;
    this._clockR = clockR;
  }

  /** Update clock hands based on game time */
  updateClock(levelTimer, levelDuration) {
    const gfx = this.clockHandsGfx;
    gfx.clear();
    const cx = this._clockX;
    const cy = this._clockY;

    // Map levelTimer to clock: 6:00 PM → 12:00 AM (6 hours)
    const progress = Math.min(1, levelTimer / levelDuration);
    const totalMinutes = Math.floor(progress * 360); // 6h = 360 min
    const hour24 = 18 + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    // Hour hand (12-hour mapped)
    const hour12 = hour24 % 12;
    const hourAngle = ((hour12 + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    gfx.lineStyle(2.5, 0x1a1a1a, 1);
    gfx.lineBetween(cx, cy, cx + Math.cos(hourAngle) * 14, cy + Math.sin(hourAngle) * 14);

    // Minute hand
    const minAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    gfx.lineStyle(1.5, 0x1a1a1a, 1);
    gfx.lineBetween(cx, cy, cx + Math.cos(minAngle) * 20, cy + Math.sin(minAngle) * 20);

    // Center dot
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(cx, cy, 2);
  }

  /** Rebuild stools when seat count changes */
  rebuildStools(seats) {
    this.stools.forEach(s => s.destroy());
    this.stools = [];
    const barSurfaceY = BAR_TOP_Y + 4;
    for (const seat of seats) {
      const stool = this.scene.add.image(seat.x, barSurfaceY - 2, 'stool').setOrigin(0.5, 0).setDepth(4);
      const maxH = (BAR_TOP_Y + 30) - (barSurfaceY - 2);
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
