import { SEATS, ACTION_DURATIONS } from '../constants.js';

/**
 * BarState — owns the bar's world state and operations on it.
 * Consolidates: dirtySeats, cashOnBar, posTab, serviceMat, drinksAtSeats,
 * and the carry state (carriedGlass + activePour).
 */
export class BarState {
  constructor() {
    this.dirtySeats = new Set();
    this.cashOnBar = new Map();   // seatId → { amount, tipAmount }
    this.posTab = new Map();      // seatId → [{ drink, price }]
    this.serviceMat = [];
    this.drinksAtSeats = new Map(); // seatId → [GlassState, ...]

    // Consolidated carry state
    this.carriedGlass = null;     // GlassState instance or null
    this.activePour = null;       // { drinkKey, pourRate } or null
  }

  /** Backward-compatible carry label for Renderer */
  get carryLabel() {
    if (this.activePour) return `DRINK_${this.activePour.drinkKey}`;
    if (this.carriedGlass) {
      if (this.carriedGlass.primaryDrink) return `DRINK_${this.carriedGlass.primaryDrink}`;
      return `GLASS_${this.carriedGlass.glassType}`;
    }
    return null;
  }

  reset() {
    this.dirtySeats.clear();
    this.cashOnBar.clear();
    this.posTab.clear();
    this.serviceMat = [];
    this.drinksAtSeats.clear();
    this.carriedGlass = null;
    this.activePour = null;
  }

  // ─── CARRY STATE ───────────────────────────────────

  startPour(drinkKey, pourRate) {
    if (!this.carriedGlass) return;
    this.activePour = { drinkKey, pourRate };
  }

  stopPour() {
    this.activePour = null;
  }

  updatePour(dt) {
    if (this.activePour && this.carriedGlass) {
      this.carriedGlass.pour(this.activePour.drinkKey, this.activePour.pourRate * dt);
    }
  }

  // ─── DRINKS AT SEATS ──────────────────────────────

  addDrinkAtSeat(seatId, glass) {
    if (!this.drinksAtSeats.has(seatId)) this.drinksAtSeats.set(seatId, []);
    this.drinksAtSeats.get(seatId).push(glass);
  }

  // ─── SERVICE MAT ──────────────────────────────────

  putDownItem(bartender, hud) {
    if (!bartender.carrying) return;

    if (bartender.carrying.startsWith('DRINK_') || bartender.carrying.startsWith('GLASS_')) {
      const glass = this.carriedGlass;
      if (glass && glass.primaryDrink) {
        this.serviceMat.push({ drinkType: glass.primaryDrink, x: bartender.x, glass });
        hud.showMessage('Put down drink', 1);
      } else if (glass) {
        this.serviceMat.push({ drinkType: null, x: bartender.x, glass });
        hud.showMessage('Put down glass', 1);
      }
      bartender.carrying = null;
      this.carriedGlass = null;
    } else if (bartender.carrying.startsWith('CHECK_')) {
      hud.showMessage("Can't put that down here", 1);
    }
  }

  pickUpDrink(drink, bartender, hud, walkThenAct) {
    if (bartender.carrying) {
      hud.showMessage('Hands full!', 1);
      return;
    }
    walkThenAct(drink.x, () => {
      this.carriedGlass = drink.glass || null;
      if (drink.drinkType) {
        bartender.carrying = `DRINK_${drink.drinkType}`;
      } else if (drink.glass) {
        bartender.carrying = `GLASS_${drink.glass.glassType}`;
      }
      this.serviceMat = this.serviceMat.filter(d => d !== drink);
    });
  }

  // ─── SEAT CLEANUP ─────────────────────────────────

  handleSeatCleanup(seatId, bartender, hud, stats, walkThenAct) {
    const hasCash = this.cashOnBar.has(seatId);
    const hasDirty = this.dirtySeats.has(seatId);

    if (!hasCash && !hasDirty) return;

    if (hasDirty && bartender.carrying && bartender.carrying !== 'DIRTY_GLASS') {
      hud.showMessage('Hands full!', 1);
      return;
    }

    const seatX = SEATS[seatId].x;
    walkThenAct(seatX, () => {
      if (hasCash) {
        bartender.startAction(ACTION_DURATIONS.COLLECT_CASH, 'Collecting...', () => {
          const cash = this.cashOnBar.get(seatId);
          if (cash) {
            hud.tips += cash.tipAmount;
            stats.totalTips += cash.tipAmount;
            this.cashOnBar.delete(seatId);
            hud.showMessage(`+$${cash.tipAmount.toFixed(0)} tip!`, 1.5);
          }
        });
      } else if (hasDirty) {
        bartender.startAction(ACTION_DURATIONS.BUS, 'Clearing...', () => {
          bartender.carrying = 'DIRTY_GLASS';
          this.dirtySeats.delete(seatId);
          this.drinksAtSeats.delete(seatId);
          hud.showMessage('Cleared!', 1);
        });
      }
    });
  }

  // ─── LEVEL END CHECK HELPERS ──────────────────────

  get isEmpty() {
    return this.cashOnBar.size === 0 && this.dirtySeats.size === 0 && this.drinksAtSeats.size === 0;
  }
}
