import {
  GUEST_STATE, MOOD_MAX, MOOD_DECAY, MOOD_THRESHOLDS,
  SETTLE_TIME, ENJOY_TIME_MIN, ENJOY_TIME_MAX,
  CHECK_REVIEW_TIME, ORDER_REVEAL_TIME, GUEST_Y, SEATS,
} from '../constants.js';

let nextGuestId = 1;

export class Guest {
  constructor(seatId, guestType, drinkPrefs) {
    this.id = nextGuestId++;
    this.seatId = seatId;
    this.seat = SEATS[seatId];
    this.x = this.seat.x;
    this.y = -30;
    this.targetY = GUEST_Y;
    this.state = GUEST_STATE.ARRIVING;
    this.mood = MOOD_MAX;
    this.guestType = guestType;
    this.drinkPrefs = drinkPrefs;
    this.currentDrink = null;
    this.drinksHad = 0;
    this.maxDrinks = guestType === 'quick' ? 1 : Math.floor(Math.random() * 2) + 2;
    this.patienceMultiplier = guestType === 'quick' ? 0.8 : 1.0;
    this.tipMultiplier = guestType === 'quick' ? 1.0 : 1.2;
    this.stateTimer = 0;
    this.greeted = false;
    this.orderOnNotepad = false;
    this.orderWrittenDown = false; // true if player wrote the order on notepad
    this.orderRevealTimer = 0;    // countdown for showing order above head
    this.cashOnBar = false;  // cash left on the bar after reviewing check
    this.tipAmount = 0;
    this.totalSpent = 0;
    this.checkedIn = false;
    this.seatDirty = false;
  }

  getMoodLabel() {
    if (this.mood >= MOOD_THRESHOLDS.ENTERTAINED) return 'ENTERTAINED';
    if (this.mood >= MOOD_THRESHOLDS.CONTENT) return 'CONTENT';
    if (this.mood >= MOOD_THRESHOLDS.IDLE) return 'IDLE';
    if (this.mood >= MOOD_THRESHOLDS.LOOKING) return 'LOOKING';
    if (this.mood >= MOOD_THRESHOLDS.FRUSTRATED) return 'FRUSTRATED';
    return 'LEAVING';
  }

  getMoodColor() {
    const label = this.getMoodLabel();
    switch (label) {
      case 'ENTERTAINED': return '#4caf50';
      case 'CONTENT': return '#8bc34a';
      case 'IDLE': return '#ffc107';
      case 'LOOKING': return '#ff9800';
      case 'FRUSTRATED': return '#f44336';
      case 'LEAVING': return '#b71c1c';
      default: return '#888';
    }
  }

  getIndicator() {
    switch (this.state) {
      case GUEST_STATE.ARRIVING: return null;
      case GUEST_STATE.SEATED: return this.greeted ? '...' : '👋';
      case GUEST_STATE.READY_TO_ORDER: return '✋';
      case GUEST_STATE.ORDER_TAKEN: return '👍';
      case GUEST_STATE.WAITING_FOR_DRINK: return '⏳';
      case GUEST_STATE.ENJOYING: return '😊';
      case GUEST_STATE.WANTS_ANOTHER: return '🍺?';
      case GUEST_STATE.READY_TO_PAY: return '💵';
      case GUEST_STATE.REVIEWING_CHECK: return '🧾';
      case GUEST_STATE.ANGRY_LEAVING: return '😡';
      default: return null;
    }
  }

  transitionTo(newState) {
    this.state = newState;
    switch (newState) {
      case GUEST_STATE.SEATED:
        this.stateTimer = SETTLE_TIME;
        break;
      case GUEST_STATE.READY_TO_ORDER:
        this.chooseDrink();
        break;
      case GUEST_STATE.ORDER_TAKEN:
        this.stateTimer = 0.5;
        this.orderRevealTimer = ORDER_REVEAL_TIME;
        break;
      case GUEST_STATE.WAITING_FOR_DRINK:
        break;
      case GUEST_STATE.ENJOYING:
        this.stateTimer = ENJOY_TIME_MIN + Math.random() * (ENJOY_TIME_MAX - ENJOY_TIME_MIN);
        this.mood = Math.min(MOOD_MAX, this.mood + 15);
        break;
      case GUEST_STATE.WANTS_ANOTHER:
        this.chooseDrink();
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
        break;
    }
  }

  chooseDrink() {
    const idx = Math.floor(Math.random() * this.drinkPrefs.length);
    this.currentDrink = this.drinkPrefs[idx];
  }

  calculateTip() {
    const moodFraction = Math.max(0, this.mood / MOOD_MAX);
    const baseTip = this.totalSpent * 0.20;
    this.tipAmount = Math.round(baseTip * moodFraction * this.tipMultiplier * 100) / 100;
    if (this.checkedIn) this.tipAmount *= 1.1;
    // Memory bonus — didn't need to write the order down
    if (!this.orderWrittenDown) this.tipAmount *= 1.15;
  }

  update(dt, levelTimer) {
    // Mood decay — skip during grace period
    const decayRate = MOOD_DECAY[this.state] || 0;
    if (decayRate > 0 && levelTimer !== undefined) {
      const graceFactor = Math.min(1, levelTimer / 30);
      this.mood -= decayRate * dt * this.patienceMultiplier * graceFactor;
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
        if (this.stateTimer <= 0 && this.greeted) {
          this.transitionTo(GUEST_STATE.READY_TO_ORDER);
        }
        break;

      case GUEST_STATE.ORDER_TAKEN:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.transitionTo(GUEST_STATE.WAITING_FOR_DRINK);
        }
        break;

      case GUEST_STATE.ENJOYING:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.drinksHad++;
          if (this.drinksHad < this.maxDrinks) {
            this.transitionTo(GUEST_STATE.WANTS_ANOTHER);
          } else {
            this.transitionTo(GUEST_STATE.READY_TO_PAY);
          }
        }
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
