import {
  CANVAS_W,
  BAR_CABINET_TOP, BAR_CABINET_BOTTOM,
  COUNTER_SURFACE_Y, COUNTER_Y, COUNTER_H,
} from '../../constants.js';

// Where each station lives physically
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

// Source pixels of sprite base hidden by counter surface (per station)
const COUNTER_BASE_ROWS = {
  TAPS: 4, WINE: 4, PREP: 3, POS: 6, MENU: 4,
};

const STATION_SCALE = 0.72;

/**
 * Back counter (single tiled strip at screen bottom) and station sprites.
 * Under-bar stations render in the bar cabinet zone instead.
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

    // ── Back counter — tiled wood strip flush with screen bottom ──
    const counterH = COUNTER_H;
    const counterTile = scene.add.tileSprite(0, COUNTER_SURFACE_Y, CANVAS_W, counterH, 'tile_counter')
      .setOrigin(0, 0).setDepth(15);
    this.counterObjects.push(counterTile);

    // ── Station sprites ──
    const cabinetMidY = (BAR_CABINET_TOP + BAR_CABINET_BOTTOM) / 2;

    for (const st of stations) {
      const spriteKey = this._spriteKey(st.id);
      if (!spriteKey) continue;

      const placement = STATION_PLACEMENT[st.id] || 'on_counter';
      let sprite;
      let zoneY;

      switch (placement) {
        case 'on_counter': {
          const baseRows = COUNTER_BASE_ROWS[st.id] || 3;
          const overlap = baseRows * STATION_SCALE;
          sprite = scene.add.image(st.x, COUNTER_SURFACE_Y + overlap, spriteKey)
            .setOrigin(0.5, 1).setScale(STATION_SCALE).setDepth(14);
          zoneY = COUNTER_SURFACE_Y - 10;
          break;
        }
        case 'in_counter': {
          sprite = scene.add.image(st.x, COUNTER_Y, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(16);
          zoneY = COUNTER_Y;
          break;
        }
        case 'under_bar': {
          sprite = scene.add.image(st.x, cabinetMidY, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(7);
          zoneY = cabinetMidY;
          break;
        }
      }

      // Interactive zone — 10% oversize
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
