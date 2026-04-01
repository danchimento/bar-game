import { GUEST_Y, GUEST_STATE, MOOD_MAX } from '../../constants.js';

const GUEST_SPRITES = ['guest', 'guest_red', 'guest_green', 'guest_purple', 'guest_orange'];

/**
 * Manages visual representations of guests.
 * Creates/destroys Phaser sprites as guests come and go.
 */
export class GuestLayer {
  constructor(scene) {
    this.scene = scene;
    this.guestVisuals = new Map(); // guestId → { container, sprite, moodBar, moodFill, indicator }
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

    // Waiting count badge
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

    // Mood bar background
    const moodBar = scene.add.rectangle(0, 18, 32, 4, 0x333333).setDepth(6);
    const moodFill = scene.add.rectangle(0, 18, 32, 4, 0x4caf50).setOrigin(0, 0.5).setDepth(6);

    // State indicator (emoji)
    const indicator = scene.add.text(0, -30, '', {
      fontFamily: 'serif', fontSize: '14px',
    }).setOrigin(0.5).setDepth(6);

    return { sprite, moodBar, moodFill, indicator };
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

    // Indicator
    vis.indicator.setPosition(x, y - 30).setText(this._indicatorEmoji(guest));

    // Fade leaving guests
    const leaving = guest.state === GUEST_STATE.LEAVING || guest.state === GUEST_STATE.ANGRY_LEAVING;
    vis.sprite.setAlpha(leaving ? 0.5 : 1);
  }

  _moodColor(pct) {
    if (pct > 0.6) return 0x4caf50;
    if (pct > 0.3) return 0xffc107;
    return 0xf44336;
  }

  _indicatorEmoji(guest) {
    switch (guest.state) {
      case GUEST_STATE.LOOKING: return '\u23f3';
      case GUEST_STATE.READY_TO_ORDER: return '\ud83d\udc40';
      case GUEST_STATE.WAITING_FOR_DRINK: return '\u23f3';
      case GUEST_STATE.WANTS_ANOTHER: return '\ud83c\udf7a';
      case GUEST_STATE.READY_TO_PAY: return '\ud83d\udcb5';
      case GUEST_STATE.REVIEWING_CHECK: return '\ud83e\uddfe';
      case GUEST_STATE.ANGRY_LEAVING: return '\ud83d\ude21';
      default: return '';
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
      this.waitingText.setText(`\u23f3 ${count} waiting`).setVisible(true);
    } else if (this.waitingText) {
      this.waitingText.setVisible(false);
    }
  }

  _destroyVisual(vis) {
    vis.sprite.destroy();
    vis.moodBar.destroy();
    vis.moodFill.destroy();
    vis.indicator.destroy();
  }

  destroy() {
    for (const vis of this.guestVisuals.values()) this._destroyVisual(vis);
    this.guestVisuals.clear();
    if (this.waitingText) this.waitingText.destroy();
  }
}
