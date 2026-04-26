import { GUEST_STATE, CANVAS_W, CANVAS_H } from '../../constants.js';
import { GUEST_APPEARANCE_IDS } from '../../data/guestAppearances.js';
import { GUEST_SIT_SCREEN_H, GUEST_BAR_OVERLAP_PX } from '../../constants/layout.js';
import { BaseModal } from './BaseModal.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

// ── Message pools — random pick per guest for variety ──
const MESSAGES = {
  SEATED_NEW: [
    "Hi there!", "Hey!", "Evening!", "Hello!", "Hey, how's it going?",
    "Hi! Nice place.", "What's up?", "Heya!", "Good evening!",
    "Hi! Busy night?", "Hey there!", "Howdy!", "'Sup!",
    "Hi! First time here.", "Well hello!", "Hey hey!",
    "Nice spot!", "Good to be here!", "Hey! Love the vibe.",
    "Hi! What a night.", "Yo!", "Greetings!", "Hiya!",
    "Hey! Great atmosphere.", "Cheers!", "Hi! Finally made it.",
  ],
  SEATED_GREETED: [
    "Give me a moment...", "Just a sec...", "Hmm, one moment...",
    "Let me think...", "Hold on...", "Gimme a sec...",
    "Still looking...", "One minute...", "Bear with me...",
    "Almost ready...", "Just browsing...", "Hmm...",
    "Need a second...", "Just getting settled...", "Hang on...",
    "Let me see...", "Not quite ready...", "Working on it...",
    "Thinking...", "Still making up my mind...",
  ],
  LOOKING_NEW: [
    "Hmm, what looks good...", "What do you have?",
    "Let me see the options...", "What's on tap?",
    "Anything you recommend?", "What's popular here?",
    "Hmm, decisions decisions...", "What's the special?",
    "So many choices...", "I'm browsing...",
    "What do people usually get?", "Talk to me about the menu.",
    "Let me take a look...", "What's good tonight?",
    "Any recommendations?", "What's your best seller?",
    "I need a minute to decide.", "Ooh, tough choices.",
    "Hmm, what am I in the mood for...", "What's fresh?",
  ],
  LOOKING_GREETED: [
    "Hmm, still deciding...", "Almost there...",
    "Give me one more sec...", "Narrowing it down...",
    "Can't decide...", "Everything looks good...",
    "Torn between two...", "Hmm, what to get...",
    "So hard to choose!", "Just about ready...",
    "Between a few options...", "Think I'm close...",
    "Let me see... almost.", "One more look...",
    "Hmm, tough call...", "Really can't decide...",
    "It all sounds good...", "Maybe... no... hmm...",
    "Almost got it...", "Okay, thinking...",
  ],
  READY_TO_ORDER: [
    "I'm ready to order!", "I know what I want!",
    "I'll have something!", "Ready when you are!",
    "Let's do this!", "I've decided!", "Know what I want!",
    "Ready to order!", "I'll take something!", "Got it!",
    "Made up my mind!", "Okay, I'm ready!",
    "Let me get a drink!", "I know what I'm having!",
    "Yep, ready!", "Alright, let's go!", "I'd like to order!",
    "Can I order now?", "I'll have my usual... wait, first time.",
    "Hit me!", "Let's get this started!", "Order time!",
    "I want something good!", "Ready over here!",
  ],
  ORDER_TAKEN: [
    "Thanks, I'll wait.", "Sounds good!", "Awesome, thanks!",
    "Can't wait!", "Great, thanks!", "Perfect!",
    "Looking forward to it!", "Sweet!", "Nice, thanks!",
    "You got it!", "Appreciate it!", "Thanks a lot!",
    "Ooh, excited!", "Can't wait to try it!", "Thanks!",
    "Woohoo!", "That was easy!", "Good choice, right?",
    "Alright!", "Cool, no rush!", "Take your time!",
  ],
  WAITING_FOR_DRINK: [
    "Waiting on my drink...", "How's it coming?",
    "No rush... well, maybe a little.", "Still waiting!",
    "Take your time!", "Is it almost ready?",
    "Getting thirsty over here!", "Patiently waiting...",
    "Any minute now...", "I can almost taste it!",
    "The anticipation!", "Tick tock...", "Still here!",
    "Whenever you're ready!", "No worries, I'll wait.",
    "Starting to get parched...", "My glass is lonely.",
    "Almost there?", "I'm sure it's worth the wait!",
    "The bar looks busy tonight.", "Hope it's a good pour!",
  ],
  ENJOYING: [
    "This is great!", "Mmm, delicious!", "Good stuff!",
    "Exactly what I needed.", "Cheers!", "Really hitting the spot.",
    "Now this is nice.", "Loving it!", "Ahh, perfect.",
    "Great pour!", "Just right!", "Smooth!",
    "Can't complain!", "This is the life.", "Wonderful!",
    "Tastes amazing!", "You nailed it!", "So good.",
    "Best drink I've had all week.", "Heaven in a glass.",
    "Brilliant!", "Spot on!", "Mmm!",
    "This is why I came here!", "Pure perfection.",
  ],
  WANTS_ANOTHER: [
    "I'd like another one!", "Another round!", "Hit me again!",
    "Same again, please!", "One more!", "Keep 'em coming!",
    "Can I get another?", "That was too good to stop!",
    "Round two!", "I'll have another!", "More please!",
    "Refill?", "Another one of those!", "Don't stop now!",
    "Same thing again!", "I could go for one more.",
    "You talked me into another.", "Why not, one more!",
    "Let's keep this going!", "Encore!",
    "That didn't last long!", "I need a sequel!",
  ],
  READY_TO_PAY: [
    "Check, please!", "I'm ready to close out.", "Tab please!",
    "Can I get the bill?", "Time to settle up!",
    "What do I owe?", "I should probably pay up.",
    "Bill me!", "Let me get the check.", "Closing time for me!",
    "Ring me up!", "How much do I owe?", "I'll take my check.",
    "Better pay before I order more!", "Check time!",
    "I need to head out.", "Gotta run, check please!",
    "Can you close me out?", "What's the damage?",
    "Time to pay the piper!", "Let's square up!",
  ],
  REVIEWING_CHECK: [
    "Let me look at this...", "Hmm, let me see...",
    "One moment...", "Checking the total...",
    "Let me review this...", "Alright, let's see...",
    "Going over the bill...", "Math time...",
    "Looks about right...", "Just double-checking...",
    "Hmm hmm hmm...", "Adding it up...",
    "Okay let me see here...", "Just a sec...",
    "Let me make sure...", "Reading the fine print...",
    "Seems fair...", "Yep, looks good...",
    "Everything checks out...", "Alright alright...",
  ],
  HAS_CHECK: [
    "Let me finish this drink first...",
    "I'm still enjoying this!", "Hold on, not done yet!",
    "Almost finished!", "Just a few more sips...",
    "Can't rush a good drink!", "Nearly there...",
    "One sec, savoring this.", "Let me finish up.",
    "Don't rush me!", "Patience, almost done!",
    "The best part is the last sip.", "Getting there...",
    "Just wrapping up!", "Give me a minute to finish.",
    "So close to done...", "Last few sips!",
    "Can't waste a drop!", "Finishing up, promise!",
    "The check can wait, this can't!",
  ],
};

