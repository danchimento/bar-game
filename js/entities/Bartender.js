import { BARTENDER_SPEED, BARTENDER_START_X, WALK_TRACK_Y, BAR_LEFT, BAR_RIGHT } from '../constants.js';

export class Bartender {
  constructor() {
    this.x = BARTENDER_START_X;
    this.y = WALK_TRACK_Y;
    this.targetX = this.x;
    this.carrying = null; // null, 'CLEAN_GLASS', 'DIRTY_GLASS', 'DRINK_<type>', 'CHECK_<seatId>'
    this.busy = false;
    this.busyTimer = 0;
    this.busyDuration = 0; // total duration of current action (for progress bar)
    this.busyLabel = '';
    this.onActionComplete = null;
    this.facingRight = true;
  }

  moveTo(x) {
    if (this.busy) return;
    this.targetX = Math.max(BAR_LEFT, Math.min(BAR_RIGHT, x));
  }

  isNear(x, threshold = 30) {
    return Math.abs(this.x - x) < threshold;
  }

  isIdle() {
    return !this.busy && Math.abs(this.x - this.targetX) < 3;
  }

  startAction(duration, label, onComplete) {
    this.busy = true;
    this.busyTimer = duration;
    this.busyDuration = duration;
    this.busyLabel = label;
    this.onActionComplete = onComplete;
  }

  putDown() {
    // Returns whatever was being carried, sets carrying to null
    const item = this.carrying;
    this.carrying = null;
    return item;
  }

  update(dt) {
    if (this.busy) {
      this.busyTimer -= dt;
      if (this.busyTimer <= 0) {
        this.busy = false;
        this.busyLabel = '';
        if (this.onActionComplete) {
          this.onActionComplete();
          this.onActionComplete = null;
        }
      }
      return;
    }

    const dx = this.targetX - this.x;
    if (Math.abs(dx) < 3) {
      this.x = this.targetX;
    } else {
      this.facingRight = dx > 0;
      this.x += Math.sign(dx) * BARTENDER_SPEED * dt;
      if ((dx > 0 && this.x > this.targetX) || (dx < 0 && this.x < this.targetX)) {
        this.x = this.targetX;
      }
    }
  }
}
