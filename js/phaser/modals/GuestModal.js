import { CANVAS_W, CANVAS_H, GUEST_STATE } from '../../constants.js';
import { GUEST_APPEARANCE_IDS } from '../../data/guestAppearances.js';
import { BaseModal } from './BaseModal.js';

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

/** Pick a deterministic-ish message from a pool using guest ID + timestamp */
function _pick(pool, guestId) {
  const tick = Math.floor(Date.now() / 10000);
  const idx = (guestId * 7 + tick) % pool.length;
  return pool[idx];
}

const PANEL_W = 460;
const PANEL_H = 320;
const PX = (CANVAS_W - PANEL_W) / 2;
const PY = (CANVAS_H - PANEL_H) / 2;
const LEFT_W = 160;
const RIGHT_X = PX + LEFT_W + 20;
const RIGHT_W = PANEL_W - LEFT_W - 40;
const BTN_H = 36;
const BTN_GAP = 8;

/**
 * Customer interaction modal.
 * Left: zoomed portrait of the guest.
 * Right: speech bubble message + context-dependent action buttons.
 */
export class GuestModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'guest-modal-close', dimAlpha: 0.65 });
    this._guest = null;
    this._getActions = null;
    this._actions = [];
    this._msgText = null;
    this._btnObjects = [];
    this._lastState = null;
    this._lastHasCheck = null;
    this._lastGreeted = null;
    this._btnStartY = 0;
  }

  show(guest, getActions) {
    this._guest = guest;
    this._getActions = getActions;
    this._actions = typeof getActions === 'function' ? getActions(guest) : (getActions || []);
    this._lastState = guest.state;
    this._lastHasCheck = guest.hasCheck;
    this._lastGreeted = guest.greeted;
    super.show();
  }

  _build() {
    const scene = this.scene;
    const guest = this._guest;

    // Main panel (interactive to block dim clicks)
    this._content.add(
      scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, PANEL_W, PANEL_H, 0x1e1e2e)
        .setStrokeStyle(2, 0x4a4a6a)
        .setInteractive(),
    );

    // ── Left: Guest portrait area ──
    const portraitX = PX + LEFT_W / 2;
    const portraitY = PY + PANEL_H / 2;

    this._content.add(
      scene.add.rectangle(portraitX, portraitY, LEFT_W - 10, PANEL_H - 20, 0x151525)
        .setStrokeStyle(1, 0x3a3a5a),
    );

    const appearanceId = GUEST_APPEARANCE_IDS[guest.id % GUEST_APPEARANCE_IDS.length];
    const seated = guest.state !== GUEST_STATE.LEAVING &&
                   guest.state !== GUEST_STATE.ANGRY_LEAVING &&
                   guest.state !== GUEST_STATE.ARRIVING &&
                   guest.state !== GUEST_STATE.WAITING_FOR_SEAT;
    const spriteKey = seated ? `guest_sitting_${appearanceId}` : `guest_${appearanceId}`;
    const portrait = scene.add.image(portraitX, portraitY + 10, spriteKey)
      .setScale(3.0).setOrigin(0.5, 0.5);
    this._content.add(portrait);

    // ── Right side ──
    let curY = PY + 24;

    const guestLabel = scene.add.text(RIGHT_X, curY, `Customer #${guest.id + 1}`, {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#e0e0e0',
    });
    this._content.add(guestLabel);
    curY += 28;

    // Speech bubble
    const message = this._getMessage(guest);
    const bubbleH = 60;
    this._content.add(
      scene.add.rectangle(RIGHT_X + RIGHT_W / 2, curY + bubbleH / 2, RIGHT_W, bubbleH, 0x2a2a3e)
        .setStrokeStyle(1, 0x5a5a7a),
    );
    this._msgText = scene.add.text(RIGHT_X + 12, curY + 10, message, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffd54f',
      wordWrap: { width: RIGHT_W - 24 },
    });
    this._content.add(this._msgText);
    curY += bubbleH + 16;

    // Action buttons
    this._btnStartY = curY;
    this._btnObjects = [];
    this._buildButtons();

    // Close button
    const closeBtn = scene.add.rectangle(PX + PANEL_W - 22, PY + 16, 26, 22, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._requestClose());
    this._content.add(closeBtn);
    this._content.add(scene.add.text(PX + PANEL_W - 22, PY + 16, 'X', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  _onUpdate(dt) {
    if (!this._guest) return;
    const guest = this._guest;

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

    if (this._getActions && typeof this._getActions === 'function') {
      this._actions = this._getActions(guest);
      this._rebuildButtons();
    }
  }

  _onTeardown() {
    this._guest = null;
    this._getActions = null;
    this._actions = [];
    this._msgText = null;
    this._btnObjects = [];
  }

  _buildButtons() {
    const scene = this.scene;
    let curY = this._btnStartY;
    for (const action of this._actions) {
      const btnY = curY + BTN_H / 2;
      const btnBg = scene.add.rectangle(RIGHT_X + RIGHT_W / 2, btnY, RIGHT_W, BTN_H,
        action.disabled ? 0x2a2a2a : 0x3a5a3a,
      ).setStrokeStyle(1, action.disabled ? 0x444444 : 0x5a8a5a);

      if (!action.disabled) {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerover', () => btnBg.setFillStyle(0x4a7a4a));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0x3a5a3a));
        btnBg.on('pointerdown', () => {
          this._requestClose();
          if (action.action) action.action();
        });
      }

      const btnLabel = scene.add.text(RIGHT_X + RIGHT_W / 2, btnY, action.label, {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
        color: action.disabled ? '#666666' : '#ffffff',
      }).setOrigin(0.5);

      this._content.add(btnBg);
      this._content.add(btnLabel);
      this._btnObjects.push({ bg: btnBg, label: btnLabel });
      curY += BTN_H + BTN_GAP;
    }
  }

  _rebuildButtons() {
    for (const btn of this._btnObjects) {
      btn.bg.destroy();
      btn.label.destroy();
      this._content.remove(btn.bg);
      this._content.remove(btn.label);
    }
    this._btnObjects = [];
    this._buildButtons();
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
        return "...";
    }
  }
}
