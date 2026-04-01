import { STATION_Y, STATION_LABEL_Y } from '../../constants.js';

/**
 * Back counter with station sprites. Each station is interactive.
 * Emits 'station-tap' and 'station-longpress' events on the scene.
 */
export class StationLayer {
  constructor(scene, stations) {
    this.scene = scene;
    this.stationObjects = [];
    this.build(stations);
  }

  build(stations) {
    this.destroy();
    const scene = this.scene;

    // Back counter background — depth 15: in front of bartender (depth 10-12)
    const minX = stations.length ? stations[0].x - 60 : 30;
    const maxX = stations.length ? stations[stations.length - 1].x + 60 : 930;
    const counterW = maxX - minX;
    scene.add.rectangle(minX + counterW / 2, STATION_Y, counterW + 20, 80, 0x3a2a1a, 1)
      .setDepth(15).setStrokeStyle(2, 0x4d3a28);

    // Station sprites + labels — depth 16
    for (const st of stations) {
      const spriteKey = this._spriteKey(st.id);
      const sprite = spriteKey
        ? scene.add.image(st.x, STATION_Y, spriteKey).setScale(1.2).setDepth(16)
        : scene.add.rectangle(st.x, STATION_Y, st.width || 60, 60, 0x4a3728).setDepth(16);

      const label = scene.add.text(st.x, STATION_LABEL_Y, st.label, {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#bbbbbb',
      }).setOrigin(0.5).setDepth(16);

      // Interactive zone covers station area
      const zone = scene.add.zone(st.x, STATION_Y, (st.width || 60) + 10, 88)
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

      this.stationObjects.push({ sprite, label, zone });
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
    };
    return map[stationId] || null;
  }

  destroy() {
    for (const obj of this.stationObjects) {
      obj.sprite.destroy();
      obj.label.destroy();
      obj.zone.destroy();
    }
    this.stationObjects = [];
  }
}
