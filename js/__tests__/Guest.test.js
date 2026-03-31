import { describe, it, expect, beforeEach } from 'vitest';
import { Guest } from '../entities/Guest.js';
import { GUEST_STATE, MOOD_MAX, setSeatCount } from '../constants.js';

// Ensure SEATS is set up before tests
setSeatCount(3);

describe('Guest', () => {
  let guest;

  beforeEach(() => {
    guest = new Guest(0, 'regular', ['GOLD_LAGER', 'HAZY_IPA']);
  });

  describe('construction', () => {
    it('creates with correct initial state', () => {
      expect(guest.seatId).toBe(0);
      expect(guest.guestType).toBe('regular');
      expect(guest.drinkPrefs).toEqual(['GOLD_LAGER', 'HAZY_IPA']);
      expect(guest.state).toBe(GUEST_STATE.ARRIVING);
      expect(guest.mood).toBe(MOOD_MAX);
      expect(guest.drinksHad).toBe(0);
      expect(guest.drinksServed).toEqual([]);
    });

    it('quick guests have 1 max drink', () => {
      const quick = new Guest(1, 'quick', ['GOLD_LAGER']);
      expect(quick.maxDrinks).toBe(1);
    });

    it('regular guests have 2-3 max drinks', () => {
      const reg = new Guest(1, 'regular', ['GOLD_LAGER']);
      expect(reg.maxDrinks).toBeGreaterThanOrEqual(2);
      expect(reg.maxDrinks).toBeLessThanOrEqual(3);
    });

    it('waiting guest (no seat) starts in WAITING_FOR_SEAT', () => {
      const waiting = new Guest(null, 'regular', ['GOLD_LAGER']);
      expect(waiting.state).toBe(GUEST_STATE.WAITING_FOR_SEAT);
      expect(waiting.seatId).toBeNull();
      expect(waiting.seat).toBeNull();
    });

    it('assigns unique incrementing IDs', () => {
      const g1 = new Guest(0, 'quick', ['GOLD_LAGER']);
      const g2 = new Guest(1, 'quick', ['GOLD_LAGER']);
      expect(g2.id).toBe(g1.id + 1);
    });
  });

  describe('state machine - ARRIVING', () => {
    it('moves toward target Y and transitions to SEATED', () => {
      guest.y = -30;
      guest.targetY = 200;
      // Move speed is 120/s, distance ~230, so need ~2s
      // Use small ticks and stop once we arrive
      for (let i = 0; i < 25; i++) {
        if (guest.state !== GUEST_STATE.ARRIVING) break;
        guest.update(0.1, 0, {});
      }
      expect(guest.y).toBe(guest.targetY);
      expect(guest.state).toBe(GUEST_STATE.SEATED);
    });
  });

  describe('state machine - SEATED → LOOKING', () => {
    it('transitions to LOOKING after settle time', () => {
      guest.state = GUEST_STATE.SEATED;
      guest.stateTimer = 1.0;
      guest.knowsOrder = false;

      // Tick past the timer
      guest.update(1.1, 10, {});
      expect(guest.state).toBe(GUEST_STATE.LOOKING);
      expect(guest.lookingReason).toBe('first_order');
    });
  });

  describe('transitionTo', () => {
    it('READY_TO_ORDER chooses a drink', () => {
      guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
      expect(guest.currentDrink).not.toBeNull();
      expect(guest.drinkPrefs).toContain(guest.currentDrink);
    });

    it('ORDER_TAKEN sets reveal timer', () => {
      guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
      guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
      expect(guest.orderRevealTimer).toBeGreaterThan(0);
    });

    it('WAITING_FOR_DRINK resets waitStartTime', () => {
      guest.transitionTo(GUEST_STATE.WAITING_FOR_DRINK);
      expect(guest.waitStartTime).toBe(0);
    });

    it('ENJOYING boosts mood and sets timer', () => {
      guest.mood = 70;
      guest.transitionTo(GUEST_STATE.ENJOYING);
      expect(guest.mood).toBe(85); // +15
      expect(guest.stateTimer).toBeGreaterThan(0);
      expect(guest.enjoyTotal).toBe(guest.stateTimer);
    });

    it('LEAVING calculates tip and sets cash flag', () => {
      guest.totalSpent = 20;
      guest.mood = MOOD_MAX;
      guest.transitionTo(GUEST_STATE.LEAVING);
      expect(guest.cashOnBar).toBe(true);
      expect(guest.tipAmount).toBeGreaterThan(0);
      expect(guest.targetY).toBe(-50);
    });

    it('ANGRY_LEAVING sets zero tip', () => {
      guest.totalSpent = 20;
      guest.transitionTo(GUEST_STATE.ANGRY_LEAVING);
      expect(guest.tipAmount).toBe(0);
      expect(guest.wasAngry).toBe(true);
      expect(guest.targetY).toBe(-50);
    });

    it('REVIEWING_CHECK sets timer', () => {
      guest.transitionTo(GUEST_STATE.REVIEWING_CHECK);
      expect(guest.stateTimer).toBeGreaterThan(0);
    });

    it('WANTS_ANOTHER sets brief timer', () => {
      guest.transitionTo(GUEST_STATE.WANTS_ANOTHER);
      expect(guest.stateTimer).toBe(1.5);
    });
  });

  describe('mood system', () => {
    it('decays mood in WAITING_FOR_DRINK state', () => {
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      const startMood = guest.mood;
      // Tick at levelTimer=60 so grace period is over
      guest.update(1.0, 60, { moodDecayMultiplier: 1.0, gracePeriod: 30 });
      expect(guest.mood).toBeLessThan(startMood);
    });

    it('grace period reduces decay early in the level', () => {
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      const earlyGuest = new Guest(0, 'regular', ['GOLD_LAGER']);
      earlyGuest.state = GUEST_STATE.WAITING_FOR_DRINK;
      earlyGuest.mood = MOOD_MAX;

      const lateGuest = new Guest(1, 'regular', ['GOLD_LAGER']);
      lateGuest.state = GUEST_STATE.WAITING_FOR_DRINK;
      lateGuest.mood = MOOD_MAX;
      lateGuest.patience = earlyGuest.patience; // same patience
      lateGuest.patienceMultiplier = earlyGuest.patienceMultiplier;

      const settings = { moodDecayMultiplier: 1.0, gracePeriod: 60 };
      earlyGuest.update(1.0, 10, settings); // early in level
      lateGuest.update(1.0, 60, settings);  // grace period over

      // Early guest decayed less
      expect(earlyGuest.mood).toBeGreaterThan(lateGuest.mood);
    });

    it('mood recovers during ENJOYING', () => {
      guest.state = GUEST_STATE.ENJOYING;
      guest.mood = 50;
      guest.update(1.0, 60, {});
      expect(guest.mood).toBeGreaterThan(50);
    });

    it('triggers ANGRY_LEAVING when mood hits 0', () => {
      guest.state = GUEST_STATE.WAITING_FOR_DRINK;
      guest.mood = 0.1;
      guest.update(1.0, 60, { moodDecayMultiplier: 10, gracePeriod: 1 });
      expect(guest.state).toBe(GUEST_STATE.ANGRY_LEAVING);
    });

    it('does not angry-leave from LEAVING or DONE states', () => {
      guest.state = GUEST_STATE.LEAVING;
      guest.targetY = -50;
      guest.mood = 0;
      guest.update(0.1, 60, {});
      expect(guest.state).toBe(GUEST_STATE.LEAVING);
    });
  });

  describe('tip calculation', () => {
    it('calculates tip based on mood and spending', () => {
      guest.totalSpent = 20;
      guest.mood = MOOD_MAX;
      guest.calculateTip();
      // base = 20 * 0.20 = 4, moodFraction = 1.0, tipMultiplier for regular = 1.2
      expect(guest.tipAmount).toBeCloseTo(4.8, 1);
    });

    it('zero tip when overcharged', () => {
      guest.totalSpent = 20;
      guest.mood = MOOD_MAX;
      guest.overcharged = true;
      guest.calculateTip();
      expect(guest.tipAmount).toBe(0);
    });

    it('low mood reduces tip', () => {
      guest.totalSpent = 20;
      guest.mood = MOOD_MAX / 2;
      guest.calculateTip();
      const halfMoodTip = guest.tipAmount;

      guest.mood = MOOD_MAX;
      guest.calculateTip();
      const fullMoodTip = guest.tipAmount;

      expect(halfMoodTip).toBeLessThan(fullMoodTip);
    });

    it('checkedIn bonus increases tip', () => {
      guest.totalSpent = 20;
      guest.mood = MOOD_MAX;
      guest.checkedIn = false;
      guest.calculateTip();
      const baseTip = guest.tipAmount;

      guest.checkedIn = true;
      guest.calculateTip();
      expect(guest.tipAmount).toBeGreaterThan(baseTip);
    });
  });

  describe('chooseDrink', () => {
    it('picks from drink preferences', () => {
      guest.chooseDrink();
      expect(guest.drinkPrefs).toContain(guest.currentDrink);
      expect(guest.currentOrder).toContain(guest.currentDrink);
    });

    it('includes water on first drink if wantsWater', () => {
      guest.wantsWater = true;
      guest.drinksHad = 0;
      guest.chooseDrink();
      expect(guest.currentOrder).toContain('WATER');
      expect(guest.currentOrder.length).toBe(2);
    });

    it('no water on subsequent drinks', () => {
      guest.wantsWater = true;
      guest.drinksHad = 1;
      guest.chooseDrink();
      expect(guest.currentOrder).not.toContain('WATER');
    });
  });

  describe('assignSeat', () => {
    it('assigns seat and transitions to ARRIVING', () => {
      const waiting = new Guest(null, 'regular', ['GOLD_LAGER']);
      expect(waiting.state).toBe(GUEST_STATE.WAITING_FOR_SEAT);

      waiting.assignSeat(1);
      expect(waiting.seatId).toBe(1);
      expect(waiting.state).toBe(GUEST_STATE.ARRIVING);
      expect(waiting.seat).toBeDefined();
      expect(waiting.x).toBe(waiting.seat.x);
    });
  });

  describe('getMoodLabel', () => {
    it('returns correct labels for mood ranges', () => {
      guest.mood = 90;
      expect(guest.getMoodLabel()).toBe('ENTERTAINED');

      guest.mood = 65;
      expect(guest.getMoodLabel()).toBe('CONTENT');

      guest.mood = 45;
      expect(guest.getMoodLabel()).toBe('IDLE');

      guest.mood = 25;
      expect(guest.getMoodLabel()).toBe('LOOKING');

      guest.mood = 12;
      expect(guest.getMoodLabel()).toBe('FRUSTRATED');

      guest.mood = 5;
      expect(guest.getMoodLabel()).toBe('LEAVING');
    });
  });

  describe('LEAVING / DONE lifecycle', () => {
    it('LEAVING guest moves up and becomes DONE', () => {
      guest.totalSpent = 10;
      guest.transitionTo(GUEST_STATE.LEAVING);
      expect(guest.state).toBe(GUEST_STATE.LEAVING);

      // Tick until offscreen
      for (let i = 0; i < 30; i++) {
        guest.update(0.1, 60, {});
      }
      expect(guest.state).toBe(GUEST_STATE.DONE);
      expect(guest.seatDirty).toBe(true);
    });

    it('REVIEWING_CHECK → LEAVING after timer', () => {
      guest.totalSpent = 10;
      guest.transitionTo(GUEST_STATE.REVIEWING_CHECK);
      const timer = guest.stateTimer;

      // Tick past the timer
      guest.update(timer + 0.1, 60, {});
      expect(guest.state).toBe(GUEST_STATE.LEAVING);
    });
  });

  describe('ORDER_TAKEN → WAITING_FOR_DRINK', () => {
    it('auto-transitions after short delay', () => {
      guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
      guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
      const timer = guest.stateTimer;

      guest.update(timer + 0.1, 10, {});
      expect(guest.state).toBe(GUEST_STATE.WAITING_FOR_DRINK);
    });
  });

  describe('WAITING_FOR_DRINK accumulates wait time', () => {
    it('tracks waitStartTime via dt', () => {
      guest.transitionTo(GUEST_STATE.WAITING_FOR_DRINK);
      guest.update(2.0, 60, { moodDecayMultiplier: 0, gracePeriod: 1 });
      expect(guest.waitStartTime).toBeCloseTo(2.0, 1);
    });
  });
});
