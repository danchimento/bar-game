import { describe, it, expect, beforeEach } from 'vitest';
import { BarState } from '../systems/BarState.js';
import { GlassState } from '../entities/GlassState.js';
import { setSeatCount } from '../constants.js';

/** Minimal bartender stub */
function makeBartender(x = 480) {
  return {
    x,
    carrying: null,
    busy: false,
    startAction(duration, label, cb) {
      // Immediately complete the action for test simplicity
      cb();
    },
  };
}

/** Minimal HUD stub */
function makeHUD() {
  return {
    tips: 0,
    revenue: 0,
    messages: [],
    showMessage(msg, dur) { this.messages.push(msg); },
  };
}

/** Minimal stats stub */
function makeStats() {
  return { totalTips: 0 };
}

describe('BarState', () => {
  let barState;

  beforeEach(() => {
    setSeatCount(3);
    barState = new BarState();
  });

  describe('initial state', () => {
    it('starts empty', () => {
      expect(barState.dirtySeats.size).toBe(0);
      expect(barState.cashOnBar.size).toBe(0);
      expect(barState.posTab.size).toBe(0);
      expect(barState.serviceMat).toEqual([]);
      expect(barState.drinksAtSeats.size).toBe(0);
      expect(barState.carriedGlass).toBeNull();
      expect(barState.activePour).toBeNull();
      expect(barState.isEmpty).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      barState.dirtySeats.add(0);
      barState.cashOnBar.set(0, { amount: 10, tipAmount: 2 });
      barState.posTab.set(0, [{ drink: 'GOLD_LAGER', price: 7 }]);
      barState.serviceMat.push({ drinkType: 'GOLD_LAGER', x: 300 });
      barState.drinksAtSeats.set(0, [new GlassState('PINT')]);
      barState.carriedGlass = new GlassState('PINT');
      barState.activePour = { drinkKey: 'GOLD_LAGER', pourRate: 0.5 };

      barState.reset();

      expect(barState.dirtySeats.size).toBe(0);
      expect(barState.cashOnBar.size).toBe(0);
      expect(barState.posTab.size).toBe(0);
      expect(barState.serviceMat).toEqual([]);
      expect(barState.drinksAtSeats.size).toBe(0);
      expect(barState.carriedGlass).toBeNull();
      expect(barState.activePour).toBeNull();
    });
  });

  describe('carryLabel', () => {
    it('returns null when empty', () => {
      expect(barState.carryLabel).toBeNull();
    });

    it('returns GLASS_* when carrying empty glass', () => {
      barState.carriedGlass = new GlassState('PINT');
      expect(barState.carryLabel).toBe('GLASS_PINT');
    });

    it('returns DRINK_* when glass has contents', () => {
      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.5);
      barState.carriedGlass = glass;
      expect(barState.carryLabel).toBe('DRINK_GOLD_LAGER');
    });

    it('returns DRINK_* from activePour over glass contents', () => {
      barState.carriedGlass = new GlassState('PINT');
      barState.activePour = { drinkKey: 'HAZY_IPA', pourRate: 0.5 };
      expect(barState.carryLabel).toBe('DRINK_HAZY_IPA');
    });
  });

  describe('pour system', () => {
    it('startPour does nothing without carried glass', () => {
      barState.startPour('GOLD_LAGER', 0.5);
      expect(barState.activePour).toBeNull();
    });

    it('startPour sets activePour when carrying glass', () => {
      barState.carriedGlass = new GlassState('PINT');
      barState.startPour('GOLD_LAGER', 0.5);
      expect(barState.activePour).toEqual({ drinkKey: 'GOLD_LAGER', pourRate: 0.5 });
    });

    it('stopPour clears activePour', () => {
      barState.carriedGlass = new GlassState('PINT');
      barState.startPour('GOLD_LAGER', 0.5);
      barState.stopPour();
      expect(barState.activePour).toBeNull();
    });

    it('updatePour adds liquid to carried glass', () => {
      const glass = new GlassState('PINT');
      barState.carriedGlass = glass;
      barState.startPour('GOLD_LAGER', 1.0); // 1.0 fill per second
      barState.updatePour(0.5); // 0.5 seconds
      expect(glass.totalFill).toBeCloseTo(0.5);
      expect(glass.primaryDrink).toBe('GOLD_LAGER');
    });

    it('updatePour does nothing without activePour', () => {
      barState.carriedGlass = new GlassState('PINT');
      barState.updatePour(1.0);
      expect(barState.carriedGlass.totalFill).toBe(0);
    });
  });

  describe('addDrinkAtSeat', () => {
    it('creates entry for new seat', () => {
      const glass = new GlassState('PINT');
      barState.addDrinkAtSeat(0, glass);
      expect(barState.drinksAtSeats.has(0)).toBe(true);
      expect(barState.drinksAtSeats.get(0)).toEqual([glass]);
    });

    it('appends to existing seat', () => {
      const g1 = new GlassState('PINT');
      const g2 = new GlassState('WINE_GLASS');
      barState.addDrinkAtSeat(0, g1);
      barState.addDrinkAtSeat(0, g2);
      expect(barState.drinksAtSeats.get(0).length).toBe(2);
    });
  });

  describe('putDownItem', () => {
    it('places drink on service mat', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      bt.carrying = 'DRINK_GOLD_LAGER';
      barState.carriedGlass = glass;

      barState.putDownItem(bt, hud);

      expect(barState.serviceMat.length).toBe(1);
      expect(barState.serviceMat[0].drinkType).toBe('GOLD_LAGER');
      expect(bt.carrying).toBeNull();
      expect(barState.carriedGlass).toBeNull();
    });

    it('places empty glass on service mat', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      const glass = new GlassState('PINT');
      bt.carrying = 'GLASS_PINT';
      barState.carriedGlass = glass;

      barState.putDownItem(bt, hud);

      expect(barState.serviceMat.length).toBe(1);
      expect(barState.serviceMat[0].drinkType).toBeNull();
    });

    it('does nothing when not carrying', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      barState.putDownItem(bt, hud);
      expect(barState.serviceMat.length).toBe(0);
    });

    it('refuses to put down a check', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      bt.carrying = 'CHECK_0';
      barState.putDownItem(bt, hud);
      expect(barState.serviceMat.length).toBe(0);
      expect(hud.messages).toContain("Can't put that down here");
    });
  });

  describe('pickUpDrink', () => {
    it('picks up drink from service mat', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.9);
      const drink = { drinkType: 'GOLD_LAGER', x: 300, glass };
      barState.serviceMat.push(drink);

      let walkCalled = false;
      const walkThenAct = (x, cb) => { walkCalled = true; cb(); };

      barState.pickUpDrink(drink, bt, hud, walkThenAct);

      expect(walkCalled).toBe(true);
      expect(bt.carrying).toBe('DRINK_GOLD_LAGER');
      expect(barState.carriedGlass).toBe(glass);
      expect(barState.serviceMat.length).toBe(0);
    });

    it('refuses when hands are full', () => {
      const bt = makeBartender();
      bt.carrying = 'DIRTY_GLASS';
      const hud = makeHUD();
      const drink = { drinkType: 'GOLD_LAGER', x: 300 };

      barState.pickUpDrink(drink, bt, hud, () => {});

      expect(hud.messages).toContain('Hands full!');
    });
  });

  describe('handleSeatCleanup', () => {
    it('collects cash and adds tip', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      const stats = makeStats();
      barState.cashOnBar.set(0, { amount: 10, tipAmount: 2 });

      const walkThenAct = (x, cb) => cb();
      barState.handleSeatCleanup(0, bt, hud, stats, walkThenAct);

      expect(barState.cashOnBar.has(0)).toBe(false);
      expect(hud.tips).toBe(2);
      expect(stats.totalTips).toBe(2);
    });

    it('clears dirty seat and sets carrying to DIRTY_GLASS', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      const stats = makeStats();
      barState.dirtySeats.add(0);

      const walkThenAct = (x, cb) => cb();
      barState.handleSeatCleanup(0, bt, hud, stats, walkThenAct);

      expect(barState.dirtySeats.has(0)).toBe(false);
      expect(bt.carrying).toBe('DIRTY_GLASS');
    });

    it('prioritizes cash over dirty when both present', () => {
      const bt = makeBartender();
      const hud = makeHUD();
      const stats = makeStats();
      barState.cashOnBar.set(0, { amount: 10, tipAmount: 2 });
      barState.dirtySeats.add(0);

      const walkThenAct = (x, cb) => cb();
      barState.handleSeatCleanup(0, bt, hud, stats, walkThenAct);

      // Cash collected first
      expect(barState.cashOnBar.has(0)).toBe(false);
      // Dirty seat still there (handled on next tap)
      expect(barState.dirtySeats.has(0)).toBe(true);
    });

    it('refuses dirty cleanup when hands full with non-dirty item', () => {
      const bt = makeBartender();
      bt.carrying = 'DRINK_GOLD_LAGER';
      const hud = makeHUD();
      const stats = makeStats();
      barState.dirtySeats.add(0);

      const walkThenAct = (x, cb) => cb();
      barState.handleSeatCleanup(0, bt, hud, stats, walkThenAct);

      expect(hud.messages).toContain('Hands full!');
      expect(barState.dirtySeats.has(0)).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('true when no cash, dirty seats, or drinks', () => {
      expect(barState.isEmpty).toBe(true);
    });

    it('false when cash on bar', () => {
      barState.cashOnBar.set(0, { amount: 10, tipAmount: 2 });
      expect(barState.isEmpty).toBe(false);
    });

    it('false when dirty seats', () => {
      barState.dirtySeats.add(0);
      expect(barState.isEmpty).toBe(false);
    });

    it('false when drinks at seats', () => {
      barState.drinksAtSeats.set(0, [new GlassState('PINT')]);
      expect(barState.isEmpty).toBe(false);
    });
  });
});
