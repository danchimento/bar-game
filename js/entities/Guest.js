import {
  GUEST_STATE, MOOD_MAX, MOOD_DECAY, MOOD_THRESHOLDS,
  SETTLE_TIME, ENJOY_TIME_MIN, ENJOY_TIME_MAX,
  CHECK_REVIEW_TIME, ORDER_REVEAL_TIME, GUEST_Y, WAITING_Y, SEATS,
} from '../constants.js';

let nextGuestId = 1;

export class Guest {
  constructor(seatId, guestType, drinkPrefs) {
    this.id = nextGuestId++;
    this.guestType = guestType;
    this.drinkPrefs = drinkPrefs;
    this.currentDrink = null;
    this.drinksHad = 0;
    this.maxDrinks = guestType === 'quick' ? 1 : Math.floor(Math.random() * 2) + 2;
    // Patience: higher = more patient (waits longer, decays slower)
    // quick guests: 0.6-0.9, regular guests: 0.8-1.4
    this.patience = guestType === 'quick'
      ? 0.6 + Math.random() * 0.3
      : 0.8 + Math.random() * 0.6;
    this.patienceMultiplier = 1 / this.patience; // inverse — patient guests decay slower
    this.tipMultiplier = guestType === 'quick' ? 1.0 : 1.2;
    this.wantsWater = drinkPrefs.includes('WATER') || (guestType === 'regular' && Math.random() < 0.25);
    this.knowsOrder = guestType === 'quick' || Math.random() < 0.4; // some walk in knowing what they want
    this.settings = null; // set by game after creation
    this.mood = MOOD_MAX;

    // Seat assignment — null if waiting for seat
    this.seatId = seatId;
    if (seatId !== null) {
      this.seat = SEATS[seatId];
      this.x = this.seat.x;
      this.y = -30;
      this.targetY = GUEST_Y;
      this.state = GUEST_STATE.ARRIVING;
    } else {
      this.seat = null;
      this.x = 0;  // set by game when positioned in wait line
      this.y = WAITING_Y;
      this.targetY = WAITING_Y;
      this.state = GUEST_STATE.WAITING_FOR_SEAT;
    }
    this.stateTimer = 0;
    this.enjoyTotal = 0;  // total enjoy time for drink progress display
    this.greeted = false;
    this.orderOnNotepad = false;
    this.orderWrittenDown = false; // true if player wrote the order on notepad
    this.orderRevealTimer = 0;    // countdown for showing order above head
    this.currentOrder = null;    // array of drink keys for multi-item orders, or null for single
    this.fulfilledItems = [];    // tracks which items from currentOrder have been served
    this.drinksServed = [];      // record of drinks actually served (drink keys)
    this.overcharged = false;    // true if POS tab was higher than what was served
    this.cashOnBar = false;      // cash left on the bar after reviewing check
    this.tipAmount = 0;
    this.totalSpent = 0;
    this.checkedIn = false;
    this.seatDirty = false;

    // Sipping behavior
    this.sipInterval = 2.5 + Math.random() * 3.5;  // seconds between sips (2.5–6)
    this.sipAmount = 0.05 + Math.random() * 0.08;   // fill amount per sip (0.05–0.13)
    this.sipTimer = this.sipInterval;
    this.sipDrinkIndex = 0;                          // alternates between drinks
    this.sipping = false;                            // true during sip animation
    this.sipAnimTimer = 0;                           // animation countdown (total 1.0s)
    this.wasAngry = false;                           // true if left via ANGRY_LEAVING
    this.waitStartTime = 0;                          // levelTimer when WAITING_FOR_DRINK began
    this.totalWaitTime = 0;                          // accumulated wait time across all rounds
    this.lookingReason = null;                       // 'first_order' | 'another' | 'check'
    this.sipAnimProgress = 0;                        // 0→1→0 glass lift animation
  }

  getMoodLabel() {
    if (this.mood >= MOOD_THRESHOLDS.ENTERTAINED) return 'ENTERTAINED';
    if (this.mood >= MOOD_THRESHOLDS.CONTENT) return 'CONTENT';
    if (this.mood >= MOOD_THRESHOLDS.IDLE) return 'IDLE';
    if (this.mood >= MOOD_THRESHOLDS.LOOKING) return 'LOOKING';
    if (this.mood >= MOOD_THRESHOLDS.FRUSTRATED) return 'FRUSTRATED';
    return 'LEAVING';
  }

