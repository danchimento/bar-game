import { describe, it, expect, beforeEach } from 'vitest';
import { GuestManager } from '../systems/GuestManager.js';
import { BarState } from '../systems/BarState.js';
import { GlassState } from '../entities/GlassState.js';
import { GUEST_STATE, setSeatCount, MOOD_MAX } from '../constants.js';

function makeBartender(x = 480) {
  return {
    x,
    carrying: null,
    busy: false,
    moveTo(nx) { this.x = nx; },
    startAction(duration, label, cb) { cb(); },
  };
}

function makeHUD() {
  return {
    tips: 0,
    revenue: 0,
    messages: [],
    showMessage(msg) { this.messages.push(msg); },
  };
}

function makeNotepad() {
  return {
    entries: [],
    removeGuest(id) { this.entries = this.entries.filter(e => e.id !== id); },
    markFulfilled(id) {},
  };
}

function makeStats() {
  return {
    drinksServedCorrect: 0, drinksServedWithIssues: 0, drinksRejected: 0,
    drinksWasted: 0, billsCorrect: 0, billsOvercharged: 0, billsUndercharged: 0,
    guestsServed: 0, guestsAngry: 0, anticipatedCorrect: 0, anticipatedWrong: 0,
    totalWaitTime: 0, guestsWaited: 0, totalTips: 0, peakGuests: 0,
  };
}

function makeRadialMenu() {
  return {
    lastOptions: null,
    open(x, y, options) { this.lastOptions = options; },
    close() { this.lastOptions = null; },
  };
}

function makeContext(overrides = {}) {
  return {
    bartender: makeBartender(),
    barState: new BarState(),
    hud: makeHUD(),
    notepad: makeNotepad(),
    stats: makeStats(),
    settings: { moodDecayMultiplier: 1, gracePeriod: 30, orderRevealTime: 4 },
    seats: setSeatCount(3),
    radialMenu: makeRadialMenu(),
    walkThenAct: (x, cb) => cb(),
    getStations: () => [
      { id: 'TAPS', x: 380 },
      { id: 'PREP', x: 650 },
    ],
    ...overrides,
  };
}