function _pick(pool, guestId) {
  const tick = Math.floor(Date.now() / 10000);
  const idx = (guestId * 7 + tick) % pool.length;
  return pool[idx];
}

// ── Layout derived from game spatial data ──
// The guest sitting PNG is 144×120 (baked at 6× game scale).
// SPRITE_ZOOM is the display multiplier applied via setScale().
// All positions are derived from sprite geometry and bar overlap rules
// so they stay correct if art or layout constants change.
const SPRITE_ZOOM = 2.0;
const PNG_W = 144;
const PNG_H = GUEST_SIT_SCREEN_H; // 120 at 6×
const DISPLAY_H = PNG_H * SPRITE_ZOOM;  // 240px on screen

// Hands-on-bar position: GUEST_BAR_OVERLAP_PX is the Y from sprite top
// where hands begin (at 6× scale). Scale it by SPRITE_ZOOM for modal.
const HANDS_FROM_TOP = GUEST_BAR_OVERLAP_PX * SPRITE_ZOOM;    // 216px from sprite top
const HANDS_FROM_BOTTOM = DISPLAY_H - HANDS_FROM_TOP;         // 24px from sprite bottom

// Bar surface visual: full 3-tile depth would be 192px at this zoom — too
// tall for the modal. We show enough to read as a counter (~50px).
const BAR_DEPTH = 50;

