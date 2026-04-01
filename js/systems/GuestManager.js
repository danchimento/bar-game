import { GUEST_STATE, ACTION_DURATIONS, MOOD_MAX } from '../constants.js';
import { DRINKS } from '../data/menu.js';
import { Guest } from '../entities/Guest.js';

/**
 * GuestManager — owns guest lifecycle, spawning, interactions, and update orchestration.
 * Receives a context object with shared dependencies from Game.
 */
export class GuestManager {
  constructor() {
    this.guests = [];
    this.spawnIndex = 0;
  }

  /** Set/update the shared context. Called at level start. */
  setContext(ctx) {
    this.ctx = ctx; // { bartender, barState, hud, notepad, stats, settings, radialMenu, walkThenAct, getStations }
  }

  reset() {
    this.guests = [];
    this.spawnIndex = 0;
  }

  // ─── SPAWNING ─────────────────────────────────────

  spawnFromSchedule(levelTimer, schedule, activeDuration) {
    const barClosed = levelTimer >= activeDuration;
    const { settings, barState } = this.ctx;

    // Spawn new guests from schedule — but not after closing time
    if (!barClosed && this.spawnIndex < schedule.length) {
      const next = schedule[this.spawnIndex];
      if (levelTimer >= next.time) {
        const available = this.getAvailableSeats();
        const hasPrep = this.ctx.getStations().some(s => s.id === 'PREP');
        const prefs = hasPrep ? next.drinkPrefs : next.drinkPrefs.filter(d => d !== 'WATER');
        const finalPrefs = prefs.length > 0 ? prefs : next.drinkPrefs;

        if (available.length > 0) {
          const seat = available[Math.floor(Math.random() * available.length)];
          const guest = new Guest(seat.id, next.type, finalPrefs);
          guest.settings = settings;
          if (!hasPrep) guest.wantsWater = false;
          this.guests.push(guest);
        } else {
          // No seat — guest waits behind the bar
          const guest = new Guest(null, next.type, finalPrefs);
          guest.settings = settings;
          if (!hasPrep) guest.wantsWater = false;
          this.guests.push(guest);
          this.positionWaitingGuests();
        }
        this.spawnIndex++;
      }
    }

    // Try to seat waiting guests — or turn them away if bar is closed
    const waiting = this.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
    if (waiting.length > 0) {
      if (barClosed) {
        this.guests = this.guests.filter(g => g.state !== GUEST_STATE.WAITING_FOR_SEAT);
      } else {
        const available = this.getAvailableSeats();
        for (const guest of waiting) {
          if (available.length === 0) break;
          const seat = available.shift();
          guest.assignSeat(seat.id);
        }
      }
      this.positionWaitingGuests();
    }
  }

  getAvailableSeats() {
    const { barState } = this.ctx;
    const occupiedSeats = new Set(
      this.guests.filter(g => g.seatId !== null).map(g => g.seatId)
    );
    return this.ctx.seats.filter(s =>
      !occupiedSeats.has(s.id) && !barState.dirtySeats.has(s.id) && !barState.cashOnBar.has(s.id)
    );
  }

  positionWaitingGuests() {
    const waiting = this.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
    const startX = 480 - (waiting.length - 1) * 40 / 2;
    waiting.forEach((g, i) => {
      g.x = startX + i * 40;
    });
  }

  // ─── UPDATE ───────────────────────────────────────

