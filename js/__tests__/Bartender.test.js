import { describe, it, expect, beforeEach } from 'vitest';
import { Bartender } from '../entities/Bartender.js';

describe('Bartender', () => {
  let bt;

  beforeEach(() => {
    bt = new Bartender();
  });

  describe('construction', () => {
    it('starts at center of bar', () => {
      expect(bt.x).toBe(480); // BARTENDER_START_X
      expect(bt.carrying).toBeNull();
      expect(bt.busy).toBe(false);
    });
  });

  describe('movement', () => {
    it('moves toward target', () => {
      bt.moveTo(700);
      const startX = bt.x;
      bt.update(0.5);
      expect(bt.x).toBeGreaterThan(startX);
      expect(bt.facingRight).toBe(true);
    });

    it('moves left and sets facingRight false', () => {
      bt.moveTo(100);
      bt.update(0.5);
      expect(bt.x).toBeLessThan(480);
      expect(bt.facingRight).toBe(false);
    });

    it('clamps to bar boundaries', () => {
      bt.moveTo(-100);
      expect(bt.targetX).toBe(30); // BAR_LEFT

      bt.moveTo(2000);
      expect(bt.targetX).toBe(930); // BAR_RIGHT
    });

    it('does not move when busy', () => {
      bt.startAction(1.0, 'Working...', () => {});
      bt.moveTo(700);
      expect(bt.targetX).toBe(480); // didn't change
    });

    it('snaps to target when close', () => {
      bt.moveTo(482); // within 3px
      bt.update(0.1);
      expect(bt.x).toBe(482);
    });
  });

  describe('actions (deferred callbacks)', () => {
    it('action callback fires only after duration elapses', () => {
      let fired = false;
      bt.startAction(1.0, 'Testing...', () => { fired = true; });

      expect(bt.busy).toBe(true);
      expect(bt.busyLabel).toBe('Testing...');

      bt.update(0.5); // half duration
      expect(fired).toBe(false);
      expect(bt.busy).toBe(true);

      bt.update(0.6); // past duration
      expect(fired).toBe(true);
      expect(bt.busy).toBe(false);
      expect(bt.busyLabel).toBe('');
    });

    it('does not move during action', () => {
      bt.startAction(0.5, 'Working...', () => {});
      const startX = bt.x;
      bt.targetX = 800; // set directly to bypass moveTo guard
      bt.update(0.3);
      // Should not have moved — busy takes priority
      expect(bt.x).toBe(startX);
    });

    it('busyDuration tracks total for progress bar', () => {
      bt.startAction(2.0, 'Long task', () => {});
      expect(bt.busyDuration).toBe(2.0);

      bt.update(1.0);
      // busyTimer decreased but busyDuration stays
      expect(bt.busyDuration).toBe(2.0);
      expect(bt.busyTimer).toBeCloseTo(1.0);
    });

    it('callback can modify bartender state', () => {
      bt.startAction(0.1, 'Grabbing...', () => {
        bt.carrying = 'GLASS_PINT';
      });
      bt.update(0.2);
      expect(bt.carrying).toBe('GLASS_PINT');
    });
  });

  describe('utility methods', () => {
    it('isNear detects proximity', () => {
      expect(bt.isNear(490)).toBe(true);  // within 30
      expect(bt.isNear(520)).toBe(false); // beyond 30
      expect(bt.isNear(500, 25)).toBe(true);  // custom threshold
    });

    it('isIdle when not busy and at target', () => {
      expect(bt.isIdle()).toBe(true);

      bt.moveTo(700);
      expect(bt.isIdle()).toBe(false); // has a target

      bt.startAction(1.0, 'Busy', () => {});
      expect(bt.isIdle()).toBe(false); // busy
    });

    it('putDown returns carried item and clears', () => {
      bt.carrying = 'DRINK_GOLD_LAGER';
      const item = bt.putDown();
      expect(item).toBe('DRINK_GOLD_LAGER');
      expect(bt.carrying).toBeNull();
    });

    it('putDown returns null when not carrying', () => {
      expect(bt.putDown()).toBeNull();
    });
  });
});
