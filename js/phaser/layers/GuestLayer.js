import { GUEST_STATE, ORDER_REVEAL_TIME, CANVAS_W } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';
import { GUEST_APPEARANCE_IDS } from '../../data/guestAppearances.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';
import { DEPTH } from '../../constants/depths.js';

// Sitting sprite geometry — screen pixel values (sprites render at 1:1)
// Sprite is 144×120px on screen (24×20 art at 6×). Hands are drawn at art
// rows 18–19. We position the sprite so only rows 18–19 (hands) cross the
// bar surface — everything from row 17 up (torso, arms, head) sits above
// the bar. BAR_OVERLAP_SCREEN_ROW = art row 18 × 6 = 108.
const SIT_SPRITE_SCREEN_H = 120;   // 20 art × 6 scale
const BAR_OVERLAP_SCREEN_ROW = 108; // art row 18 × 6 scale (top of hands)
const BAR_OVERLAP_OFFSET = SIT_SPRITE_SCREEN_H - BAR_OVERLAP_SCREEN_ROW; // 12px

/**
 * Manages visual representations of guests.
 * Creates/destroys Phaser sprites as guests come and go.
 * Handles sipping animation: glass lifts from counter to guest's mouth and back.
 * Icons pop up and fade (like memory flashes) instead of persistent bubbles.
 */
export class GuestLayer {
  constructor(scene, barLayout) {
    this.scene = scene;
    this._bl = barLayout;
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
    const appearanceId = GUEST_APPEARANCE_IDS[guest.id % GUEST_APPEARANCE_IDS.length];

    const sprite = scene.add.sprite(0, 0, `guest_${appearanceId}`).setDepth(DEPTH.GUESTS);

    // State popup icon — pops up and fades on state change
    const statePopup = scene.add.image(0, 0, 'icon_hourglass')
      .setOrigin(0.5).setDepth(15).setVisible(false).setScale(0.96);

    // Mood popup (heart / angry) — pops up and fades on mood change
    const moodPopup = scene.add.image(0, 0, 'icon_angry')
      .setOrigin(0.5).setDepth(16).setVisible(false).setScale(0.84);

    // Sip glass graphic (for the drinking animation)
    const sipGlass = scene.add.graphics().setDepth(8).setVisible(false);

    // Order text above head (shown when orderRevealTimer > 0)
    const orderText = scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#ffd54f',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(15).setVisible(false);

    return {
      sprite, appearanceId,
      statePopup, statePopupTimer: 0, stateRepeatTimer: 0,
      moodPopup, moodPopupTimer: 0,
      orderText, sipGlass,
      lastMood: guest.mood,
      lastState: guest.state,
      isSitting: false,
      wasWalking: false,
      walkBobTimer: 0,
    };
  }