  updateGuests(dt, levelTimer, activeDuration) {
    const { settings, barState, stats } = this.ctx;

    stats.peakGuests = Math.max(stats.peakGuests, this.guests.length);

    for (const guest of this.guests) {
      guest.update(dt, levelTimer, settings);

      // Sip animation update
      if (guest.sipping) {
        guest.sipAnimTimer -= dt;
        if (guest.sipAnimTimer <= 0) {
          guest.sipping = false;
        }
      }

      // Sip-based drink depletion while enjoying
      if (guest.state === GUEST_STATE.ENJOYING) {
        const glasses = barState.drinksAtSeats.get(guest.seatId);
        if (glasses && glasses.length > 0) {
          guest.sipTimer -= dt;
          if (guest.sipTimer <= 0) {
            guest.sipTimer = guest.sipInterval;
            const idx = guest.sipDrinkIndex % glasses.length;
            const glass = glasses[idx];
            if (glass.layers.length > 0) {
              const remaining = glass.layers.reduce((s, l) => s + l.amount, 0);
              const sip = Math.min(guest.sipAmount, remaining);
              if (remaining > 0 && sip > 0) {
                const scale = (remaining - sip) / remaining;
                for (const layer of glass.layers) {
                  layer.amount *= scale;
                }
              }
              guest.sipping = true;
              guest.sipAnimTimer = 1.0;
            }
            guest.sipDrinkIndex++;
          }
        }

        // Check if all drinks are empty → transition
        const allEmpty = !glasses || glasses.every(g =>
          g.layers.reduce((s, l) => s + l.amount, 0) < 0.01
        );
        if (allEmpty && !guest._doneWithCurrentRound) {
          guest._doneWithCurrentRound = true;
          guest.drinksHad++;
          const barClosed = levelTimer >= activeDuration;
          if (guest.drinksHad < guest.maxDrinks && !barClosed) {
            guest.lookingReason = 'another';
          } else {
            guest.lookingReason = 'check';
          }
          guest.transitionTo(GUEST_STATE.LOOKING);
        }
      }

      // Empty glasses stacking on counter annoy guests
      if (guest.seatId !== null && guest.state !== GUEST_STATE.LEAVING &&
          guest.state !== GUEST_STATE.ANGRY_LEAVING && guest.state !== GUEST_STATE.DONE) {
        const seatGlasses = barState.drinksAtSeats.get(guest.seatId);
        if (seatGlasses) {
          const emptyCount = seatGlasses.filter(g =>
            g.layers.reduce((s, l) => s + l.amount, 0) < 0.01
          ).length;
          if (emptyCount >= 2) {
            guest.mood -= 1.5 * dt * emptyCount;
          }
        }
      }
    }

    // Place cash and mark dirty seat as soon as guest starts leaving
    for (const g of this.guests) {
      if ((g.state === GUEST_STATE.LEAVING || g.state === GUEST_STATE.ANGRY_LEAVING) && !g._itemsPlaced) {
        g._itemsPlaced = true;
        if (g.seatId !== null && barState.drinksAtSeats.has(g.seatId)) {
          barState.dirtySeats.add(g.seatId);
        }
        if (g.cashOnBar && g.totalSpent > 0) {
          barState.cashOnBar.set(g.seatId, {
            amount: g.totalSpent,
            tipAmount: g.tipAmount,
          });
        }
      }
    }

    // Clean up done guests
    this.guests = this.guests.filter(g => {
      if (g.state === GUEST_STATE.DONE) {
        if (g.wasAngry) {
          stats.guestsAngry++;
        } else if (g.drinksServed.length > 0) {
          stats.guestsServed++;
        }
        if (g.totalWaitTime > 0) {
          stats.totalWaitTime += g.totalWaitTime;
          stats.guestsWaited++;
        }
        this.ctx.notepad.removeGuest(g.id);
        this.ctx.posTab.delete(g.seatId);
        return false;
      }
      return true;
    });
  }

  // ─── GUEST INTERACTIONS ───────────────────────────

  openGuestMenu(guest) {
    const options = [];
    const { bartender, barState, radialMenu, walkThenAct } = this.ctx;

    switch (guest.state) {
      case GUEST_STATE.SEATED:
      case GUEST_STATE.LOOKING:
        options.push({ label: 'Check In', icon: '👀', action: () => this.acknowledgeGuest(guest) });
        if (barState.carriedGlass && barState.carriedGlass.primaryDrink) {
          options.push({ label: 'Serve', icon: '🍺', action: () => this.serveAnticipated(guest) });
        }
        break;

      case GUEST_STATE.WAITING_FOR_DRINK:
        if (barState.carriedGlass && barState.carriedGlass.primaryDrink) {
          const nextIdx = guest.currentOrder ? guest.fulfilledItems.length : 0;
          options.push({ label: 'Serve', icon: '🍺', action: () => this.serveDrink(guest, nextIdx) });
        }
        options.push({ label: 'Ask Again', icon: '❓', action: () => this.askOrder(guest) });
        break;

      case GUEST_STATE.ENJOYING:
        options.push({ label: 'Check In', icon: '😊', action: () => this.checkIn(guest) });
        break;

      case GUEST_STATE.WANTS_ANOTHER:
        if (barState.carriedGlass && barState.carriedGlass.primaryDrink) {
          options.push({ label: 'Serve', icon: '🍻', action: () => this.serveAnticipated(guest) });
        }
        break;

      case GUEST_STATE.READY_TO_PAY:
        if (bartender.carrying && bartender.carrying === `CHECK_${guest.seatId}`) {
          options.push({ label: 'Give Check', icon: '🧾', action: () => this.giveCheck(guest) });
        }
        break;
    }

    // Take empty glass — available in any state if there are empties at this seat
    if (guest.seatId !== null && (!bartender.carrying || bartender.carrying === 'DIRTY_GLASS')) {
      const glasses = barState.drinksAtSeats.get(guest.seatId);
      if (glasses) {
        const hasEmpty = glasses.some(g =>
          g.layers.reduce((s, l) => s + l.amount, 0) < 0.01
        );
        if (hasEmpty) {
          options.push({
            label: 'Take Glass', icon: '🫗', action: () => {
              const seatX = guest.seat.x;
              walkThenAct(seatX, () => {
                bartender.startAction(0.3, 'Clearing...', () => {
                  const remaining = glasses.filter(g =>
                    g.layers.reduce((s, l) => s + l.amount, 0) >= 0.01
                  );
                  if (remaining.length > 0) {
                    barState.drinksAtSeats.set(guest.seatId, remaining);
                  } else {
                    barState.drinksAtSeats.delete(guest.seatId);
                  }
                  bartender.carrying = 'DIRTY_GLASS';
                  this.ctx.hud.showMessage('Cleared glass', 0.8);
                });
              });
            },
          });
        }
      }
    }

    if (options.length > 0) {
      radialMenu.open(guest.x, guest.y - 30, options);
    }
  }

