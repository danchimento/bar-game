import { DEPTH } from '../../constants/depths.js';
import {
  BARTENDER_CARRY_OFFSET_X, BARTENDER_CARRY_OFFSET_Y, BARTENDER_BUSY_BAR_OFFSET_Y,
} from '../../constants/layout.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

/**
 * Bartender sprite + carried item graphic + busy progress bar.
 * Reads walkTrackY and start position from BarLayout.
 */
export class BartenderLayer {
  constructor(scene, barLayout) {
    this.scene = scene;
    this._walkTrackY = barLayout.walkTrackY;

    const startX = barLayout.bartenderStartX;
    const trackY = barLayout.walkTrackY;

    this.sprite = scene.add.sprite(startX, trackY, 'bartender')
      .setDepth(DEPTH.BARTENDER)
      .setScale(1.05);
    this._wasMoving = false;

    // Busy progress bar
    this.busyBarBg = scene.add.rectangle(startX, trackY + BARTENDER_BUSY_BAR_OFFSET_Y, 50, 5, 0x333333)
      .setDepth(DEPTH.BUSY_BAR).setVisible(false);
    this.busyBarFill = scene.add.rectangle(startX, trackY + BARTENDER_BUSY_BAR_OFFSET_Y, 0, 5, 0x4caf50)
      .setOrigin(0, 0.5).setDepth(DEPTH.BUSY_BAR).setVisible(false);
    this.busyLabel = scene.add.text(startX, trackY + BARTENDER_BUSY_BAR_OFFSET_Y + 11, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#e0e0e0',
    }).setOrigin(0.5).setDepth(DEPTH.BUSY_BAR).setVisible(false);

    // Carry indicator
    this.carryGfx = scene.add.graphics().setDepth(DEPTH.BARTENDER_CARRY);
    this.carryIcon = scene.add.image(startX, trackY - 45, 'icon_dirty_glass')
      .setOrigin(0.5).setDepth(DEPTH.BARTENDER_CARRY).setVisible(false).setScale(1.02);
  }

  update(bartender, barState) {
    if (!bartender) return;
    const trackY = this._walkTrackY;

    const x = bartender.x;
    const carry = bartender.carrying;
    const isCarrying = !!carry;

    const isMoving = Math.abs(bartender.x - bartender.targetX) > 3;
    this.sprite.x = x;

    if (isMoving) {
      this.sprite.setFlipX(!bartender.facingRight);
      if (!isCarrying) {
        if (!this._wasMoving || this.sprite.texture.key !== 'bartender_walk') {
          this.sprite.play('bartender-walk');
        }
      } else {
        this.sprite.stop();
        this.sprite.setTexture('bartender_carry');
      }
    } else {
      this.sprite.stop();
      if (isCarrying) {
        this.sprite.setTexture('bartender_carry');
        this.sprite.setFlipX(!bartender.facingRight);
      } else {
        this.sprite.setTexture('bartender_back');
        this.sprite.setFlipX(false);
      }
    }
    this._wasMoving = isMoving;

    // Carry indicator
    this.carryGfx.clear();
    this.carryIcon.setVisible(false);

    if (carry) {
      const sideOffset = bartender.facingRight ? BARTENDER_CARRY_OFFSET_X : -BARTENDER_CARRY_OFFSET_X;
      const itemX = x + sideOffset;
      const itemY = trackY - BARTENDER_CARRY_OFFSET_Y;

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
      this.busyBarBg.setPosition(x, trackY + BARTENDER_BUSY_BAR_OFFSET_Y).setVisible(true);
      this.busyBarFill
        .setPosition(x - barW / 2, trackY + BARTENDER_BUSY_BAR_OFFSET_Y)
        .setSize(barW * Math.min(1, progress), 5)
        .setVisible(true);
      this.busyLabel
        .setText(bartender.busyLabel)
        .setPosition(x, trackY + BARTENDER_BUSY_BAR_OFFSET_Y + 11)
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
