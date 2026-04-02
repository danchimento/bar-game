import { CANVAS_W, CANVAS_H, STATION_Y } from '../../constants.js';

// Per-station placement config relative to the counter surface.
// placement: 'on' = sits on counter (pushed into surface like bar items),
//            'under' = below counter lip (in the cabinet area),
//            'floor' = on the floor behind the counter (above it on screen),
//            'flush' = fully overlaps the counter surface (sink)
// baseRow: for 'on' placement, the pixel row (from bottom of sprite) where the
//          base rests. Counter covers everything below this, like bar covers guest hands.
//          Higher number = more of the sprite hidden by counter.
const STATION_PLACEMENT = {
  TAPS:        { placement: 'on', baseRow: 4 },
  WINE:        { placement: 'on', baseRow: 4 },
  PREP:        { placement: 'on', baseRow: 3 },
  POS:         { placement: 'on', baseRow: 6 },   // stand + base hidden by counter
  MENU:        { placement: 'on', baseRow: 4 },
  SINK:        { placement: 'flush' },
  GLASS_RACK:  { placement: 'under' },
  DISHWASHER:  { placement: 'under' },
  TRASH:       { placement: 'floor' },
};

const STATION_SCALE = 0.6;

/**
 * Back counter with station sprites. Built as a wooden counter:
 * - Counter surface (tiled back_counter sprite)
 * - Front lip/edge
 * - Cabinet base extending to screen bottom
 * - Stations placed according to their placement type
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

    // Counter surface — tiled back_counter sprite at depth 15
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

    // Station sprites — placed according to type
    for (const st of stations) {
      const spriteKey = this._spriteKey(st.id);
      if (!spriteKey) continue;

      const config = STATION_PLACEMENT[st.id] || { placement: 'on', baseRow: 3 };
      let sprite;
      let zoneY = STATION_Y;

      switch (config.placement) {
        case 'on': {
          // Sprite bottom pushed below counter surface by baseRow pixels (scaled)
          // Counter surface (depth 15) covers the base, like bar covers guest hands
          const overlap = (config.baseRow || 3) * STATION_SCALE;
          sprite = scene.add.image(st.x, surfaceY + overlap, spriteKey)
            .setOrigin(0.5, 1).setScale(STATION_SCALE).setDepth(14); // behind counter surface
          zoneY = surfaceY - 10;
          break;
        }
        case 'flush': {
          // Centered on the counter surface, depth 14 so surface partially covers
          const midY = surfaceY + surfaceH / 2;
          sprite = scene.add.image(st.x, midY, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(14);
          zoneY = surfaceY;
          break;
        }
        case 'under': {
          // Below the lip, in the cabinet area
          sprite = scene.add.image(st.x, lipY + lipH + 2, spriteKey)
            .setOrigin(0.5, 0).setScale(STATION_SCALE).setDepth(16);
          zoneY = lipY + lipH + 10;
          break;
        }
        case 'floor': {
          // On the floor behind counter — sprite bottom at counter surface top
          sprite = scene.add.image(st.x, surfaceY, spriteKey)
            .setOrigin(0.5, 1).setScale(STATION_SCALE).setDepth(14);
          zoneY = surfaceY - 10;
          break;
        }
      }

      // Interactive zone — 10% larger than before
      const zoneW = ((st.width || 50) + 10) * 1.1;
      const zoneH = 77;
      const zone = scene.add.zone(st.x, zoneY, zoneW, zoneH)
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