  acknowledgeGuest(guest) {
    const { bartender, hud, settings, walkThenAct } = this.ctx;
    const seatX = guest.seat.x;
    walkThenAct(seatX, () => {
      bartender.startAction(ACTION_DURATIONS.GREET, 'Checking in...', () => {
        guest.greeted = true;
        guest.mood = Math.min(MOOD_MAX, guest.mood + 10);

        if (guest.state === GUEST_STATE.SEATED && guest.stateTimer > 0) {
          guest.orderRevealTimer = 2.0;
          hud.showMessage('Still deciding...', 1);
          return;
        }

        const reason = guest.lookingReason || 'first_order';
        switch (reason) {
          case 'first_order':
            guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
            guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
            if (this.ctx.notepad) {
              this.ctx.notepad.addOrder(guest.id, guest.seatId, DRINKS[guest.currentDrink]?.name || guest.currentDrink);
            }
            hud.showMessage(`Order: ${DRINKS[guest.currentDrink]?.name}`, 1.5);
            break;
          case 'another':
            guest.currentOrder = [guest.currentDrink];
            guest.fulfilledItems = [];
            guest.orderRevealTimer = settings?.orderRevealTime ?? 4;
            guest.transitionTo(GUEST_STATE.WANTS_ANOTHER);
            if (this.ctx.notepad) {
              this.ctx.notepad.addOrder(guest.id, guest.seatId, DRINKS[guest.currentDrink]?.name || guest.currentDrink);
            }
            hud.showMessage('Another one!', 1);
            break;
          case 'check':
            guest.transitionTo(GUEST_STATE.READY_TO_PAY);
            hud.showMessage('Wants the check', 1);
            break;
        }
      });
    });
  }

  askOrder(guest) {
    const { bartender, hud, settings, walkThenAct } = this.ctx;
    const seatX = guest.seat.x;
    walkThenAct(seatX, () => {
      bartender.startAction(0.4, 'Asking...', () => {
        guest.orderRevealTimer = settings?.orderRevealTime ?? 4;
        hud.showMessage(`Order: ${DRINKS[guest.currentDrink]?.name}`, 1.5);
      });
    });
  }

  serveDrink(guest, orderIndex = 0) {
    const { bartender, barState, hud, stats, notepad, walkThenAct } = this.ctx;
    const seatX = guest.seat.x;
    walkThenAct(seatX, () => {
      if (!barState.carriedGlass) {
        hud.showMessage('Not carrying a drink!', 1.5);
        return;
      }

      const wantedKey = guest.currentOrder ? guest.currentOrder[orderIndex] : guest.currentDrink;
      const wantedDef = DRINKS[wantedKey];
      const glass = barState.carriedGlass;
      const result = glass.validate(wantedKey);

      bartender.startAction(ACTION_DURATIONS.DELIVER, 'Serving...', () => {
        if (result.valid) {
          barState.addDrinkAtSeat(guest.seatId, glass);
          guest._doneWithCurrentRound = false;
          bartender.carrying = null;
          barState.carriedGlass = null;

          stats.drinksServedCorrect++;
          guest.drinksServed.push(wantedKey);
          guest.totalSpent += wantedDef.price;
          hud.revenue += wantedDef.price;
          notepad.markFulfilled(guest.id);

          if (guest.currentOrder && guest.currentOrder.length > 1) {
            guest.fulfilledItems.push(wantedKey);
            if (guest.fulfilledItems.length >= guest.currentOrder.length) {
              guest.transitionTo(GUEST_STATE.ENJOYING);
              hud.showMessage('Order complete!', 1);
            } else {
              hud.showMessage('Served! More items left', 1.5);
            }
          } else {
            guest.transitionTo(GUEST_STATE.ENJOYING);
            hud.showMessage('Served!', 1);
          }
        } else {
          const issues = result.issues;
          if (issues.includes('wrong_glass') || issues.includes('wrong_drink') || issues.includes('contaminated')) {
            const msg = issues.includes('wrong_glass') ? 'Wrong glass!' :
              issues.includes('wrong_drink') ? 'Wrong drink!' : 'Contaminated!';
            guest.mood -= issues.includes('wrong_drink') || issues.includes('contaminated') ? 25 : 15;
            stats.drinksRejected++;
            hud.showMessage(msg, 1.5);
          } else {
            barState.addDrinkAtSeat(guest.seatId, glass);
            guest._doneWithCurrentRound = false;
            bartender.carrying = null;
            barState.carriedGlass = null;

            let moodPenalty = 0;
            let msg = '';
            if (issues.includes('underfilled')) { moodPenalty = 8; msg = 'Underfilled...'; }
            else if (issues.includes('overfilled')) { moodPenalty = 5; msg = 'Overfilled!'; }
            else if (issues.includes('missing_garnish')) { moodPenalty = 10; msg = 'Missing garnish!'; }
            else if (issues.includes('missing_ice')) { moodPenalty = 8; msg = 'No ice?!'; }
            guest.mood -= moodPenalty;
            stats.drinksServedWithIssues++;

            guest.drinksServed.push(wantedKey);
            guest.totalSpent += wantedDef.price;
            hud.revenue += wantedDef.price;
            if (guest.currentOrder) {
              guest.fulfilledItems.push(wantedKey);
              if (guest.fulfilledItems.length >= guest.currentOrder.length) {
                guest.transitionTo(GUEST_STATE.ENJOYING);
              }
            } else {
              guest.transitionTo(GUEST_STATE.ENJOYING);
            }
            hud.showMessage(msg, 1.5);
          }
        }
      });
    });
  }