  transitionTo(newState) {
    this.state = newState;
    switch (newState) {
      case GUEST_STATE.SEATED:
        if (this.knowsOrder) {
          this.stateTimer = 0.5 + Math.random() * 1.0; // quick decision
        } else {
          this.stateTimer = (this.settings?.settleTime ?? SETTLE_TIME) * this.patience;
        }
        break;
      case GUEST_STATE.LOOKING:
        // lookingReason must be set before calling transitionTo
        break;
      case GUEST_STATE.READY_TO_ORDER:
        this.chooseDrink();
        break;
      case GUEST_STATE.ORDER_TAKEN:
        this.stateTimer = 0.5;
        this.orderRevealTimer = this.settings?.orderRevealTime ?? ORDER_REVEAL_TIME;
        break;
      case GUEST_STATE.WAITING_FOR_DRINK:
        this.waitStartTime = 0; // accumulates via dt in update
        break;
      case GUEST_STATE.ENJOYING: {
        const eMin = this.settings?.enjoyTimeMin ?? ENJOY_TIME_MIN;
        const eMax = this.settings?.enjoyTimeMax ?? ENJOY_TIME_MAX;
        const baseTime = eMin + Math.random() * (eMax - eMin);
        this.stateTimer = baseTime * this.patience;
        this.enjoyTotal = this.stateTimer; // for drink progress indicator
        this.mood = Math.min(MOOD_MAX, this.mood + 15);
        // Record wait time for this round
        this.totalWaitTime += this.waitStartTime;
        break;
      }
      case GUEST_STATE.WANTS_ANOTHER:
        // Brief state — auto-transitions to WAITING_FOR_DRINK
        this.stateTimer = 1.5;
        break;
      case GUEST_STATE.READY_TO_PAY:
        break;
      case GUEST_STATE.REVIEWING_CHECK:
        // Guest reviews the check, then leaves cash and walks out
        this.stateTimer = CHECK_REVIEW_TIME;
        break;
      case GUEST_STATE.LEAVING:
        this.targetY = -50;
        this.calculateTip();
        // Leave cash on the bar
        this.cashOnBar = true;
        break;
      case GUEST_STATE.ANGRY_LEAVING:
        this.targetY = -50;
        this.tipAmount = 0;
        this.wasAngry = true;
        break;
    }
  }

  assignSeat(seatId) {
    this.seatId = seatId;
    this.seat = SEATS[seatId];
    this.x = this.seat.x;
    this.y = -30;
    this.targetY = GUEST_Y;
    this.state = GUEST_STATE.ARRIVING;
  }

  chooseDrink() {
    const idx = Math.floor(Math.random() * this.drinkPrefs.length);
    this.currentDrink = this.drinkPrefs[idx];

    // Build current order — may include extra items like water
    if (this.wantsWater && this.drinksHad === 0) {
      this.currentOrder = [this.currentDrink, 'WATER'];
    } else {
      this.currentOrder = [this.currentDrink];
    }
    this.fulfilledItems = [];
  }

  calculateTip() {
    // Overcharged — no tip
    if (this.overcharged) {
      this.tipAmount = 0;
      return;
    }
    const moodFraction = Math.max(0, this.mood / MOOD_MAX);
    const baseTip = this.totalSpent * 0.20;
    this.tipAmount = Math.round(baseTip * moodFraction * this.tipMultiplier * 100) / 100;
    if (this.checkedIn) this.tipAmount *= 1.1;
  }

  update(dt, levelTimer, settings) {
    // Mood decay — skip during grace period
    const decayRate = MOOD_DECAY[this.state] || 0;
    const decayMult = settings?.moodDecayMultiplier ?? 1;
    const grace = settings?.gracePeriod ?? 30;
    if (decayRate > 0 && levelTimer !== undefined) {
      const graceFactor = Math.min(1, levelTimer / grace);
      this.mood -= decayRate * dt * this.patienceMultiplier * decayMult * graceFactor;
      this.mood = Math.max(0, Math.min(MOOD_MAX, this.mood));
    } else if (decayRate < 0) {
      this.mood -= decayRate * dt;
      this.mood = Math.max(0, Math.min(MOOD_MAX, this.mood));
    }

    // Order reveal countdown
    if (this.orderRevealTimer > 0) {
      this.orderRevealTimer -= dt;
    }

    // Check for angry leaving
    if (this.mood <= 0 && this.state !== GUEST_STATE.LEAVING &&
        this.state !== GUEST_STATE.ANGRY_LEAVING && this.state !== GUEST_STATE.DONE &&
        this.state !== GUEST_STATE.REVIEWING_CHECK) {
      this.transitionTo(GUEST_STATE.ANGRY_LEAVING);
      return;
    }

    switch (this.state) {
      case GUEST_STATE.ARRIVING:
        this.y += 120 * dt;
        if (this.y >= this.targetY) {
          this.y = this.targetY;
          this.transitionTo(GUEST_STATE.SEATED);
        }
        break;

      case GUEST_STATE.SEATED:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.lookingReason = 'first_order';
          this.transitionTo(GUEST_STATE.LOOKING);
        }
        break;

      case GUEST_STATE.ORDER_TAKEN:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.transitionTo(GUEST_STATE.WAITING_FOR_DRINK);
        }
        break;

      case GUEST_STATE.WANTS_ANOTHER:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.transitionTo(GUEST_STATE.WAITING_FOR_DRINK);
        }
        break;

      case GUEST_STATE.WAITING_FOR_DRINK:
        this.waitStartTime += dt;
        break;

      case GUEST_STATE.ENJOYING:
        // Transition is handled by Game.js when drinks are empty
        break;

      case GUEST_STATE.REVIEWING_CHECK:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          // Guest leaves cash and walks out
          this.transitionTo(GUEST_STATE.LEAVING);
        }
        break;

      case GUEST_STATE.LEAVING:
      case GUEST_STATE.ANGRY_LEAVING:
        this.y -= 100 * dt;
        if (this.y < -40) {
          this.state = GUEST_STATE.DONE;
          this.seatDirty = true;
        }
        break;
    }
  }
}
