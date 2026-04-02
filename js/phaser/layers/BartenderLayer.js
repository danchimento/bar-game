import { WALK_TRACK_Y } from '../../constants.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

/**
 * Bartender sprite + carried item graphic + busy progress bar.
 * Swaps to carry sprite when holding something, with the item drawn to the side.
 */
export class BartenderLayer {
  constructor(scene) {
    this.scene = scene;

    // Bartender sprite
    this.sprite = scene.add.image(480, WALK_TRACK_Y, 'bartender')
      .setDepth(10)
      .setScale(1.05);

    // Busy progress bar (hidden by default)
    this.busyBarBg = scene.add.rectangle(480, WALK_TRACK_Y + 35, 50, 5, 0x333333)
      .setDepth(11).setVisible(false);
    this.busyBarFill = scene.add.rectangle(480, WALK_TRACK_Y + 35, 0, 5, 0x4caf50)
      .setOrigin(0, 0.5).setDepth(11).setVisible(false);
    this.busyLabel = scene.add.text(480, WALK_TRACK_Y + 46, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#e0e0e0',
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    // Carry indicator — Graphics for drawing glass to the side
    this.carryGfx = scene.add.graphics().setDepth(12);
    // Fallback icon for non-glass items (check, dirty glass)
    this.carryIcon = scene.add.image(480, WALK_TRACK_Y - 45, 'icon_dirty_glass')
      .setOrigin(0.5).setDepth(12).setVisible(false).setScale(1.02);
  }

  /** Call every frame with the Bartender logic instance and barState */
  update(bartender, barState) {
    if (!bartender) return;

    const x = bartender.x;
    const carry = bartender.carrying;
    const isCarrying = !!carry;

    // Swap between normal and carry sprite
    this.sprite.setTexture(isCarrying ? 'bartender_carry' : 'bartender');
    this.sprite.x = x;
    this.sprite.setFlipX(!bartender.facingRight);

    // Carry indicator — drawn to the right side of the bartender
    // (flipX mirrors the whole visual, so the extended arm + item follows)
    this.carryGfx.clear();
    this.carryIcon.setVisible(false);

    if (carry) {
      // Item position: offset to the right of the sprite (arm extends right in art)
      // When flipped, Phaser mirrors everything, so always use positive offset
      const sideOffset = bartender.facingRight ? 28 : -28;
      const itemX = x + sideOffset;
      const itemY = WALK_TRACK_Y - 22;

      if (carry === 'DIRTY_GLASS') {
        this.carryIcon.setTexture('icon_dirty_glass').setPosition(itemX, itemY - 8).setVisible(true);
      } else if (carry.startsWith('CHECK_')) {
        this.carryIcon.setTexture('icon_receipt').setPosition(itemX, itemY - 8).setVisible(true);
      } else if (carry.startsWith('GLASS_') || carry.startsWith('DRINK_')) {
        const glass = barState.carriedGlass;
        if (glass) {
          const fillPct = glass.totalFill;
          const liquidColor = getLiquidColor(glass.layers);
          drawGlass(this.carryGfx, itemX, itemY, glass.glassType, fillPct, liquidColor, 0.84);
        }
      }
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
    this.carryGfx.destroy();
    this.carryIcon.destroy();
  }
}
