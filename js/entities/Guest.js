import {
  GUEST_STATE, MOOD_MAX, MOOD_DECAY, MOOD_THRESHOLDS,
  SETTLE_TIME, ENJOY_TIME_MIN, ENJOY_TIME_MAX,
  CHECK_REVIEW_TIME, ORDER_REVEAL_TIME,
} from '../constants.js';

let nextGuestId = 1;

/** Movement speed in pixels/second */
const WALK_SPEED_X = 160;
const WALK_SPEED_Y = 120;

export class Guest {
  constructor(seatId, guestType, drinkPrefs, barLayout) {
    this.id = nextGuestId++;
    this.guestType = guestType;
    this.drinkPrefs = drinkPrefs;
    this.currentDrink = null;
    this.drinksHad = 0;
    this.maxDrinks = guestType === 'quick' ? 1 : Math.floor(Math.random() * 2) + 2;
    this.patience = guestType === 'quick'
      ? 0.6 + Math.random() * 0.3
      : 0.8 + Math.random() * 0.6;
    this.patienceMultiplier = 1 / this.patience;
    this.tipMultiplier = guestType === 'quick' ? 1.0 : 1.2;
    this.wantsWater = drinkPrefs.includes('WATER') || (guestType === 'regular' && Math.random() < 0.25);
    this.knowsOrder = guestType === 'quick' || Math.random() < 0.4;
    this.settings = null;
    this.mood = MOOD_MAX;

    // Layout reference
    this._bl = barLayout;

    // Seat assignment
    this.seatId = seatId;
    if (seatId !== null) {
      this.seat = barLayout.seats[seatId];
      // Start at the door
      this.x = barLayout.doorX;
      this.y = barLayout.doorY;
      this.targetX = this.seat.x;
      this.targetY = barLayout.guestY;
      this._movePhase = 'walk_x'; // walk_x → walk_y → arrived
      this.state = GUEST_STATE.ARRIVING;
    } else {
      this.seat = null;
      this.x = 0;
      this.y = barLayout.waitingY;
      this.targetX = 0;
      this.targetY = barLayout.waitingY;
      this._movePhase = 'none';
      this.state = GUEST_STATE.WAITING_FOR_SEAT;
    }
    this.stateTimer = 0;
    this.enjoyTotal = 0;
    this.greeted = false;
    this.orderOnNotepad = false;
    this.orderWrittenDown = false;
    this.orderRevealTimer = 0;
    this.currentOrder = null;
    this.fulfilledItems = [];
    this.drinksServed = [];
    this.overcharged = false;
    this.cashOnBar = false;
    this.tipAmount = 0;
    this.totalSpent = 0;
    this.checkedIn = false;
    this.seatDirty = false;

    // Sipping
    this.sipInterval = 2.5 + Math.random() * 3.5;
    this.sipAmount = 0.05 + Math.random() * 0.08;
    this.sipTimer = this.sipInterval;
    this.sipDrinkIndex = 0;
    this.sipping = false;
    this.sipAnimTimer = 0;
    this.wasAngry = false;
    this.waitStartTime = 0;
    this.totalWaitTime = 0;
    this.lookingReason = null;
    this.sipAnimProgress = 0;
    this.hasCheck = false;
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
          this.stateTimer = 0.5 + Math.random() * 1.0;
        } else {
          this.stateTimer = (this.settings?.settleTime ?? SETTLE_TIME) * this.patience;
        }
        break;
      case GUEST_STATE.LOOKING:
        break;
      case GUEST_STATE.READY_TO_ORDER:
        this.chooseDrink();
        break;
      case GUEST_STATE.ORDER_TAKEN:
        this.stateTimer = 0.5;
        this.orderRevealTimer = this.settings?.orderRevealTime ?? ORDER_REVEAL_TIME;
        break;
      case GUEST_STATE.WAITING_FOR_DRINK:
        this.waitStartTime = 0;
        break;
      case GUEST_STATE.ENJOYING: {
        const eMin = this.settings?.enjoyTimeMin ?? ENJOY_TIME_MIN;
        const eMax = this.settings?.enjoyTimeMax ?? ENJOY_TIME_MAX;
        const baseTime = eMin + Math.random() * (eMax - eMin);
        this.stateTimer = baseTime * this.patience;
        this.enjoyTotal = this.stateTimer;
        this.mood = Math.min(MOOD_MAX, this.mood + 15);
        this.totalWaitTime += this.waitStartTime;
        break;
      }
      case GUEST_STATE.WANTS_ANOTHER:
        this.stateTimer = 1.5;
        break;
      case GUEST_STATE.READY_TO_PAY:
        break;
      case GUEST_STATE.REVIEWING_CHECK:
        this.stateTimer = CHECK_REVIEW_TIME;
        break;
      case GUEST_STATE.LEAVING:
        // L-shaped departure: walk up to walk lane, then to door, then exit
        this._movePhase = 'walk_y';
        this.targetY = this._bl.guestWalkY;
        this.targetX = this._bl.doorX;
        this.calculateTip();
        this.cashOnBar = true;
        break;
      case GUEST_STATE.ANGRY_LEAVING:
        this._movePhase = 'walk_y';
        this.targetY = this._bl.guestWalkY;
        this.targetX = this._bl.doorX;
        this.tipAmount = 0;
        this.wasAngry = true;
        break;
    }
  }

  assignSeat(seatId) {
    const bl = this._bl;
    this.seatId = seatId;
    this.seat = bl.seats[seatId];
    // Start at door, walk L-shape to seat
    this.x = bl.doorX;
    this.y = bl.doorY;
    this.targetX = this.seat.x;
    this.targetY = bl.guestY;
    this._movePhase = 'walk_x';
    this.state = GUEST_STATE.ARRIVING;
  }

  chooseDrink() {
    const idx = Math.floor(Math.random() * this.drinkPrefs.length);
    this.currentDrink = this.drinkPrefs[idx];

    if (this.wantsWater && this.drinksHad === 0) {
      this.currentOrder = [this.currentDrink, 'WATER'];
    } else {
      this.currentOrder = [this.currentDrink];
    }
    this.fulfilledItems = [];
  }

  calculateTip() {
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
    // Mood decay
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
        this._updateArrival(dt);
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

      case GUEST_STATE.REVIEWING_CHECK:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.transitionTo(GUEST_STATE.LEAVING);
        }
        break;

      case GUEST_STATE.LEAVING:
      case GUEST_STATE.ANGRY_LEAVING:
        this._updateDeparture(dt);
        break;
    }
  }

  // ─── L-SHAPED MOVEMENT ────────────────────────────

  /** Arrival: door → walk_x to seat X → walk_y down to seat Y */
  _updateArrival(dt) {
    if (this._movePhase === 'walk_x') {
      // Walk horizontally at guestWalkY lane
      this.y = this._bl.guestWalkY;
      const dx = this.targetX - this.x;
      if (Math.abs(dx) < 2) {
        this.x = this.targetX;
        this._movePhase = 'walk_y';
      } else {
        this.x += Math.sign(dx) * WALK_SPEED_X * dt;
        if ((dx > 0 && this.x > this.targetX) || (dx < 0 && this.x < this.targetX)) {
          this.x = this.targetX;
        }
      }
    } else if (this._movePhase === 'walk_y') {
      // Walk down to seat
      const dy = this.targetY - this.y;
      if (Math.abs(dy) < 2) {
        this.y = this.targetY;
        this._movePhase = 'none';
        this.transitionTo(GUEST_STATE.SEATED);
      } else {
        this.y += Math.sign(dy) * WALK_SPEED_Y * dt;
        if ((dy > 0 && this.y > this.targetY) || (dy < 0 && this.y < this.targetY)) {
          this.y = this.targetY;
        }
      }
    }
  }

  /** Departure: seat → walk_y up to walk lane → walk_x to door → exit up */
  _updateDeparture(dt) {
    if (this._movePhase === 'walk_y') {
      // Walk up to the walk lane
      const dy = this.targetY - this.y;
      if (Math.abs(dy) < 2) {
        this.y = this.targetY;
        this._movePhase = 'walk_x';
      } else {
        this.y += Math.sign(dy) * WALK_SPEED_Y * dt;
        if ((dy > 0 && this.y > this.targetY) || (dy < 0 && this.y < this.targetY)) {
          this.y = this.targetY;
        }
      }
    } else if (this._movePhase === 'walk_x') {
      // Walk to the door X
      const dx = this.targetX - this.x;
      if (Math.abs(dx) < 2) {
        this.x = this.targetX;
        this._movePhase = 'exit';
      } else {
        this.x += Math.sign(dx) * WALK_SPEED_X * dt;
        if ((dx > 0 && this.x > this.targetX) || (dx < 0 && this.x < this.targetX)) {
          this.x = this.targetX;
        }
      }
    } else if (this._movePhase === 'exit') {
      // Walk up through door and off-screen
      this.y -= WALK_SPEED_Y * dt;
      if (this.y < -40) {
        this.state = GUEST_STATE.DONE;
        this.seatDirty = true;
      }
    }
  }
}
