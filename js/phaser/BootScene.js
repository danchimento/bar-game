/* global Phaser */

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Progress bar
    const { width, height } = this.cameras.main;
    const barW = 300, barH = 20;
    const bx = (width - barW) / 2, by = height / 2;

    const bg = this.add.rectangle(bx + barW / 2, by, barW, barH, 0x333333);
    const fill = this.add.rectangle(bx + 2, by, 0, barH - 4, 0xe8c170).setOrigin(0, 0.5);
    const label = this.add.text(width / 2, by - 30, 'Loading...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#e8c170',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => { fill.width = (barW - 4) * v; });
    this.load.on('complete', () => { bg.destroy(); fill.destroy(); label.destroy(); });

    // ── Sprites ──
    this.load.image('bartender', 'assets/sprites/bartender.png');
    this.load.image('guest', 'assets/sprites/guest.png');
    this.load.image('guest_red', 'assets/sprites/guest_red.png');
    this.load.image('guest_green', 'assets/sprites/guest_green.png');
    this.load.image('guest_purple', 'assets/sprites/guest_purple.png');
    this.load.image('guest_orange', 'assets/sprites/guest_orange.png');
    this.load.image('stool', 'assets/sprites/stool.png');
    this.load.image('glass_pint', 'assets/sprites/glass_pint.png');
    this.load.image('glass_wine', 'assets/sprites/glass_wine.png');
    this.load.image('glass_cup', 'assets/sprites/glass_cup.png');
    this.load.image('tap_handle', 'assets/sprites/tap_handle.png');
    this.load.image('station_dishwasher', 'assets/sprites/station_dishwasher.png');
    this.load.image('station_sink', 'assets/sprites/station_sink.png');
    this.load.image('station_glass_rack', 'assets/sprites/station_glass_rack.png');
    this.load.image('station_taps', 'assets/sprites/station_taps.png');
    this.load.image('station_wine', 'assets/sprites/station_wine.png');
    this.load.image('station_prep', 'assets/sprites/station_prep.png');
    this.load.image('station_pos', 'assets/sprites/station_pos.png');
    this.load.image('station_trash', 'assets/sprites/station_trash.png');
    this.load.image('bar_top', 'assets/sprites/bar_top.png');
    this.load.image('back_counter', 'assets/sprites/back_counter.png');
    this.load.image('cash', 'assets/sprites/cash.png');
    this.load.image('spill', 'assets/sprites/spill.png');
    this.load.image('service_mat', 'assets/sprites/service_mat.png');
  }

  create() {
    this.scene.start('Title');
  }
}
