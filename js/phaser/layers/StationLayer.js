import { DEPTH } from '../../constants/depths.js';
import { STATION_SCALE, STATION_ZONE_H } from '../../constants/layout.js';

/**
 * Back counter (tiled strip at screen bottom) and station sprites.
 * Station positions and placement types come from BarLayout.
 */
export class StationLayer {
  constructor(scene, barLayout) {
    this.scene = scene;
    this._bl = barLayout;
    this.stationObjects = [];
    this.counterObjects = [];
    this.build();
  }

  build() {
    this.destroy();
    const scene = this.scene;
    const bl = this._bl;

    // ── Back counter — tiled wood strip (matches bar width) ──
    const counterTile = scene.add.tileSprite(
      bl.barLeft, bl.counterSurfaceY, bl.barWidth, bl.counterH, 'tile_counter',
    ).setOrigin(0, 0).setDepth(DEPTH.STATION_COUNTER);
    this.counterObjects.push(counterTile);

    // ── Station sprites ──
    for (const st of bl.stations) {
      const spriteKey = this._spriteKey(st.id);
      if (!spriteKey) continue;

      const { x, y, placement } = bl.stationScreenPos(st);

      let sprite;
      let zoneY;
      switch (placement) {
        case 'on_counter':
          sprite = scene.add.image(x, y, spriteKey)
            .setOrigin(0.5, 1).setScale(STATION_SCALE).setDepth(DEPTH.STATION_SPRITE);
          zoneY = bl.counterSurfaceY;
          break;
        case 'in_counter':
          sprite = scene.add.image(x, y, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(DEPTH.STATION_EMBEDDED);
          zoneY = bl.counterY;
          break;
        case 'under_bar':
          sprite = scene.add.image(x, y, spriteKey)
            .setOrigin(0.5, 0.5).setScale(STATION_SCALE).setDepth(DEPTH.BAR_ITEMS);
          zoneY = bl.cabinetMidY;
          break;
      }

      // Interactive zone — 10% oversize
      const zoneW = ((st.width || 50) + 10) * 1.1;
      const zone = scene.add.zone(st.x, zoneY, zoneW, STATION_ZONE_H)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH.STATION_ZONE);

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
