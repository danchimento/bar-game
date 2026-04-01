import { GUEST_Y, GUEST_STATE, MOOD_MAX, BAR_TOP_Y } from '../../constants.js';

const GUEST_SPRITES = ['guest', 'guest_red', 'guest_green', 'guest_purple', 'guest_orange'];

/**
 * Manages visual representations of guests.
 * Creates/destroys Phaser sprites as guests come and go.
 * Handles sipping animation: glass lifts from counter to guest's mouth and back.
 */
export class GuestLayer {
  constructor(scene) {
    this.scene = scene;
    this.guestVisuals = new Map(); // guestId → visual object
    this.waitingText = null;
  }

  /** Call every frame with current guests array */
  update(guests) {
    const activeIds = new Set();
    let waitingCount = 0;

    for (const guest of guests) {
      activeIds.add(guest.id);

      if (guest.state === GUEST_STATE.WAITING_FOR_SEAT) {
        waitingCount++;
        continue;
      }
      if (guest.state === GUEST_STATE.DONE) continue;

      let vis = this.guestVisuals.get(guest.id);
      if (!vis) {
        vis = this._createGuestVisual(guest);
        this.guestVisuals.set(guest.id, vis);
      }

      this._syncVisual(vis, guest);
    }

    // Remove visuals for guests no longer present
    for (const [id, vis] of this.guestVisuals) {
      if (!activeIds.has(id)) {
        this._destroyVisual(vis);
        this.guestVisuals.delete(id);
      }
    }

    this._updateWaitingBadge(waitingCount);
  }

  _createGuestVisual(guest) {
    const scene = this.scene;
    const spriteKey = GUEST_SPRITES[guest.id % GUEST_SPRITES.length];

    const sprite = scene.add.image(0, 0, spriteKey).setScale(0.65).setDepth(5);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      scene.events.emit('guest-tap', guest);
    });

    // Mood bar
    const moodBar = scene.add.rectangle(0, 18, 32, 4, 0x333333).setDepth(6);
    const moodFill = scene.add.rectangle(0, 18, 32, 4, 0x4caf50).setOrigin(0, 0.5).setDepth(6);

    // State indicator (sprite icon)
    const indicator = scene.add.image(0, -30, 'icon_hourglass')
      .setOrigin(0.5).setDepth(15).setVisible(false).setScale(0.8);

    // Sip glass graphic (for the drinking animation)
    const sipGlass = scene.add.graphics().setDepth(8).setVisible(false);

    return { sprite, moodBar, moodFill, indicator, sipGlass, sipGlassVisible: false };
  }

  _syncVisual(vis, guest) {
    const x = guest.x || 0;
    const y = guest.y || GUEST_Y;

    vis.sprite.setPosition(x, y);
    vis.moodBar.setPosition(x, y + 18);

    // Mood fill
    const moodPct = Math.max(0, guest.mood / MOOD_MAX);
    vis.moodFill.setPosition(x - 16, y + 18).setSize(32 * moodPct, 4);
    vis.moodFill.setFillStyle(this._moodColor(moodPct));

    // Indicator icon
    const iconKey = this._indicatorIcon(guest);
    if (iconKey) {
      vis.indicator.setTexture(iconKey).setPosition(x, y - 32).setVisible(true).setScale(0.8);
    } else {
      vis.indicator.setVisible(false);
    }

    // Sipping animation
    this._updateSipAnimation(vis, guest);

    // Fade leaving guests
    const leaving = guest.state === GUEST_STATE.LEAVING || guest.state === GUEST_STATE.ANGRY_LEAVING;
    vis.sprite.setAlpha(leaving ? 0.5 : 1);
  }

  _updateSipAnimation(vis, guest) {
    vis.sipGlass.clear();

    if (!guest.sipping || guest.state !== GUEST_STATE.ENJOYING) {
      vis.sipGlass.setVisible(false);
      return;
    }

    vis.sipGlass.setVisible(true);

    // sipAnimTimer goes from 1.0 → 0.0 over 1 second
    // Animation phases:
    //   0.0–0.3: glass lifts from counter to mouth (progress 0→1)
    //   0.3–0.7: glass at mouth (tilted)
    //   0.7–1.0: glass returns to counter (progress 1→0)
    const elapsed = 1.0 - guest.sipAnimTimer;
    let liftProgress;
    if (elapsed < 0.3) {
      liftProgress = elapsed / 0.3;
    } else if (elapsed < 0.7) {
      liftProgress = 1.0;
    } else {
      liftProgress = 1.0 - (elapsed - 0.7) / 0.3;
    }
    liftProgress = Math.max(0, Math.min(1, liftProgress));

    const guestX = guest.x || 0;
    const guestY = guest.y || GUEST_Y;

    // Counter position → mouth position
    const counterX = guestX + 8;
    const counterY = BAR_TOP_Y - 2;
    const mouthX = guestX + 6;
    const mouthY = guestY - 5;

    const glassX = counterX + (mouthX - counterX) * liftProgress;
    const glassY = counterY + (mouthY - counterY) * liftProgress;

    // Draw a small glass shape
    const gfx = vis.sipGlass;
    const s = 0.35;
    const w = 12 * s, h = 18 * s;

    // Tilt when at mouth
    const tilt = liftProgress > 0.8 ? (liftProgress - 0.8) * 5 * 0.3 : 0;

    gfx.lineStyle(1.5, 0xc8d8e8, 0.9);
    // Simple glass rectangle (small, just visual indicator)
    gfx.strokeRect(glassX - w / 2, glassY - h, w, h);

    // Fill with amber color
    gfx.fillStyle(0xf0c040, 0.7);
    const fillH = h * 0.6; // partially filled
    gfx.fillRect(glassX - w / 2 + 0.5, glassY - fillH, w - 1, fillH);
  }

  _moodColor(pct) {
    if (pct > 0.6) return 0x4caf50;
    if (pct > 0.3) return 0xffc107;
    return 0xf44336;
  }

  _indicatorIcon(guest) {
    switch (guest.state) {
      case GUEST_STATE.LOOKING: return 'icon_eyes';
      case GUEST_STATE.READY_TO_ORDER: return 'icon_eyes';
      case GUEST_STATE.WAITING_FOR_DRINK: return 'icon_hourglass';
      case GUEST_STATE.WANTS_ANOTHER: return 'icon_beer';
      case GUEST_STATE.READY_TO_PAY: return 'icon_money';
      case GUEST_STATE.REVIEWING_CHECK: return 'icon_receipt';
      case GUEST_STATE.ANGRY_LEAVING: return 'icon_angry';
      default: return null;
    }
  }

  _updateWaitingBadge(count) {
    if (count > 0) {
      if (!this.waitingText) {
        this.waitingText = this.scene.add.text(480, 82, '', {
          fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
          color: '#ffc107', backgroundColor: 'rgba(0,0,0,0.6)',
          padding: { x: 10, y: 4 },
        }).setOrigin(0.5).setDepth(6);
      }
      this.waitingText.setText(`${count} queued`).setVisible(true);
    } else if (this.waitingText) {
      this.waitingText.setVisible(false);
    }
  }

  _destroyVisual(vis) {
    vis.sprite.destroy();
    vis.moodBar.destroy();
    vis.moodFill.destroy();
    vis.indicator.destroy();
    vis.sipGlass.destroy();
  }

  destroy() {
    for (const vis of this.guestVisuals.values()) this._destroyVisual(vis);
    this.guestVisuals.clear();
    if (this.waitingText) this.waitingText.destroy();
  }
}