const BUBBLE_H = 60;
const DRINK_RENDER_SCALE = 1.8;
const DRINK_SPACING = 40;

export class GuestModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'guest-modal-close', dimAlpha: 0.65 });
    this._guest = null;
    this._msgText = null;
    this._barGfx = null;
    this._carryIcon = null;
    this._debugGfx = null;
    this._itemZones = [];
    this._activeSlide = null;
    this._settledSlide = null;
    this._lastState = null;
    this._lastHasCheck = null;
    this._lastGreeted = null;
    this._lastCarrying = null;
    this._lastDrinkCount = -1;

    // Layout positions — computed in _build() from runtime canvas dims
    this._panelW = 0;
    this._panelH = 0;
    this._bubbleW = 0;
    this._bubbleY = 0;
    this._spriteY = 0;
    this._customerY = 0;
    this._barTopY = 0;
    this._barCenterY = 0;
    this._barFrontY = 0;
    this._bartenderY = 0;
  }

  show(guest) {
    this._guest = guest;
    this._lastState = guest.state;
    this._lastHasCheck = guest.hasCheck;
    this._lastGreeted = guest.greeted;
    this._lastCarrying = null;
    this._lastDrinkCount = -1;
    this._activeSlide = null;
    this._settledSlide = null;
    this._contentW = CANVAS_W;
    this._contentH = CANVAS_H;

    const originX = guest.seat?.x ?? guest.x;
    const originY = this.scene.barLayout.barSurfaceY + 5;
    super.show({
      origin: { x: originX, y: originY, w: 24, h: 30 },
    });
  }

  _build() {
    const scene = this.scene;
    const guest = this._guest;

    // ── Compute layout from runtime canvas dims ──
    const pw = CANVAS_W;
    const ph = CANVAS_H;
    this._panelW = pw;
    this._panelH = ph;

    // Content area = everything above the button row (computed by BaseModal).
    const contentAreaTop = -ph / 2;
    const contentAreaBot = this._btnRowY - this._btnH / 2;
    const contentCenterY = (contentAreaTop + contentAreaBot) / 2;

    // Anchor: bar center sits slightly below content center
    const barCenterY = contentCenterY + 60;
    const barTopY = barCenterY - BAR_DEPTH / 2;
    const barFrontY = barCenterY + BAR_DEPTH / 2;
    const customerY = barTopY - 5;
    const bartenderY = barFrontY + 60;
    const spriteY = barTopY - DISPLAY_H / 2 + HANDS_FROM_BOTTOM;
    const bubbleW = pw - 60;
    const bubbleY = spriteY - DISPLAY_H / 2 - BUBBLE_H / 2 - 10;

    this._bubbleW = bubbleW;
    this._bubbleY = bubbleY;
    this._spriteY = spriteY;
    this._customerY = customerY;
    this._barTopY = barTopY;
    this._barCenterY = barCenterY;
    this._barFrontY = barFrontY;
    this._bartenderY = bartenderY;

    // ── Panel background (no border) ──
    this._content.add(
      scene.add.rectangle(0, 0, pw, ph, 0x151525)
        .setInteractive(),
    );

    // ── Speech bubble ──
    this._content.add(
      scene.add.rectangle(0, bubbleY, bubbleW, BUBBLE_H, 0x2a2a3e)
        .setStrokeStyle(1, 0x5a5a7a),
    );

    const message = this._getMessage(guest);
    this._msgText = scene.add.text(
      -bubbleW / 2 + 14, bubbleY - BUBBLE_H / 2 + 12, message, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffd54f',
        wordWrap: { width: bubbleW - 28 },
      },
    );
    this._content.add(this._msgText);

    // ── Guest portrait (intentional display scaling for zoomed view) ──
    const appearanceId = GUEST_APPEARANCE_IDS[guest.id % GUEST_APPEARANCE_IDS.length];
    const seated = guest.state !== GUEST_STATE.LEAVING &&
                   guest.state !== GUEST_STATE.ANGRY_LEAVING &&
                   guest.state !== GUEST_STATE.ARRIVING &&
                   guest.state !== GUEST_STATE.WAITING_FOR_SEAT;
    const spriteKey = seated ? `guest_sitting_${appearanceId}` : `guest_${appearanceId}`;
    const portrait = scene.add.image(0, spriteY, spriteKey)
      .setScale(SPRITE_ZOOM).setOrigin(0.5, 0.5);
    this._content.add(portrait);

    // ── Bar surface band ──
    this._content.add(
      scene.add.rectangle(0, barCenterY, pw - 40, BAR_DEPTH, 0x8B4513)
        .setStrokeStyle(1, 0x5a3a20),
    );

    // ── Bar front edge ──
    this._content.add(
      scene.add.rectangle(0, barFrontY, pw - 40, 2, 0x5a3a20),
    );

    // ── Bar items graphics (redrawn each frame) ──
    this._barGfx = scene.add.graphics();
    this._content.add(this._barGfx);

    this._carryIcon = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this._content.add(this._carryIcon);

    this._drawBarItems();
    this._rebuildItemZones();

    this._debugGfx = scene.add.graphics();
    this._content.add(this._debugGfx);
  }

  _getButtonConfig() {
    const guest = this._guest;
    const right = this._getRightButtonConfig(guest);
    return {
      left: { label: 'Walk Away' },
      right: { label: right.label, enabled: right.enabled, onTap: right.onTap },
    };
  }

  _getRightButtonConfig(guest) {
    if (!guest) return { label: '...', enabled: false, onTap: null };

    switch (guest.state) {
      case GUEST_STATE.SEATED:
      case GUEST_STATE.LOOKING:
        return {
          label: guest.greeted ? "How's it going?" : 'Hey there!',
          enabled: true,
          onTap: () => {
            this.scene.guestManager.acknowledgeAtSeat(this._guest);
            this._requestClose();
          },
        };
      case GUEST_STATE.READY_TO_ORDER:
        return {
          label: 'Got it!',
          enabled: true,
          onTap: () => {
            this.scene.guestManager.acknowledgeAtSeat(this._guest);
            this._requestClose();
          },
        };
      case GUEST_STATE.WAITING_FOR_DRINK:
        return {
          label: 'Coming right up!',
          enabled: true,
          onTap: () => {
            this.scene.guestManager.reassureAtSeat(this._guest);
          },
        };
      case GUEST_STATE.ENJOYING:
        return {
          label: "How's it going?",
          enabled: true,
          onTap: () => {
            this.scene.guestManager.checkInAtSeat(this._guest);
            this._requestClose();
          },
        };
      case GUEST_STATE.WANTS_ANOTHER:
        return {
          label: 'One more!',
          enabled: true,
          onTap: () => {
            this.scene.guestManager.acknowledgeAtSeat(this._guest);
            this._requestClose();
          },
        };
      default:
        return { label: '...', enabled: false, onTap: null };
    }
  }

  _onUpdate(dt) {
    if (!this._guest) return;
    const guest = this._guest;
    const { bartender, barState } = this.scene;

    // Slide animation
    if (this._activeSlide) {
      const elapsed = this.scene.time.now - this._activeSlide.startTime;
      const t = Math.min(1, elapsed / this._activeSlide.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      this._activeSlide.currentY = this._activeSlide.startY +
        (this._activeSlide.endY - this._activeSlide.startY) * ease;
      this._activeSlide.currentX = this._activeSlide.startX +
        (this._activeSlide.endX - this._activeSlide.startX) * ease;

      if (t >= 1) {
        this._completeSlide();
      }
    }

    // Settled slide: glass visual held at destination until action completes
    if (this._settledSlide && !bartender.busy) {
      this._settledSlide = null;
      this._rebuildItemZones();
    }

    this._drawBarItems();
    this._drawDebug();

    // Rebuild zones when carried item or drinks change
    const carrying = bartender.carrying;
    const glasses = barState.drinksAtSeats.get(guest.seatId);
    const drinkCount = glasses ? glasses.length : 0;
    if (carrying !== this._lastCarrying || drinkCount !== this._lastDrinkCount) {
      this._lastCarrying = carrying;
      this._lastDrinkCount = drinkCount;
      if (!this._activeSlide && !this._settledSlide) this._rebuildItemZones();
    }

    const stateChanged = guest.state !== this._lastState;
    const checkChanged = guest.hasCheck !== this._lastHasCheck;
    const greetChanged = guest.greeted !== this._lastGreeted;

    if (!stateChanged && !checkChanged && !greetChanged) return;

    this._lastState = guest.state;
    this._lastHasCheck = guest.hasCheck;
    this._lastGreeted = guest.greeted;

    if (this._msgText) {
      this._msgText.setText(this._getMessage(guest));
    }

    this._updateRightButton(this._getRightButtonConfig(guest));
  }

  _drawBarItems() {
    const gfx = this._barGfx;
    if (!gfx) return;
    gfx.clear();
    this._carryIcon.setVisible(false);

    const guest = this._guest;
    if (!guest) return;
    const { barState, bartender } = this.scene;
    const slide = this._activeSlide;
    const settled = this._settledSlide;
    const suppressed = slide || settled;

    // ── Customer side: drinks at this seat ──
    const glasses = barState.drinksAtSeats.get(guest.seatId);
    if (glasses && glasses.length > 0) {
      for (let i = 0; i < glasses.length; i++) {
        if (suppressed && suppressed.side === 'customer' && suppressed.index === i) continue;
        const glass = glasses[i];
        const offsetX = (i - (glasses.length - 1) / 2) * DRINK_SPACING;
        const fillPct = glass.totalFill;
        const color = getLiquidColor(glass.layers);
        drawGlass(gfx, offsetX, this._customerY + 20, glass.glassType, fillPct, color, DRINK_RENDER_SCALE);
      }
    }

    // ── Bartender side: carried item (suppressed during slide/settle) ──
    const carry = bartender.carrying;
    if (carry && !(suppressed && suppressed.side === 'bartender')) {
      if (carry === 'DIRTY_GLASS') {
        this._carryIcon.setTexture('icon_dirty_glass')
          .setPosition(0, this._bartenderY).setVisible(true);
      } else if (carry.startsWith('CHECK_')) {
        this._carryIcon.setTexture('icon_receipt')
          .setPosition(0, this._bartenderY).setVisible(true);
      } else if (carry.startsWith('GLASS_') || carry.startsWith('DRINK_')) {
        const glass = barState.carriedGlass;
        if (glass) {
          const fillPct = glass.totalFill;
          const color = getLiquidColor(glass.layers);
          drawGlass(gfx, 0, this._bartenderY + 20, glass.glassType, fillPct, color, DRINK_RENDER_SCALE);
        }
      }
    }

    // ── Animating or settled item (same snapshot visual throughout) ──
    const visual = slide || settled;
    if (visual) {
      const vx = visual.currentX !== undefined ? visual.currentX : visual.endX;
      const vy = visual.currentY !== undefined ? visual.currentY : visual.endY;
      if (visual.glassType) {
        drawGlass(gfx, vx, vy + 20, visual.glassType, visual.fillPct, visual.fillColor, DRINK_RENDER_SCALE);
      } else if (visual.iconKey) {
        this._carryIcon.setTexture(visual.iconKey)
          .setPosition(vx, vy).setVisible(true);
      }
    }
  }

  // ── Interactive zones ──

  _clearItemZones() {
    for (const z of this._itemZones) {
      z.destroy();
      this._content.remove(z);
    }
    this._itemZones = [];
  }

  _rebuildItemZones() {
    this._clearItemZones();
    if (this._activeSlide || this._settledSlide) return;

    const guest = this._guest;
    if (!guest) return;
    const { barState, bartender } = this.scene;
    const scene = this.scene;

    // Customer side: tappable empty glasses (slide down = pickup)
    const glasses = barState.drinksAtSeats.get(guest.seatId);
    if (glasses && glasses.length > 0) {
      for (let i = 0; i < glasses.length; i++) {
        const glass = glasses[i];
        const isEmpty = glass.layers.reduce((s, l) => s + l.amount, 0) < 0.01;
        if (!isEmpty) continue;
        if (bartender.carrying && bartender.carrying !== 'DIRTY_GLASS') continue;

        const offsetX = (i - (glasses.length - 1) / 2) * DRINK_SPACING;
        const zone = scene.add.rectangle(offsetX, this._customerY, 50, 50, 0x44ff44, 0.08)
          .setStrokeStyle(1, 0x44ff44, 0.3)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this._startSlide('customer', i));
        this._content.add(zone);
        this._itemZones.push(zone);
      }
    }

    // Bartender side: tappable carried item (slide up = serve/give)
    const carry = bartender.carrying;
    if (carry && !bartender.busy) {
      const zone = scene.add.rectangle(0, this._bartenderY, 60, 50, 0x4488ff, 0.08)
        .setStrokeStyle(1, 0x4488ff, 0.3)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this._startSlide('bartender', 0));
      this._content.add(zone);
      this._itemZones.push(zone);
    }
  }

  // ── Slide animation ──

  _startSlide(side, index) {
    if (this._activeSlide || this._settledSlide || this._closing) return;
    const { barState, bartender } = this.scene;

    let slideData = null;

    if (side === 'bartender') {
      const carry = bartender.carrying;
      if (!carry) return;

      const startX = 0;
      const startY = this._bartenderY;

      if (carry.startsWith('GLASS_') || carry.startsWith('DRINK_')) {
        const glass = barState.carriedGlass;
        if (!glass) return;
        const existing = barState.drinksAtSeats.get(this._guest.seatId);
        const count = existing ? existing.length : 0;
        const endX = (count - count / 2) * DRINK_SPACING;
        slideData = {
          side, index,
          startX, startY, endX, endY: this._customerY,
          currentX: startX, currentY: startY,
          startTime: this.scene.time.now, duration: 300,
          action: 'serve',
          glassType: glass.glassType,
          fillPct: glass.totalFill,
          fillColor: getLiquidColor(glass.layers),
          iconKey: null,
        };
      } else if (carry.startsWith('CHECK_')) {
        slideData = {
          side, index,
          startX, startY, endX: 0, endY: this._customerY,
          currentX: startX, currentY: startY,
          startTime: this.scene.time.now, duration: 300,
          action: 'giveCheck',
          glassType: null, fillPct: 0, fillColor: 0,
          iconKey: 'icon_receipt',
        };
      }
    } else if (side === 'customer') {
      const glasses = barState.drinksAtSeats.get(this._guest.seatId);
      if (!glasses || !glasses[index]) return;
      const glass = glasses[index];

      const startX = (index - (glasses.length - 1) / 2) * DRINK_SPACING;
      slideData = {
        side, index,
        startX, startY: this._customerY, endX: 0, endY: this._bartenderY,
        currentX: startX, currentY: this._customerY,
        startTime: this.scene.time.now, duration: 300,
        action: 'pickup',
        glassType: glass.glassType,
        fillPct: glass.totalFill,
        fillColor: getLiquidColor(glass.layers),
        iconKey: null,
      };
    }

    if (!slideData) return;
    this._activeSlide = slideData;
    this._clearItemZones();
  }

  _completeSlide() {
    const slide = this._activeSlide;
    if (!slide) return;
    this._activeSlide = null;

    // Hold the glass visual at its destination until the bartender action completes
    this._settledSlide = slide;

    const guest = this._guest;
    if (!guest) return;
    const gm = this.scene.guestManager;

    switch (slide.action) {
      case 'serve':     gm.serveAtSeat(guest); break;
      case 'giveCheck': gm.giveCheckAtSeat(guest); break;
      case 'pickup':    gm.pickupGlassAtSeat(guest); break;
    }
  }

  _drawDebug() {
    if (!this._debugGfx || !this._debugEnabled) {
      if (this._debugGfx) this._debugGfx.clear();
      return;
    }
    const g = this._debugGfx;
    g.clear();

    const hw = this._panelW / 2;
    const hh = this._panelH / 2;

    // Sprite actual bounds (magenta)
    const spriteW = PNG_W * SPRITE_ZOOM;
    const spriteH = DISPLAY_H;
    g.lineStyle(2, 0xff33cc, 0.9);
    g.strokeRect(-spriteW / 2, this._spriteY - spriteH / 2, spriteW, spriteH);

    // Panel bounds (cyan)
    g.lineStyle(2, 0x00ffff, 0.8);
    g.strokeRect(-hw, -hh, this._panelW, this._panelH);

    // Speech bubble bounds (yellow)
    g.lineStyle(1, 0xffff00, 0.7);
    g.strokeRect(-this._bubbleW / 2, this._bubbleY - BUBBLE_H / 2, this._bubbleW, BUBBLE_H);

    // Hands-on-bar reference (green)
    const handsY = this._spriteY + spriteH / 2 - HANDS_FROM_BOTTOM;
    g.lineStyle(2, 0x44ff44, 0.9);
    g.lineBetween(-hw + 20, handsY, hw - 20, handsY);

    // Bar surface band (orange)
    const barTop = this._barCenterY - BAR_DEPTH / 2;
    const barBot = this._barCenterY + BAR_DEPTH / 2;
    g.lineStyle(2, 0xffaa00, 0.8);
    g.strokeRect(-(this._panelW - 40) / 2, barTop, this._panelW - 40, BAR_DEPTH);

    // Customer side area (lime)
    g.lineStyle(1, 0xaaff00, 0.4);
    g.lineBetween(-hw + 20, this._customerY, hw - 20, this._customerY);

    // Bar front edge (orange)
    g.lineStyle(1, 0xffaa00, 0.4);
    g.lineBetween(-hw + 20, this._barFrontY, hw - 20, this._barFrontY);

    // Bartender side area (lime)
    g.lineStyle(1, 0xaaff00, 0.4);
    g.lineBetween(-hw + 20, this._bartenderY, hw - 20, this._bartenderY);

    // Interactive zones (yellow)
    g.lineStyle(1, 0xffff00, 0.7);
    for (const zone of this._itemZones) {
      const zx = zone.x - zone.width / 2;
      const zy = zone.y - zone.height / 2;
      g.strokeRect(zx, zy, zone.width, zone.height);
    }

    // Button bounds (from BaseModal)
    const bw = this._btnW;
    const bh = this._btnH;
    g.lineStyle(1, 0xff4444, 0.8);
    g.strokeRect(-bw, this._btnRowY - bh / 2, bw, bh);
    g.lineStyle(1, 0x44ff44, 0.8);
    g.strokeRect(0, this._btnRowY - bh / 2, bw, bh);

    // Slide animation path (magenta)
    if (this._activeSlide) {
      const s = this._activeSlide;
      g.lineStyle(2, 0xff33cc, 0.9);
      g.lineBetween(s.x, s.startY, s.x, s.endY);
      g.fillStyle(0xff33cc, 0.9);
      g.fillCircle(s.x, s.currentY, 4);
    }

    // Y-coordinate readouts
    if (this._debugLabels) {
      for (const lbl of this._debugLabels) {
        lbl.destroy();
        this._content.remove(lbl);
      }
    }
    this._debugLabels = [];
    const style = { fontFamily: 'monospace', fontSize: '9px', color: '#00ffff' };
    const spriteBot = this._spriteY + spriteH / 2;
    const pairs = [
      [-hw + 4, this._bubbleY, `bubble y=${this._bubbleY}`],
      [-hw + 4, this._spriteY - spriteH / 2, `sprite top=${Math.round(this._spriteY - spriteH / 2)}`],
      [-hw + 4, spriteBot, `sprite bot=${Math.round(spriteBot)}`],
      [-hw + 4, handsY, `hands y=${Math.round(handsY)}`],
      [hw - 4, barTop, `bar top=${Math.round(barTop)}`],
      [hw - 4, barBot, `bar bot=${Math.round(barBot)}`],
      [hw - 4, this._customerY, `cust y=${this._customerY}`],
      [hw - 4, this._barFrontY, `front y=${this._barFrontY}`],
      [hw - 4, this._bartenderY, `carry y=${this._bartenderY}`],
      [hw - 4, this._btnRowY, `btns y=${this._btnRowY}`],
    ];
    for (const [lx, ly, txt] of pairs) {
      const isLeft = lx < 0;
      const label = this.scene.add.text(lx, ly, txt, style)
        .setOrigin(isLeft ? 0 : 1, 0.5).setAlpha(0.8);
      this._content.add(label);
      this._debugLabels.push(label);
    }
  }

  _onTeardown() {
    this._guest = null;
    this._msgText = null;
    this._barGfx = null;
    this._carryIcon = null;
    this._debugGfx = null;
    this._debugLabels = null;
    this._activeSlide = null;
    this._settledSlide = null;
    this._clearItemZones();
  }

  _getMessage(guest) {
    if (guest.state === GUEST_STATE.ENJOYING && guest.hasCheck) {
      return _pick(MESSAGES.HAS_CHECK, guest.id);
    }

    switch (guest.state) {
      case GUEST_STATE.SEATED:
        return guest.greeted
          ? _pick(MESSAGES.SEATED_GREETED, guest.id)
          : _pick(MESSAGES.SEATED_NEW, guest.id);
      case GUEST_STATE.LOOKING:
        return guest.greeted
          ? _pick(MESSAGES.LOOKING_GREETED, guest.id)
          : _pick(MESSAGES.LOOKING_NEW, guest.id);
      case GUEST_STATE.READY_TO_ORDER:
        return _pick(MESSAGES.READY_TO_ORDER, guest.id);
      case GUEST_STATE.ORDER_TAKEN:
        return _pick(MESSAGES.ORDER_TAKEN, guest.id);
      case GUEST_STATE.WAITING_FOR_DRINK:
        return _pick(MESSAGES.WAITING_FOR_DRINK, guest.id);
      case GUEST_STATE.ENJOYING:
        return _pick(MESSAGES.ENJOYING, guest.id);
      case GUEST_STATE.WANTS_ANOTHER:
        return _pick(MESSAGES.WANTS_ANOTHER, guest.id);
      case GUEST_STATE.READY_TO_PAY:
        return _pick(MESSAGES.READY_TO_PAY, guest.id);
      case GUEST_STATE.REVIEWING_CHECK:
        return _pick(MESSAGES.REVIEWING_CHECK, guest.id);
      default:
        return '...';
    }
  }
}
