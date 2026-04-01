import {
  CANVAS_W, CANVAS_H, BAR_TOP_Y, WALK_TRACK_Y, SEAT_Y,
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

    // Bar top surface (tiled)
    const barY = BAR_TOP_Y + 4;
    for (let x = 20; x < CANVAS_W; x += 192) {
      scene.add.image(x, barY, 'bar_top').setOrigin(0, 0).setDepth(1);
    }

    // Bar front edge
    scene.add.rectangle(CANVAS_W / 2, BAR_TOP_Y + 26, 920, 10, 0x6b3410).setDepth(1);

    // Stools at seat positions
    this.stools = [];
    for (const seat of seats) {
      const stool = scene.add.image(seat.x, SEAT_Y + 10, 'stool').setDepth(1);
      this.stools.push(stool);
    }
  }

  /** Rebuild stools when seat count changes */
  rebuildStools(seats) {
    this.stools.forEach(s => s.destroy());
    this.stools = [];
    for (const seat of seats) {
      const stool = this.scene.add.image(seat.x, SEAT_Y + 10, 'stool').setDepth(1);
      this.stools.push(stool);
    }
  }

  destroy() {
    this.stools.forEach(s => s.destroy());
  }
}