  _syncVisual(vis, guest) {
    const x = guest.x || 0;
    const y = guest.y || this._bl.guestY;

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
    const walking = guest.state === GUEST_STATE.ARRIVING ||
                    guest.state === GUEST_STATE.LEAVING ||
                    guest.state === GUEST_STATE.ANGRY_LEAVING ||
                    guest.state === GUEST_STATE.WAITING_FOR_SEAT;

    if (seated !== vis.isSitting || walking !== vis.wasWalking) {
      vis.isSitting = seated;
      vis.wasWalking = walking;
      if (walking) {
        // Use front-facing standing sprite instead of side-view walk animation
        vis.sprite.stop();
        vis.sprite.setTexture(`guest_${vis.appearanceId}`);
        vis.walkBobTimer = 0;
      } else if (seated) {
        vis.sprite.stop();
        vis.sprite.setTexture(`guest_sitting_${vis.appearanceId}`);
      } else {
        vis.sprite.stop();
        vis.sprite.setTexture(`guest_${vis.appearanceId}`);
      }
    }

    // Advance walk bob timer for walking guests
    if (walking) {
      vis.walkBobTimer += 1 / 60;
    }

    // Sitting sprite: push down so BAR_OVERLAP_ROW aligns with bar surface.
    // Bar surface (depth 6) covers the lower torso, making guest flush against bar.
    if (vis.isSitting) {
      vis.sprite.setOrigin(0.5, 1.0);
      vis.sprite.setPosition(x, this._bl.barSurfaceY + BAR_OVERLAP_OFFSET);
    } else if (walking) {
      // Subtle side-to-side bob to indicate walking
      const bob = Math.sin(vis.walkBobTimer * 8) * 1.5;
      vis.sprite.setOrigin(0.5, 0.5);
      vis.sprite.setPosition(x + bob, y);
    } else {
      vis.sprite.setOrigin(0.5, 0.5);
      vis.sprite.setPosition(x, y);
    }

    // The base Y for popups (above guest head)
    const spriteTop = vis.isSitting ? this._bl.barSurfaceY + BAR_OVERLAP_OFFSET - SIT_SPRITE_SCREEN_H : y - 96;
    const headY = vis.isSitting ? spriteTop - 8 : y - 35;

    // ── State change popup (pop up and fade like a memory flash) ──
    const iconKey = this._indicatorIcon(guest);
    if (guest.state !== vis.lastState) {
      // Immediate popup on state change
      if (iconKey) {
        vis.statePopup.setTexture(iconKey)
          .setPosition(x, headY)
          .setVisible(true).setAlpha(1).setScale(0.96);
        vis.statePopupTimer = 2.0;
      }
      vis.stateRepeatTimer = 3.5; // first repeat after 3.5s
      vis.lastState = guest.state;
    }

    // Repeat popup for states that need attention
    if (iconKey && vis.statePopupTimer <= 0) {
      vis.stateRepeatTimer -= 1 / 60;
      if (vis.stateRepeatTimer <= 0) {
        vis.statePopup.setTexture(iconKey)
          .setPosition(x, headY)
          .setVisible(true).setAlpha(1).setScale(0.96);
        vis.statePopupTimer = 2.0;
        vis.stateRepeatTimer = 4.0; // repeat every 4s
      }
    }

    if (vis.statePopupTimer > 0) {
      vis.statePopupTimer -= 1 / 60;
      vis.statePopup.y -= 0.4;
      vis.statePopup.setAlpha(Math.min(1, vis.statePopupTimer / 0.5));
      if (vis.statePopupTimer <= 0) {
        vis.statePopup.setVisible(false);
      }
    }

    // ── Mood change popup (heart on increase, angry on decrease) ──
    const moodDelta = guest.mood - vis.lastMood;
    if (moodDelta > 3) {
      vis.moodPopup.setTexture('icon_heart')
        .setPosition(x + 16, headY)
        .setVisible(true).setAlpha(1);
      vis.moodPopupTimer = 1.2;
    } else if (moodDelta < -3) {
      vis.moodPopup.setTexture('icon_angry')
        .setPosition(x + 16, headY)
        .setVisible(true).setAlpha(1);
      vis.moodPopupTimer = 1.2;
    }
    vis.lastMood = guest.mood;

    if (vis.moodPopupTimer > 0) {
      vis.moodPopupTimer -= 1 / 60;
      vis.moodPopup.y -= 0.5;
      vis.moodPopup.setAlpha(Math.min(1, vis.moodPopupTimer / 0.3));
      if (vis.moodPopupTimer <= 0) {
        vis.moodPopup.setVisible(false);
      }
    }

    // ── Order text above head (floats up slowly + fades like a memory) ──
    if (guest.orderRevealTimer > 0 && guest.currentDrink) {
      const drinkName = DRINKS[guest.currentDrink]?.name || guest.currentDrink;
      const revealMax = ORDER_REVEAL_TIME;
      const elapsed = revealMax - guest.orderRevealTimer;
      // Start 24px above head, drift up ~20px over the full duration
      const floatOffset = elapsed * (20 / revealMax);
      const orderY = headY - 24 - floatOffset;
      vis.orderText.setText(drinkName).setPosition(x, orderY).setVisible(true);
      // Full opacity for first half, then fade out over remaining half
      const t = guest.orderRevealTimer / revealMax; // 1 = just started, 0 = expired
      const alpha = t > 0.5 ? 1 : t / 0.5;
      vis.orderText.setAlpha(alpha);
    } else {
      vis.orderText.setVisible(false);
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
    const guestY = guest.y || this._bl.guestY;

    // Counter position → mouth position
    const counterX = guestX + 8;
    const counterY = this._bl.barY(10);
    const mouthX = guestX + 6;
    const mouthY = guestY - 5;

    const glassX = counterX + (mouthX - counterX) * liftProgress;
    const glassY = counterY + (mouthY - counterY) * liftProgress;

    // Draw the actual glass using GlassRenderer at the same scale as bar glasses
    const fillPct = glass.totalFill;
    const liquidColor = getLiquidColor(glass.layers);
    drawGlass(vis.sipGlass, glassX, glassY, glass.glassType, fillPct, liquidColor, 0.96);
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
        this.waitingText = this.scene.add.text(Math.round(CANVAS_W / 2), 82, '', {
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
    vis.statePopup.destroy();
    vis.moodPopup.destroy();
    vis.orderText.destroy();
    vis.sipGlass.destroy();
  }

  destroy() {
    for (const vis of this.guestVisuals.values()) this._destroyVisual(vis);
    this.guestVisuals.clear();
    if (this.waitingText) this.waitingText.destroy();
  }
}