  serveAnticipated(guest) {
    const { bartender, barState, hud, stats, walkThenAct } = this.ctx;
    const seatX = guest.seat.x;
    walkThenAct(seatX, () => {
      if (!barState.carriedGlass || !barState.carriedGlass.primaryDrink) {
        hud.showMessage('Not carrying a drink!', 1.5);
        return;
      }

      const glass = barState.carriedGlass;
      if (!guest.currentDrink) guest.chooseDrink();

      const wantedKey = guest.currentDrink;
      const wantedDef = DRINKS[wantedKey];
      const result = glass.validate(wantedKey);

      bartender.startAction(ACTION_DURATIONS.DELIVER, 'Serving...', () => {
        if (result.valid || (!result.issues.includes('wrong_drink') &&
            !result.issues.includes('wrong_glass') && !result.issues.includes('contaminated'))) {
          barState.addDrinkAtSeat(guest.seatId, glass);
          guest._doneWithCurrentRound = false;
          bartender.carrying = null;
          barState.carriedGlass = null;

          guest.drinksServed.push(wantedKey);
          guest.totalSpent += wantedDef.price;
          hud.revenue += wantedDef.price;
          guest.currentOrder = [wantedKey];
          guest.fulfilledItems = [wantedKey];
          guest.greeted = true;

          guest.mood = Math.min(MOOD_MAX, guest.mood + 25);
          guest.transitionTo(GUEST_STATE.ENJOYING);
          hud.showMessage('Read their mind!', 1.5);
          stats.anticipatedCorrect++;
        } else {
          guest.mood -= 15;
          hud.showMessage('Not what they wanted!', 1.5);
          stats.anticipatedWrong++;
        }
      });
    });
  }

  checkIn(guest) {
    const { bartender, hud, walkThenAct } = this.ctx;
    const seatX = guest.seat.x;
    walkThenAct(seatX, () => {
      bartender.startAction(ACTION_DURATIONS.CHECK_IN, 'Checking in...', () => {
        guest.mood = Math.min(MOOD_MAX, guest.mood + 8);
        guest.checkedIn = true;
        hud.showMessage('Checked in!', 1);
      });
    });
  }

  giveCheck(guest) {
    const { bartender, hud, stats, posTab, walkThenAct } = this.ctx;
    const seatX = guest.seat.x;
    walkThenAct(seatX, () => {
      if (bartender.carrying !== `CHECK_${guest.seatId}`) return;
      bartender.startAction(ACTION_DURATIONS.DELIVER, 'Giving check...', () => {
        bartender.carrying = null;

        const tab = posTab.get(guest.seatId) || [];
        const tabTotal = tab.reduce((sum, e) => sum + e.price, 0);
        const servedTotal = guest.totalSpent;

        if (tabTotal > servedTotal) {
          guest.overcharged = true;
          stats.billsOvercharged++;
          hud.showMessage('Overcharged!', 2);
        } else if (tabTotal < servedTotal) {
          const lost = servedTotal - tabTotal;
          hud.revenue -= lost;
          guest.totalSpent = tabTotal;
          stats.billsUndercharged++;
          hud.showMessage('Check delivered', 1);
        } else {
          stats.billsCorrect++;
          hud.showMessage('Check delivered', 1);
        }

        guest.transitionTo(GUEST_STATE.REVIEWING_CHECK);
      });
    });
  }
}
