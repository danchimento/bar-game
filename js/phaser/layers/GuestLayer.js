import { GUEST_Y, GUEST_STATE, BAR_TOP_Y } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

const GUEST_SPRITES = ['guest', 'guest_red', 'guest_green', 'guest_purple', 'guest_orange'];
const GUEST_SITTING_SPRITES = ['guest_sitting', 'guest_sitting_red', 'guest_sitting_green', 'guest_sitting_purple', 'guest_sitting_orange'];

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

  /** Call every frame with current guests array and drinks at seats */
  update(guests, drinksAtSeats) {
    this._drinksAtSeats = drinksAtSeats || new Map();
    // Build sipping set: seatId → glass index being sipped
    this._sippingMap = new Map();
    const activeIds = new Set();
    let waitingCount = 0;

    for (const guest of guests) {
      activeIds.add(guest.id);

      if (guest.state === GUEST_STATE.WAITING_FOR_SEAT) {
        waitingCount++;
        continue;
      }
      if (guest.state === GUEST_STATE.DONE) continue;

      // Track which glass is being sipped so BarItemsLayer can hide it
      if (guest.sipping && guest.seatId !== null && guest.seatId !== undefined) {
        const glasses = this._drinksAtSeats.get(guest.seatId);
        if (glasses && glasses.length > 0) {
          const idx = (guest.sipDrinkIndex - 1 + glasses.length) % glasses.length;
          this._sippingMap.set(guest.seatId, idx);
        }
      }

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
    const spriteIdx = guest.id % GUEST_SPRITES.length;

    const sprite = scene.add.image(0, 0, GUEST_SPRITES[spriteIdx]).setScale(0.81).setDepth(5);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      scene.events.emit('guest-tap', guest);
    });

    // Thought bubble behind indicator
    const bubble = scene.add.graphics().setDepth(14);

    // State indicator (sprite icon)
    const indicator = scene.add.image(0, -30, 'icon_hourglass')
      .setOrigin(0.5).setDepth(15).setVisible(false).setScale(0.8);

    // Order text above head
    const orderText = scene.add.text(0, -50, '', {
      fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#ffd54f',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setDepth(15).setVisible(false);

    // Sip glass graphic (for the drinking animation)
    const sipGlass = scene.add.graphics().setDepth(8).setVisible(false);

    // Mood change popup (heart / angry)
    const moodPopup = scene.add.image(0, 0, 'icon_angry')
      .setOrigin(0.5).setDepth(16).setVisible(false).setScale(0.7);

    return { sprite, spriteIdx, bubble, indicator, orderText, sipGlass, sipGlassVisible: false, moodPopup, moodPopupTimer: 0, lastMood: guest.mood, isSitting: false };
  }

  _syncVisual(vis, guest) {
    const x = guest.x || 0;
    const y = guest.y || GUEST_Y;

    // Swap between sitting and standing sprites based on state
    const seated = guest.state === GUEST_STATE.SEATED ||
                   guest.state === GUEST_STATE.LOOKING ||
                   guest.state === GUEST_STATE.READY_TO_ORDER ||
                   guest.state === GUEST_STATE.ORDER_TAKEN ||
                   guest.state === GUEST_STATE.WAITING_FOR_DRINK ||
                   guest.state === GUEST_STATE.ENJOYING ||
                   guest.state === GUEST_STATE.WANTS_ANOTHER ||
                   guest.state === GUEST_STATE.READY_TO_PAY ||
                   guest.state === GUEST_STATE.REVIEWING_CHECK;
    if (seated !== vis.isSitting) {
      vis.isSitting = seated;
      const key = seated
        ? GUEST_SITTING_SPRITES[vis.spriteIdx]
        : GUEST_SPRITES[vis.spriteIdx];
      vis.sprite.setTexture(key);
    }

    // Sitting sprite: position bottom at bar top; standing: center at y
    if (vis.isSitting) {
      vis.sprite.setOrigin(0.5, 1.0);
      vis.sprite.setPosition(x, BAR_TOP_Y);
    } else {
      vis.sprite.setOrigin(0.5, 0.5);
      vis.sprite.setPosition(x, y);
    }

    // Indicator icon + thought bubble (raised higher to avoid head overlap)
    const iconKey = this._indicatorIcon(guest);
    if (iconKey) {
      const iconY = y - 46;
      vis.indicator.setTexture(iconKey).setPosition(x, iconY).setVisible(true).setScale(0.8);

      // Draw thought bubble behind icon
      vis.bubble.clear();
      vis.bubble.fillStyle(0xffffff, 0.92);
      vis.bubble.fillRoundedRect(x - 14, iconY - 12, 28, 24, 8);
      // Small triangle pointer
      vis.bubble.fillTriangle(x - 3, iconY + 12, x + 3, iconY + 12, x, iconY + 17);
      vis.bubble.setVisible(true);
    } else {
      vis.indicator.setVisible(false);
      vis.bubble.clear();
      vis.bubble.setVisible(false);
    }

    // Order text above head (above the bubble)
    if (guest.orderRevealTimer > 0 && guest.currentDrink) {
      const drinkName = DRINKS[guest.currentDrink]?.name || guest.currentDrink;
      const orderY = iconKey ? y - 68 : y - 52;
      vis.orderText.setText(drinkName).setPosition(x, orderY).setVisible(true);
    } else {
      vis.orderText.setVisible(false);
    }

    // Mood change popup (heart on increase, angry on decrease)
    const moodDelta = guest.mood - vis.lastMood;
    if (moodDelta > 3) {
      vis.moodPopup.setTexture('icon_heart').setPosition(x + 16, y - 30).setVisible(true).setAlpha(1);
      vis.moodPopupTimer = 1.2;
    } else if (moodDelta < -3) {
      vis.moodPopup.setTexture('icon_angry').setPosition(x + 16, y - 30).setVisible(true).setAlpha(1);
      vis.moodPopupTimer = 1.2;
    }
    vis.lastMood = guest.mood;

    if (vis.moodPopupTimer > 0) {
      vis.moodPopupTimer -= 1 / 60; // approximate dt
      const popupY = vis.moodPopup.y - 0.5; // float upward
      vis.moodPopup.setPosition(vis.moodPopup.x, popupY);
      vis.moodPopup.setAlpha(Math.min(1, vis.moodPopupTimer / 0.3));
      if (vis.moodPopupTimer <= 0) {
        vis.moodPopup.setVisible(false);
      }
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

    // Find the actual glass being sipped
    const glasses = this._drinksAtSeats.get(guest.seatId);
    if (!glasses || glasses.length === 0) {
      vis.sipGlass.setVisible(false);
      return;
    }
    const idx = (guest.sipDrinkIndex - 1 + glasses.length) % glasses.length;
    const glass = glasses[idx];
    if (!glass) {
      vis.sipGlass.setVisible(false);
      return;
    }

    vis.sipGlass.setVisible(true);

    // sipAnimTimer goes from 1.0 → 0.0 over 1 second
    // Phases: 0.0–0.3 lift, 0.3–0.7 at mouth, 0.7–1.0 return
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

    // Draw the actual glass using GlassRenderer at the same scale as bar glasses
    const fillPct = glass.totalFill;
    const liquidColor = getLiquidColor(glass.layers);
    drawGlass(vis.sipGlass, glassX, glassY, glass.glassType, fillPct, liquidColor, 0.8);
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
    vis.bubble.destroy();
    vis.indicator.destroy();
    vis.orderText.destroy();
    vis.sipGlass.destroy();
    vis.moodPopup.destroy();
  }

  destroy() {
    for (const vis of this.guestVisuals.values()) this._destroyVisual(vis);
    this.guestVisuals.clear();
    if (this.waitingText) this.waitingText.destroy();
  }
}
