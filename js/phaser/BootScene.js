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
    this.load.image('bartender_carry', 'assets/sprites/bartender_carry.png');
    this.load.image('guest', 'assets/sprites/guest.png');
    this.load.image('guest_red', 'assets/sprites/guest_red.png');
    this.load.image('guest_green', 'assets/sprites/guest_green.png');
    this.load.image('guest_purple', 'assets/sprites/guest_purple.png');
    this.load.image('guest_orange', 'assets/sprites/guest_orange.png');
    this.load.image('guest_sitting', 'assets/sprites/guest_sitting.png');
    this.load.image('guest_sitting_red', 'assets/sprites/guest_sitting_red.png');
    this.load.image('guest_sitting_green', 'assets/sprites/guest_sitting_green.png');
    this.load.image('guest_sitting_purple', 'assets/sprites/guest_sitting_purple.png');
    this.load.image('guest_sitting_orange', 'assets/sprites/guest_sitting_orange.png');
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
    this.load.image('station_menu', 'assets/sprites/station_menu.png');
    this.load.image('back_counter', 'assets/sprites/back_counter.png');
    this.load.image('cash', 'assets/sprites/cash.png');
    this.load.image('spill', 'assets/sprites/spill.png');
    this.load.image('service_mat', 'assets/sprites/service_mat.png');

    // Indicator icons (replace emoji text)
    this.load.image('icon_hourglass', 'assets/sprites/icon_hourglass.png');
    this.load.image('icon_eyes', 'assets/sprites/icon_eyes.png');
    this.load.image('icon_money', 'assets/sprites/icon_money.png');
    this.load.image('icon_angry', 'assets/sprites/icon_angry.png');
    this.load.image('icon_beer', 'assets/sprites/icon_beer.png');
    this.load.image('icon_receipt', 'assets/sprites/icon_receipt.png');
    this.load.image('icon_thought', 'assets/sprites/icon_thought.png');
    this.load.image('icon_dirty_glass', 'assets/sprites/icon_dirty_glass.png');
    this.load.image('icon_heart', 'assets/sprites/icon_heart.png');

    // Radial menu icons
    this.load.image('rm_serve', 'assets/sprites/rm_serve.png');
    this.load.image('rm_question', 'assets/sprites/rm_question.png');
    this.load.image('rm_smile', 'assets/sprites/rm_smile.png');
    this.load.image('rm_take_glass', 'assets/sprites/rm_take_glass.png');
    this.load.image('rm_glass', 'assets/sprites/rm_glass.png');
    this.load.image('rm_wine', 'assets/sprites/rm_wine.png');
    this.load.image('rm_clean', 'assets/sprites/rm_clean.png');
    this.load.image('rm_dump', 'assets/sprites/rm_dump.png');
    this.load.image('rm_trash', 'assets/sprites/rm_trash.png');
    this.load.image('rm_ice', 'assets/sprites/rm_ice.png');

    // Tap frame and beer handles
    this.load.image('tap_frame', 'assets/sprites/tap_frame.png');
    this.load.image('handle_gold_lager', 'assets/sprites/handle_gold_lager.png');
    this.load.image('handle_gold_lager_pulled', 'assets/sprites/handle_gold_lager_pulled.png');
    this.load.image('handle_hazy_ipa', 'assets/sprites/handle_hazy_ipa.png');
    this.load.image('handle_hazy_ipa_pulled', 'assets/sprites/handle_hazy_ipa_pulled.png');
    this.load.image('handle_dark_porter', 'assets/sprites/handle_dark_porter.png');
    this.load.image('handle_dark_porter_pulled', 'assets/sprites/handle_dark_porter_pulled.png');
    this.load.image('handle_harvest_moon', 'assets/sprites/handle_harvest_moon.png');
    this.load.image('handle_harvest_moon_pulled', 'assets/sprites/handle_harvest_moon_pulled.png');
  }

  create() {
    this.scene.start('Title');
  }
}
