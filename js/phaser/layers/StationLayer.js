import {
  CANVAS_W, BAR_LEFT, BAR_RIGHT, BAR_MAX_W,
  BAR_CABINET_TOP, BAR_CABINET_BOTTOM,
  COUNTER_Y, COUNTER_H, COUNTER_SURFACE_Y,
} from '../../constants.js';

// Where each station lives physically
// 'on_counter'  — sits on the back counter, base pushed into surface
// 'in_counter'  — embedded in the back counter (sink)
// 'under_bar'   — inside the bar cabinets (below bar top, above floor)
const STATION_PLACEMENT = {
  TAPS:        'on_counter',
  WINE:        'on_counter',
  PREP:        'on_counter',
  POS:         'on_counter',
  MENU:        'on_counter',
  SINK:        'in_counter',
  GLASS_RACK:  'under_bar',
  DISHWASHER:  'under_bar',
  TRASH:       'under_bar',
};

// How many source pixels of the sprite base to hide behind the counter surface
// (like BAR_OVERLAP_ROW for guests)
const COUNTER_BASE_ROWS = {
  TAPS: 4, WINE: 4, PREP: 3, POS: 6, MENU: 4,
};

const STATION_SCALE = 0.6;

/**
 * Back counter (single wood-textured strip on the floor) and station sprites.
 * Under-bar stations render in the bar cabinet area instead.
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

    // ── Back counter — single tiled wood strip ──
    const counterLeft = 10;
    const counterRight = CANVAS_W - 10;
    for (let x = counterLeft; x < counterRight; x += 192) {
      const tile = scene.add.image(x, COUNTER_SURFACE_Y, 'back_counter')
        .setOrigin(0, 0).setDepth(15);
      this.counterObjects.push(tile);
    }

    // ── Station sprites ──
    const barCenterX = (BAR_LEFT + BAR_RIGHT) / 2;
    const cabinetMidY = (BAR_CABINET_TOP + BAR_CABINET_BOTTOM) / 2;

    for (const st of stations) {
      const spriteKey = this._spriteKey(st.id);
      if (!spriteKey) continue;

      const placement = STATION_PLACEMENT[st.id] || 'on_counter';
      let sprite;
      let zoneY;

      switch (placement) {
        case 'on_counter': {
          // Sprite bottom pushed into counter by baseRows (counter covers the base)
          const baseRows = COUNTER_BASE_ROWS[st.id] || 3;
          const overlap = baseRows * STATION_SCALE;
          sprite = scene.add.image(st.x, COUNTER_SURFACE_Y + overlap, spriteKey)
            .setOrigin(0.5, 1).setScale(STATION_SCALE).setDepth(14);
          zoneY = COUNTER_SURFACE_Y - 10;
          break;
        }
        case 'in_counter': {
          // Centered on the counter strip
          sprite = scene.add.image(st.x, COUNTER_Y, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(16);
          zoneY = COUNTER_Y;
          break;
        }
        case 'under_bar': {
          // Inside the bar cabinets — centered vertically in cabinet area
          sprite = scene.add.image(st.x, cabinetMidY, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(7);
          zoneY = cabinetMidY;
          break;
        }
      }

      // Interactive zone — 10% larger
      const zoneW = ((st.width || 50) + 10) * 1.1;
      const zoneH = 77;
      const zone = scene.add.zone(st.x, zoneY, zoneW, zoneH)
        .setInteractive({ useHandCursor: true })
        .setDepth(17);

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
