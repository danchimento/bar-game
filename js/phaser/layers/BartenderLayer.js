import { WALK_TRACK_Y } from '../../constants.js';

/**
 * Bartender sprite + carry indicator + busy progress bar.
 * Syncs position from Bartender logic each frame.
 */
export class BartenderLayer {
  constructor(scene) {
    this.scene = scene;

    // Bartender sprite
    this.sprite = scene.add.image(480, WALK_TRACK_Y, 'bartender')
      .setDepth(10)
      .setScale(0.7);

    // Busy progress bar (hidden by default)
    this.busyBarBg = scene.add.rectangle(480, WALK_TRACK_Y + 35, 50, 5, 0x333333)
      .setDepth(11).setVisible(false);
    this.busyBarFill = scene.add.rectangle(480, WALK_TRACK_Y + 35, 0, 5, 0x4caf50)
      .setOrigin(0, 0.5).setDepth(11).setVisible(false);
    this.busyLabel = scene.add.text(480, WALK_TRACK_Y + 46, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#e0e0e0',
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    // Carry indicator (emoji text above head)
    this.carryLabel = scene.add.text(480, WALK_TRACK_Y - 45, '', {
      fontFamily: 'serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);
  }

  /** Call every frame with the Bartender logic instance and barState */
  update(bartender, barState) {
    if (!bartender) return;

    const x = bartender.x;
    this.sprite.x = x;
    this.sprite.setFlipX(!bartender.facingRight);

    // Carry indicator
    const carry = bartender.carrying;
    if (carry) {
      let label = '';
      if (carry === 'DIRTY_GLASS') label = '\ud83e\udee7';
      else if (carry.startsWith('CHECK_')) label = '\ud83e\uddfe';
      else if (carry.startsWith('GLASS_')) label = '\ud83e\udd43';
      else if (carry.startsWith('DRINK_')) label = '\ud83c\udf7a';
      this.carryLabel.setText(label).setPosition(x, WALK_TRACK_Y - 45).setVisible(true);
    } else {
      this.carryLabel.setVisible(false);
    }

    // Busy progress bar
    if (bartender.busy) {
      const progress = 1 - (bartender.busyTimer / bartender.busyDuration);
      const barW = 50;
      this.busyBarBg.setPosition(x, WALK_TRACK_Y + 35).setVisible(true);
      this.busyBarFill
        .setPosition(x - barW / 2, WALK_TRACK_Y + 35)
        .setSize(barW * Math.min(1, progress), 5)
        .setVisible(true);
      this.busyLabel
        .setText(bartender.busyLabel)
        .setPosition(x, WALK_TRACK_Y + 46)
        .setVisible(true);
    } else {
      this.busyBarBg.setVisible(false);
      this.busyBarFill.setVisible(false);
      this.busyLabel.setVisible(false);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.busyBarBg.destroy();
    this.busyBarFill.destroy();
    this.busyLabel.destroy();
    this.carryLabel.destroy();
  }
}
