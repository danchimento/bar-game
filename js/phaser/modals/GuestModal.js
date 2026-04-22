import { GUEST_STATE } from '../../constants.js';
import { GUEST_APPEARANCE_IDS } from '../../data/guestAppearances.js';
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

// ── Layout constants (local coords, centered at 0,0) ──
const PANEL_W = 490;
const PANEL_H = 520;
const BUBBLE_Y = -210;
const BUBBLE_W = PANEL_W - 60;
const BUBBLE_H = 60;
const SPRITE_Y = -90;
const BAR_LINE_Y = -10;
const BAR_BAND_H = 16;
const CUSTOMER_Y = 30;
const BAR_FRONT_Y = 65;
const BARTENDER_Y = 110;
const BTN_ROW_Y = 200;
const BTN_W = 215;
const BTN_H = 50;
const BTN_GAP = 10;
const DRINK_SCALE = 2.5;
const DRINK_SPACING = 60;

export class GuestModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'guest-modal-close', dimAlpha: 0.65 });
    this._guest = null;
    this._msgText = null;
    this._greenBtn = null;
    this._greenLabel = null;
    this._barGfx = null;
    this._carryIcon = null;
    this._itemZones = [];
    this._activeSlide = null;
    this._lastState = null;
    this._lastHasCheck = null;
    this._lastGreeted = null;
    this._lastCarrying = null;
    this._lastDrinkCount = -1;

    this._contentW = PANEL_W;
    this._contentH = PANEL_H;
  }

  show(guest) {
    this._guest = guest;
    this._lastState = guest.state;
    this._lastHasCheck = guest.hasCheck;
    this._lastGreeted = guest.greeted;
    this._lastCarrying = null;
    this._lastDrinkCount = -1;
    this._activeSlide = null;

    const originX = guest.seat?.x ?? guest.x;
    const originY = this.scene.barLayout.barSurfaceY + 5;
    super.show({
      origin: { x: originX, y: originY, w: 24, h: 30 },
    });
  }

  _build() {
    const scene = this.scene;
    const guest = this._guest;

    // ── Panel background ──
    this._content.add(
      scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x151525)
        .setStrokeStyle(2, 0x4a4a6a)
        .setInteractive(),
    );

    // ── Speech bubble ──
    this._content.add(
      scene.add.rectangle(0, BUBBLE_Y, BUBBLE_W, BUBBLE_H, 0x2a2a3e)
        .setStrokeStyle(1, 0x5a5a7a),
    );

    const message = this._getMessage(guest);
    this._msgText = scene.add.text(
      -BUBBLE_W / 2 + 14, BUBBLE_Y - BUBBLE_H / 2 + 12, message, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffd54f',
        wordWrap: { width: BUBBLE_W - 28 },
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
    const portrait = scene.add.image(0, SPRITE_Y, spriteKey)
      .setScale(3.0).setOrigin(0.5, 0.5);
    this._content.add(portrait);

    // ── Bar surface band (Phase 2 will render drinks here) ──
    this._content.add(
      scene.add.rectangle(0, BAR_LINE_Y, PANEL_W - 40, BAR_BAND_H, 0x8B4513)
        .setStrokeStyle(1, 0x5a3a20),
    );

    // ── Bar front edge ──
    this._content.add(
      scene.add.rectangle(0, BAR_FRONT_Y, PANEL_W - 40, 2, 0x5a3a20),
    );

    // ── Bar items graphics (redrawn each frame) ──
    this._barGfx = scene.add.graphics();
    this._content.add(this._barGfx);

    this._carryIcon = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this._content.add(this._carryIcon);

    this._drawBarItems();
    this._rebuildItemZones();

    // ── Button row ──
    this._buildRedButton();
    this._buildGreenButton();
  }

  _buildRedButton() {
    const scene = this.scene;
    const x = -(BTN_W / 2 + BTN_GAP / 2);

    const bg = scene.add.rectangle(x, BTN_ROW_Y, BTN_W, BTN_H, 0x6a2a2a)
      .setStrokeStyle(2, 0x8a4a4a)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x8a3a3a));
    bg.on('pointerout', () => bg.setFillStyle(0x6a2a2a));
    bg.on('pointerdown', () => {
      if (this._closing) return;
      this._requestClose();
    });
    this._content.add(bg);

    this._content.add(
      scene.add.text(x, BTN_ROW_Y, 'Walk Away', {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5),
    );
  }

  _buildGreenButton() {
    const scene = this.scene;
    const x = BTN_W / 2 + BTN_GAP / 2;
    const config = this._getGreenConfig(this._guest);

    const fill = config.enabled ? 0x3a6a3a : 0x2a2a2a;
    const stroke = config.enabled ? 0x5a8a5a : 0x444444;
    const textColor = config.enabled ? '#ffffff' : '#666666';

    const bg = scene.add.rectangle(x, BTN_ROW_Y, BTN_W, BTN_H, fill)
      .setStrokeStyle(2, stroke);
    this._greenBtn = bg;

    if (config.enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x4a8a4a));
      bg.on('pointerout', () => bg.setFillStyle(0x3a6a3a));
      bg.on('pointerdown', () => {
        if (this._closing) return;
        if (config.action) config.action();
      });
    }
    this._content.add(bg);

    this._greenLabel = scene.add.text(x, BTN_ROW_Y, config.label, {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: textColor,
    }).setOrigin(0.5);
    this._content.add(this._greenLabel);
  }

  _rebuildGreenButton() {
    if (this._greenBtn) {
      this._greenBtn.destroy();
      this._content.remove(this._greenBtn);
    }
    if (this._greenLabel) {
      this._greenLabel.destroy();
      this._content.remove(this._greenLabel);
    }
    this._buildGreenButton();
  }

  _getGreenConfig(guest) {
    if (!guest) return { label: '...', enabled: false, action: null };

    switch (guest.state) {
      case GUEST_STATE.SEATED:
      case GUEST_STATE.LOOKING:
        return {
          label: guest.greeted ? "How's it going?" : 'Hey there!',
          enabled: true,
          action: () => {
            this.scene.guestManager.acknowledgeAtSeat(this._guest);
            this._requestClose();
          },
        };
      case GUEST_STATE.READY_TO_ORDER:
        return {
          label: 'Got it!',
          enabled: true,
          action: () => {
            this.scene.guestManager.acknowledgeAtSeat(this._guest);
            this._requestClose();
          },
        };
      case GUEST_STATE.WAITING_FOR_DRINK:
        return {
          label: 'Coming right up!',
          enabled: true,
          action: () => {
            this.scene.guestManager.reassureAtSeat(this._guest);
          },
        };
      case GUEST_STATE.ENJOYING:
        return {
          label: "How's it going?",
          enabled: true,
          action: () => {
            this.scene.guestManager.checkInAtSeat(this._guest);
            this._requestClose();
          },
        };
      case GUEST_STATE.WANTS_ANOTHER:
        return {
          label: 'One more!',
          enabled: true,
          action: () => {
            this.scene.guestManager.acknowledgeAtSeat(this._guest);
            this._requestClose();
          },
        };
      default:
        return { label: '...', enabled: false, action: null };
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

      if (t >= 1) {
        this._completeSlide();
      }
    }

    this._drawBarItems();

    // Rebuild zones when carried item or drinks change
    const carrying = bartender.carrying;
    const glasses = barState.drinksAtSeats.get(guest.seatId);
    const drinkCount = glasses ? glasses.length : 0;
    if (carrying !== this._lastCarrying || drinkCount !== this._lastDrinkCount) {
      this._lastCarrying = carrying;
      this._lastDrinkCount = drinkCount;
      if (!this._activeSlide) this._rebuildItemZones();
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

    this._rebuildGreenButton();
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

    // ── Customer side: drinks at this seat ──
    const glasses = barState.drinksAtSeats.get(guest.seatId);
    if (glasses && glasses.length > 0) {
      for (let i = 0; i < glasses.length; i++) {
        if (slide && slide.side === 'customer' && slide.index === i) continue;
        const glass = glasses[i];
        const offsetX = (i - (glasses.length - 1) / 2) * DRINK_SPACING;
        const fillPct = glass.totalFill;
        const color = getLiquidColor(glass.layers);
        drawGlass(gfx, offsetX, CUSTOMER_Y + 20, glass.glassType, fillPct, color, DRINK_SCALE);
      }
    }

    // ── Bartender side: carried item ──
    const carry = bartender.carrying;
    if (carry && !(slide && slide.side === 'bartender')) {
      if (carry === 'DIRTY_GLASS') {
        this._carryIcon.setTexture('icon_dirty_glass')
          .setPosition(0, BARTENDER_Y).setVisible(true);
      } else if (carry.startsWith('CHECK_')) {
        this._carryIcon.setTexture('icon_receipt')
          .setPosition(0, BARTENDER_Y).setVisible(true);
      } else if (carry.startsWith('GLASS_') || carry.startsWith('DRINK_')) {
        const glass = barState.carriedGlass;
        if (glass) {
          const fillPct = glass.totalFill;
          const color = getLiquidColor(glass.layers);
          drawGlass(gfx, 0, BARTENDER_Y + 20, glass.glassType, fillPct, color, DRINK_SCALE);
        }
      }
    }

    // ── Sliding item ──
    if (slide) {
      const y = slide.currentY;
      if (slide.glassType) {
        drawGlass(gfx, slide.x, y + 20, slide.glassType, slide.fillPct, slide.fillColor, DRINK_SCALE);
      } else if (slide.iconKey) {
        this._carryIcon.setTexture(slide.iconKey)
          .setPosition(slide.x, y).setVisible(true);
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
    if (this._activeSlide) return;

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
        const zone = scene.add.rectangle(offsetX, CUSTOMER_Y, 50, 50, 0x44ff44, 0.08)
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
      const zone = scene.add.rectangle(0, BARTENDER_Y, 60, 50, 0x4488ff, 0.08)
        .setStrokeStyle(1, 0x4488ff, 0.3)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this._startSlide('bartender', 0));
      this._content.add(zone);
      this._itemZones.push(zone);
    }
  }

  // ── Slide animation ──

  _startSlide(side, index) {
    if (this._activeSlide || this._closing) return;
    const { barState, bartender } = this.scene;

    let slideData = null;

    if (side === 'bartender') {
      const carry = bartender.carrying;
      if (!carry) return;

      const startY = BARTENDER_Y;
      const endY = CUSTOMER_Y;
      const x = 0;

      if (carry.startsWith('GLASS_') || carry.startsWith('DRINK_')) {
        const glass = barState.carriedGlass;
        if (!glass) return;
        slideData = {
          side, index, x, startY, endY, currentY: startY,
          startTime: this.scene.time.now, duration: 300,
          glassType: glass.glassType,
          fillPct: glass.totalFill,
          fillColor: getLiquidColor(glass.layers),
          iconKey: null,
        };
      } else if (carry.startsWith('CHECK_')) {
        slideData = {
          side, index, x, startY, endY, currentY: startY,
          startTime: this.scene.time.now, duration: 300,
          glassType: null, fillPct: 0, fillColor: 0,
          iconKey: 'icon_receipt',
        };
      }
    } else if (side === 'customer') {
      const glasses = barState.drinksAtSeats.get(this._guest.seatId);
      if (!glasses || !glasses[index]) return;
      const glass = glasses[index];

      const offsetX = (index - (glasses.length - 1) / 2) * DRINK_SPACING;
      const startY = CUSTOMER_Y;
      const endY = BARTENDER_Y;

      slideData = {
        side, index, x: offsetX, startY, endY, currentY: startY,
        startTime: this.scene.time.now, duration: 300,
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

    const guest = this._guest;
    if (!guest) return;
    const gm = this.scene.guestManager;

    if (slide.side === 'bartender') {
      const carry = this.scene.bartender.carrying;
      if (carry && carry.startsWith('CHECK_')) {
        gm.giveCheckAtSeat(guest);
      } else {
        gm.serveAtSeat(guest);
      }
    } else if (slide.side === 'customer') {
      gm.pickupGlassAtSeat(guest);
    }

    this._rebuildItemZones();
  }

  _onTeardown() {
    this._guest = null;
    this._msgText = null;
    this._greenBtn = null;
    this._greenLabel = null;
    this._barGfx = null;
    this._carryIcon = null;
    this._activeSlide = null;
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
