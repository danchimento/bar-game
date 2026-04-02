import { CANVAS_W, CANVAS_H, STATION_Y } from '../../constants.js';

/**
 * Back counter with station sprites. Built as a wooden counter:
 * - Counter surface (tiled back_counter sprite)
 * - Front lip/edge
 * - Cabinet base extending to screen bottom
 * - Stations sitting ON the counter at reduced scale
 * Emits 'station-tap' and 'station-longpress' events on the scene.
 */
export class StationLayer {
  constructor(scene, stations) {
    this.scene = scene;
    this.stationObjects = [];
    this.counterObjects = [];
    this.build(stations);
  }

  build(stations) {
    this.destroy();
    const scene = this.scene;

    // Counter geometry — anchored to bottom of screen
    const counterLeft = 10;
    const counterRight = CANVAS_W - 10;
    const counterW = counterRight - counterLeft;
    const surfaceY = STATION_Y - 16;        // top of counter surface
    const surfaceH = 16;                      // back_counter tile height (at 3x scale)
    const lipY = surfaceY + surfaceH;         // front edge below surface
    const lipH = 4;
    const cabinetTop = lipY + lipH;
    const cabinetH = CANVAS_H - cabinetTop;  // extends to screen bottom

    // Cabinet base — dark wood panel from lip to screen bottom
    const cabinet = scene.add.rectangle(
      counterLeft + counterW / 2, cabinetTop + cabinetH / 2,
      counterW, cabinetH, 0x2a1a0e
    ).setDepth(15);
    this.counterObjects.push(cabinet);

    // Cabinet face detail — subtle vertical slats
    const slatColor = 0x33220f;
    for (let x = counterLeft + 40; x < counterRight - 20; x += 80) {
      const slat = scene.add.rectangle(x, cabinetTop + cabinetH / 2, 2, cabinetH - 4, slatColor, 0.4)
        .setDepth(15);
      this.counterObjects.push(slat);
    }

    // Counter surface — tiled back_counter sprite
    for (let x = counterLeft; x < counterRight; x += 192) {
      const tile = scene.add.image(x, surfaceY, 'back_counter')
        .setOrigin(0, 0).setDepth(15);
      this.counterObjects.push(tile);
    }

    // Front lip / edge — slightly lighter wood strip
    const lip = scene.add.rectangle(
      counterLeft + counterW / 2, lipY + lipH / 2,
      counterW, lipH, 0x4d3a28
    ).setDepth(15);
    this.counterObjects.push(lip);

    // Station sprites — depth 16, sitting ON the counter, no labels
    const stationBottomY = surfaceY;
    for (const st of stations) {
      const spriteKey = this._spriteKey(st.id);
      const sprite = spriteKey
        ? scene.add.image(st.x, stationBottomY, spriteKey)
            .setOrigin(0.5, 1).setScale(0.6).setDepth(16)
        : scene.add.rectangle(st.x, stationBottomY - 15, st.width || 30, 30, 0x4a3728).setDepth(16);

      // Interactive zone covers station area
      const zone = scene.add.zone(st.x, STATION_Y, (st.width || 50) + 10, 70)
        .setInteractive({ useHandCursor: true })
        .setDepth(17);

      // Tap
      let longPressTimer = null;
      zone.on('pointerdown', () => {
        zone._tapPending = true;
        longPressTimer = scene.time.delayedCall(250, () => {
          zone._tapPending = false;
          scene.events.emit('station-longpress', st);
        });
      });
      zone.on('pointerup', () => {
        if (longPressTimer) longPressTimer.remove();
        if (zone._tapPending) {
          scene.events.emit('station-tap', st);
        }
        zone._tapPending = false;
      });
      zone.on('pointerout', () => {
        if (longPressTimer) longPressTimer.remove();
        zone._tapPending = false;
      });

      this.stationObjects.push({ sprite, zone });
    }
  }

  _spriteKey(stationId) {
    const map = {
      DISHWASHER: 'station_dishwasher',
      SINK: 'station_sink',
      GLASS_RACK: 'station_glass_rack',
      TAPS: 'station_taps',
      WINE: 'station_wine',
      PREP: 'station_prep',
      POS: 'station_pos',
      TRASH: 'station_trash',
      MENU: 'station_menu',
    };
    return map[stationId] || null;
  }

  destroy() {
    for (const obj of this.counterObjects) obj.destroy();
    this.counterObjects = [];
    for (const obj of this.stationObjects) {
      obj.sprite.destroy();
      obj.zone.destroy();
    }
    this.stationObjects = [];
  }
}