/** Simple schedule: one guest at time 0 */
const simpleSchedule = [
  { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
];

describe('GuestManager', () => {
  let gm;
  let ctx;

  beforeEach(() => {
    gm = new GuestManager();
    ctx = makeContext();
    gm.setContext(ctx);
  });

  describe('reset', () => {
    it('clears guests and spawn index', () => {
      gm.guests.push({});
      gm.spawnIndex = 5;
      gm.reset();
      expect(gm.guests).toEqual([]);
      expect(gm.spawnIndex).toBe(0);
    });
  });

  describe('spawnFromSchedule', () => {
    it('spawns a guest when schedule time is reached', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      expect(gm.guests.length).toBe(1);
      expect(gm.guests[0].state).toBe(GUEST_STATE.ARRIVING);
      expect(gm.guests[0].seatId).not.toBeNull();
      expect(gm.spawnIndex).toBe(1);
    });

    it('does not spawn before schedule time', () => {
      const schedule = [{ time: 10, type: 'quick', drinkPrefs: ['GOLD_LAGER'] }];
      gm.spawnFromSchedule(5, schedule, 300);
      expect(gm.guests.length).toBe(0);
    });

    it('does not spawn after bar closes', () => {
      gm.spawnFromSchedule(301, simpleSchedule, 300);
      expect(gm.guests.length).toBe(0);
    });

    it('queues guests when no seats available', () => {
      const schedule = [
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
      ];
      // Spawn all 4 at time=0 — first 3 get seats, 4th waits
      gm.spawnFromSchedule(0, schedule, 300);
      gm.spawnFromSchedule(0, schedule, 300);
      gm.spawnFromSchedule(0, schedule, 300);
      gm.spawnFromSchedule(0, schedule, 300);
      const waiting = gm.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
      expect(waiting.length).toBe(1);
    });

    it('seats waiting guests when seats free up', () => {
      // Fill all seats
      const schedule = [
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
        { time: 0, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
        { time: 1, type: 'quick', drinkPrefs: ['GOLD_LAGER'] },
      ];
      gm.spawnFromSchedule(0, schedule, 300);
      gm.spawnFromSchedule(0, schedule, 300);
      gm.spawnFromSchedule(0, schedule, 300);
      gm.spawnFromSchedule(1, schedule, 300); // queued

      const waiting = gm.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
      expect(waiting.length).toBe(1);

      // Free a seat by marking guest as DONE
      gm.guests[0].state = GUEST_STATE.DONE;
      gm.guests = gm.guests.filter(g => g.state !== GUEST_STATE.DONE);

      gm.spawnFromSchedule(2, [], 300); // trigger seating check
      const stillWaiting = gm.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
      expect(stillWaiting.length).toBe(0);
    });

    it('dismisses waiting guests after bar closes', () => {
      // Add a waiting guest
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      gm.guests[0].state = GUEST_STATE.WAITING_FOR_SEAT;
      gm.guests[0].seatId = null;

      gm.spawnFromSchedule(301, [], 300); // bar closed
      expect(gm.guests.length).toBe(0);
    });
  });

  describe('getAvailableSeats', () => {
    it('returns all seats when none occupied', () => {
      expect(gm.getAvailableSeats().length).toBe(3);
    });

    it('excludes occupied seats', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const available = gm.getAvailableSeats();
      expect(available.length).toBe(2);
    });

    it('excludes dirty seats', () => {
      ctx.barState.dirtySeats.add(0);
      expect(gm.getAvailableSeats().length).toBe(2);
    });

    it('excludes seats with cash', () => {
      ctx.barState.cashOnBar.set(1, { amount: 10, tipAmount: 2 });
      expect(gm.getAvailableSeats().length).toBe(2);
    });
  });

  describe('updateGuests', () => {
    it('tracks peak guests', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      gm.updateGuests(0.1, 10, 300);
      expect(ctx.stats.peakGuests).toBe(1);
    });

    it('cleans up DONE guests and updates stats', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.DONE;
      guest.wasAngry = true;

      gm.updateGuests(0.1, 10, 300);
      expect(gm.guests.length).toBe(0);
      expect(ctx.stats.guestsAngry).toBe(1);
    });

    it('counts served guests on DONE', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.DONE;
      guest.drinksServed = ['GOLD_LAGER'];

      gm.updateGuests(0.1, 10, 300);
      expect(ctx.stats.guestsServed).toBe(1);
    });

    it('places cash and marks dirty on LEAVING', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.seatId = 0;
      guest.state = GUEST_STATE.LEAVING;
      guest.cashOnBar = true;
      guest.totalSpent = 10;
      guest.tipAmount = 2;

      gm.updateGuests(0.1, 60, 300);

      expect(ctx.barState.dirtySeats.has(0)).toBe(true);
      expect(ctx.barState.cashOnBar.has(0)).toBe(true);
      expect(ctx.barState.cashOnBar.get(0).tipAmount).toBe(2);
    });

    it('depletes drinks via sipping during ENJOYING', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.ENJOYING;
      guest.sipTimer = 0.05; // will trigger after dt=0.1
      guest.sipAmount = 0.1;
      guest.stateTimer = 100;
      guest.enjoyTotal = 100;

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.drinksAtSeats.set(guest.seatId, [glass]);

      const fillBefore = glass.layers.reduce((s, l) => s + l.amount, 0);
      gm.updateGuests(0.1, 60, 300);
      const fillAfter = glass.layers.reduce((s, l) => s + l.amount, 0);

      expect(fillAfter).toBeLessThan(fillBefore);
      expect(guest.sipping).toBe(true);
    });

    it('transitions guest when all drinks empty', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.ENJOYING;
      guest.stateTimer = 100;
      guest.enjoyTotal = 100;
      guest._doneWithCurrentRound = false;
      guest.maxDrinks = 1;
      guest.drinksHad = 0;

      // Empty glass
      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.005); // nearly empty
      ctx.barState.drinksAtSeats.set(0, [glass]);

      gm.updateGuests(0.1, 60, 300);

      expect(guest.drinksHad).toBe(1);
      expect(guest.state).toBe(GUEST_STATE.LOOKING);
      expect(guest.lookingReason).toBe('check');
    });

    it('guest wants another if under maxDrinks', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.guestType = 'regular';
      guest.state = GUEST_STATE.ENJOYING;
      guest.stateTimer = 100;
      guest.enjoyTotal = 100;
      guest._doneWithCurrentRound = false;
      guest.maxDrinks = 3;
      guest.drinksHad = 0;

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.005);
      ctx.barState.drinksAtSeats.set(guest.seatId, [glass]);

      gm.updateGuests(0.1, 60, 300);

      expect(guest.lookingReason).toBe('another');
    });
  });

  describe('serveDrink', () => {
    it('serves correct drink and transitions to ENJOYING', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY; // arrived
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentDrink = 'GOLD_LAGER';
      guest.currentOrder = ['GOLD_LAGER'];
      guest.fulfilledItems = [];

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.carriedGlass = glass;
      ctx.bartender.carrying = 'DRINK_GOLD_LAGER';

      gm.serveDrink(guest, 0);

      expect(guest.state).toBe(GUEST_STATE.ENJOYING);
      expect(guest.drinksServed).toContain('GOLD_LAGER');
      expect(ctx.stats.drinksServedCorrect).toBe(1);
      expect(ctx.hud.revenue).toBe(7); // GOLD_LAGER price
      expect(ctx.barState.carriedGlass).toBeNull();
      expect(ctx.bartender.carrying).toBeNull();
    });

    it('rejects wrong drink type', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentDrink = 'GOLD_LAGER';
      guest.currentOrder = ['GOLD_LAGER'];
      guest.fulfilledItems = [];
      const startMood = guest.mood;

      const glass = new GlassState('PINT');
      glass.pour('HAZY_IPA', 0.9); // wrong drink
      ctx.barState.carriedGlass = glass;
      ctx.bartender.carrying = 'DRINK_HAZY_IPA';

      gm.serveDrink(guest, 0);

      expect(ctx.stats.drinksRejected).toBe(1);
      expect(guest.mood).toBeLessThan(startMood);
      // Player keeps the drink
      expect(ctx.barState.carriedGlass).toBe(glass);
    });

    it('accepts underfilled drink with mood penalty', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentDrink = 'GOLD_LAGER';
      guest.currentOrder = ['GOLD_LAGER'];
      guest.fulfilledItems = [];

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.5); // underfilled (min 0.85)
      ctx.barState.carriedGlass = glass;
      ctx.bartender.carrying = 'DRINK_GOLD_LAGER';

      gm.serveDrink(guest, 0);

      // Drink accepted with issues — placed on bar
      expect(ctx.stats.drinksServedWithIssues).toBe(1);
      expect(ctx.barState.drinksAtSeats.has(guest.seatId)).toBe(true);
      expect(ctx.bartender.carrying).toBeNull();
      // Transitions to ENJOYING (mood penalty + ENJOYING boost may net positive)
      expect(guest.state).toBe(GUEST_STATE.ENJOYING);
    });
  });

  describe('serveAnticipated', () => {
    it('gives mood boost for correct anticipation', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.SEATED;
      guest.mood = 60; // set below max so boost is visible
      guest.currentDrink = 'GOLD_LAGER';

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.carriedGlass = glass;
      ctx.bartender.carrying = 'DRINK_GOLD_LAGER';

      const startMood = guest.mood;
      gm.serveAnticipated(guest);

      expect(guest.state).toBe(GUEST_STATE.ENJOYING);
      expect(guest.mood).toBeGreaterThan(startMood); // +25 anticipation + 15 enjoying
      expect(ctx.stats.anticipatedCorrect).toBe(1);
    });

    it('penalizes wrong anticipation', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.SEATED;
      guest.currentDrink = 'HAZY_IPA';

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.carriedGlass = glass;
      ctx.bartender.carrying = 'DRINK_GOLD_LAGER';

      const startMood = guest.mood;
      gm.serveAnticipated(guest);

      expect(guest.mood).toBeLessThan(startMood);
      expect(ctx.stats.anticipatedWrong).toBe(1);
    });
  });

  describe('acknowledgeGuest', () => {
    it('takes order from LOOKING guest', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.LOOKING;
      guest.lookingReason = 'first_order';

      gm.acknowledgeGuest(guest);

      expect(guest.greeted).toBe(true);
      // Should go through READY_TO_ORDER → ORDER_TAKEN
      expect(guest.state).toBe(GUEST_STATE.ORDER_TAKEN);
      expect(guest.currentDrink).not.toBeNull();
    });

    it('check reason transitions to READY_TO_PAY', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.LOOKING;
      guest.lookingReason = 'check';

      gm.acknowledgeGuest(guest);

      expect(guest.state).toBe(GUEST_STATE.READY_TO_PAY);
    });

    it('another reason transitions to WANTS_ANOTHER', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.LOOKING;
      guest.lookingReason = 'another';
      guest.currentDrink = 'GOLD_LAGER';

      gm.acknowledgeGuest(guest);

      expect(guest.state).toBe(GUEST_STATE.WANTS_ANOTHER);
    });
  });

  describe('giveCheck', () => {
    it('correct bill increments billsCorrect', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.READY_TO_PAY;
      guest.totalSpent = 7;
      const sid = guest.seatId;
      ctx.bartender.carrying = `CHECK_${sid}`;
      ctx.barState.posTab.set(sid, [{ drink: 'GOLD_LAGER', price: 7 }]);

      gm.giveCheck(guest);

      expect(guest.state).toBe(GUEST_STATE.REVIEWING_CHECK);
      expect(ctx.stats.billsCorrect).toBe(1);
    });

    it('overcharged bill flags guest', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.READY_TO_PAY;
      guest.totalSpent = 7;
      const sid = guest.seatId;
      ctx.bartender.carrying = `CHECK_${sid}`;
      ctx.barState.posTab.set(sid, [
        { drink: 'GOLD_LAGER', price: 7 },
        { drink: 'HAZY_IPA', price: 8 }, // extra
      ]);

      gm.giveCheck(guest);

      expect(guest.overcharged).toBe(true);
      expect(ctx.stats.billsOvercharged).toBe(1);
    });

    it('undercharged bill deducts revenue', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.READY_TO_PAY;
      guest.totalSpent = 15;
      ctx.hud.revenue = 15;
      const sid = guest.seatId;
      ctx.bartender.carrying = `CHECK_${sid}`;
      ctx.barState.posTab.set(sid, [{ drink: 'GOLD_LAGER', price: 7 }]);

      gm.giveCheck(guest);

      expect(ctx.hud.revenue).toBe(7); // lost the difference
      expect(ctx.stats.billsUndercharged).toBe(1);
    });
  });

  describe('openGuestMenu', () => {
    it('shows Check In for SEATED guest', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.SEATED;

      gm.openGuestMenu(guest);

      expect(ctx.radialMenu.lastOptions).not.toBeNull();
      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).toContain('Check In');
    });

    it('shows Serve for WAITING_FOR_DRINK when carrying drink', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentOrder = ['GOLD_LAGER'];
      guest.fulfilledItems = [];

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.carriedGlass = glass;

      gm.openGuestMenu(guest);

      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).toContain('Serve');
      expect(labels).toContain('Ask Again');
    });

    it('shows Give Check for READY_TO_PAY when carrying check', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.READY_TO_PAY;
      ctx.bartender.carrying = `CHECK_${guest.seatId}`;

      gm.openGuestMenu(guest);

      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).toContain('Give Check');
    });

    it('shows Take Glass when empty glasses at seat', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.ENJOYING;

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.005); // nearly empty (< 0.01 threshold)
      ctx.barState.drinksAtSeats.set(guest.seatId, [glass]);

      gm.openGuestMenu(guest);

      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).toContain('Take Glass');
    });

    it('Take Glass action removes empties and sets DIRTY_GLASS', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.ENJOYING;

      const emptyGlass = new GlassState('PINT');
      emptyGlass.pour('GOLD_LAGER', 0.005);
      const fullGlass = new GlassState('PINT');
      fullGlass.pour('GOLD_LAGER', 0.9);
      ctx.barState.drinksAtSeats.set(guest.seatId, [emptyGlass, fullGlass]);

      gm.openGuestMenu(guest);

      const takeOpt = ctx.radialMenu.lastOptions.find(o => o.label === 'Take Glass');
      takeOpt.action();

      // Empty removed, full remains
      const remaining = ctx.barState.drinksAtSeats.get(guest.seatId);
      expect(remaining.length).toBe(1);
      expect(remaining[0]).toBe(fullGlass);
      expect(ctx.bartender.carrying).toBe('DIRTY_GLASS');
    });

    it('no Take Glass when no empties', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.ENJOYING;

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9); // full
      ctx.barState.drinksAtSeats.set(guest.seatId, [glass]);

      gm.openGuestMenu(guest);

      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).not.toContain('Take Glass');
    });

    it('shows Check In for ENJOYING guest', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.ENJOYING;

      gm.openGuestMenu(guest);

      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).toContain('Check In');
    });

    it('shows Serve for WANTS_ANOTHER when carrying drink', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.WANTS_ANOTHER;

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.carriedGlass = glass;

      gm.openGuestMenu(guest);

      const labels = ctx.radialMenu.lastOptions.map(o => o.label);
      expect(labels).toContain('Serve');
    });
  });

  describe('multi-item orders', () => {
    it('serves first item and waits for second', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentDrink = 'GOLD_LAGER';
      guest.currentOrder = ['GOLD_LAGER', 'WATER'];
      guest.fulfilledItems = [];

      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      ctx.barState.carriedGlass = glass;
      ctx.bartender.carrying = 'DRINK_GOLD_LAGER';

      gm.serveDrink(guest, 0);

      expect(guest.fulfilledItems).toEqual(['GOLD_LAGER']);
      // Not yet ENJOYING — still waiting for water
      expect(guest.state).toBe(GUEST_STATE.WAITING_FOR_DRINK);
      expect(ctx.hud.messages).toContain('Served! More items left');
    });

    it('completes multi-item order when all fulfilled', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentDrink = 'GOLD_LAGER';
      guest.currentOrder = ['GOLD_LAGER', 'WATER'];
      guest.fulfilledItems = ['GOLD_LAGER']; // first already served

      const cup = new GlassState('PLASTIC_CUP');
      cup.addIce(0.1);
      cup.pour('WATER', 0.85);
      ctx.barState.carriedGlass = cup;
      ctx.bartender.carrying = 'DRINK_WATER';

      gm.serveDrink(guest, 1); // serving second item

      expect(guest.fulfilledItems).toEqual(['GOLD_LAGER', 'WATER']);
      expect(guest.state).toBe(GUEST_STATE.ENJOYING);
      expect(ctx.hud.messages).toContain('Order complete!');
    });
  });

  describe('checkIn', () => {
    it('boosts mood and sets checkedIn flag', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.ENJOYING;
      guest.mood = 70;

      gm.checkIn(guest);

      expect(guest.checkedIn).toBe(true);
      expect(guest.mood).toBe(78); // +8
      expect(ctx.hud.messages).toContain('Checked in!');
    });
  });

  describe('askOrder', () => {
    it('re-reveals order and shows message', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.currentDrink = 'GOLD_LAGER';
      guest.orderRevealTimer = 0; // expired

      gm.askOrder(guest);

      expect(guest.orderRevealTimer).toBeGreaterThan(0);
      expect(ctx.hud.messages.some(m => m.includes('Order:'))).toBe(true);
    });
  });

  describe('updateGuests — empty glass mood penalty', () => {
    it('drains mood when 2+ empty glasses at seat', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.mood = 80;

      const empty1 = new GlassState('PINT');
      empty1.pour('GOLD_LAGER', 0.005);
      const empty2 = new GlassState('PINT');
      empty2.pour('HAZY_IPA', 0.005);
      ctx.barState.drinksAtSeats.set(guest.seatId, [empty1, empty2]);

      gm.updateGuests(1.0, 60, 300);

      // Mood should drop from both regular decay AND empty glass penalty
      expect(guest.mood).toBeLessThan(80);
    });

    it('no extra penalty for 0-1 empty glasses', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;

      const oneEmpty = new GlassState('PINT');
      oneEmpty.pour('GOLD_LAGER', 0.005);
      ctx.barState.drinksAtSeats.set(guest.seatId, [oneEmpty]);

      const moodBefore = guest.mood;
      // Disable normal decay to isolate empty glass effect
      gm.updateGuests(0, 60, 300); // dt=0 means no decay at all

      expect(guest.mood).toBe(moodBefore); // no penalty with just 1 empty
    });
  });

  describe('giveCheck — edge cases', () => {
    it('treats missing POS tab as undercharged', () => {
      gm.spawnFromSchedule(0, simpleSchedule, 300);
      const guest = gm.guests[0];
      guest.y = guest.targetY;
      guest.state = GUEST_STATE.READY_TO_PAY;
      guest.totalSpent = 7;
      ctx.hud.revenue = 7;
      const sid = guest.seatId;
      ctx.bartender.carrying = `CHECK_${sid}`;
      // No posTab entry at all

      gm.giveCheck(guest);

      expect(ctx.stats.billsUndercharged).toBe(1);
      expect(ctx.hud.revenue).toBe(0);
    });
  });
});
