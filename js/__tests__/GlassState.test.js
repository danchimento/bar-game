import { describe, it, expect, beforeEach } from 'vitest';
import { GlassState } from '../entities/GlassState.js';

describe('GlassState', () => {
  let glass;

  beforeEach(() => {
    glass = new GlassState('PINT');
  });

  describe('construction', () => {
    it('creates empty glass of given type', () => {
      expect(glass.glassType).toBe('PINT');
      expect(glass.layers).toEqual([]);
      expect(glass.ice).toBe(0);
      expect(glass.garnishes).toEqual([]);
      expect(glass.isEmpty).toBe(true);
      expect(glass.totalFill).toBe(0);
      expect(glass.primaryDrink).toBeNull();
    });
  });

  describe('pouring', () => {
    it('adds liquid to glass', () => {
      glass.pour('GOLD_LAGER', 0.5);
      expect(glass.totalFill).toBeCloseTo(0.5);
      expect(glass.primaryDrink).toBe('GOLD_LAGER');
      expect(glass.isEmpty).toBe(false);
    });

    it('merges same drink into one layer', () => {
      glass.pour('GOLD_LAGER', 0.3);
      glass.pour('GOLD_LAGER', 0.2);
      expect(glass.layers.length).toBe(1);
      expect(glass.layers[0].amount).toBeCloseTo(0.5);
    });

    it('creates separate layers for different drinks', () => {
      glass.pour('GOLD_LAGER', 0.3);
      glass.pour('HAZY_IPA', 0.2);
      expect(glass.layers.length).toBe(2);
    });

    it('clamps to capacity and tracks overflow', () => {
      glass.pour('GOLD_LAGER', 0.8);
      glass.pour('GOLD_LAGER', 0.4); // only 0.2 fits
      expect(glass.totalFill).toBeCloseTo(1.0);
      expect(glass.overflow).toBeCloseTo(0.2, 1);
    });

    it('returns 0 for unknown drink', () => {
      const result = glass.pour('FAKE_DRINK', 0.5);
      expect(result).toBe(0);
      expect(glass.totalFill).toBe(0);
    });

    it('primaryDrink returns the drink with most volume', () => {
      glass.pour('GOLD_LAGER', 0.6);
      glass.pour('HAZY_IPA', 0.3);
      expect(glass.primaryDrink).toBe('GOLD_LAGER');
    });
  });

  describe('ice', () => {
    it('adds ice taking up capacity', () => {
      glass.addIce(0.3);
      expect(glass.ice).toBeCloseTo(0.3);
      expect(glass.totalFill).toBeCloseTo(0.3);
      expect(glass.remainingCapacity).toBeCloseTo(0.7);
    });

    it('clamps ice to remaining capacity', () => {
      glass.pour('GOLD_LAGER', 0.9);
      const added = glass.addIce(0.3);
      expect(added).toBeCloseTo(0.1, 1);
      expect(glass.totalFill).toBeCloseTo(1.0);
    });
  });

  describe('garnishes', () => {
    it('adds garnish', () => {
      expect(glass.addGarnish('ORANGE')).toBe(true);
      expect(glass.garnishes).toContain('ORANGE');
    });

    it('rejects duplicate garnish', () => {
      glass.addGarnish('ORANGE');
      expect(glass.addGarnish('ORANGE')).toBe(false);
      expect(glass.garnishes.length).toBe(1);
    });
  });

  describe('dump', () => {
    it('clears all contents', () => {
      glass.pour('GOLD_LAGER', 0.5);
      glass.addIce(0.2);
      glass.addGarnish('LIME');
      glass.dump();
      expect(glass.isEmpty).toBe(true);
      expect(glass.totalFill).toBe(0);
      expect(glass.garnishes).toEqual([]);
    });
  });

  describe('validate', () => {
    it('valid: correct glass, drink, fill', () => {
      glass.pour('GOLD_LAGER', 0.9); // PINT, fillRange [0.85, 1.0]
      const result = glass.validate('GOLD_LAGER');
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('wrong_glass', () => {
      glass.pour('RED_WINE', 0.5); // RED_WINE needs WINE_GLASS
      const result = glass.validate('RED_WINE');
      expect(result.issues).toContain('wrong_glass');
    });

    it('wrong_drink', () => {
      glass.pour('HAZY_IPA', 0.9);
      const result = glass.validate('GOLD_LAGER');
      expect(result.issues).toContain('wrong_drink');
    });

    it('underfilled', () => {
      glass.pour('GOLD_LAGER', 0.5); // min is 0.85
      const result = glass.validate('GOLD_LAGER');
      expect(result.issues).toContain('underfilled');
    });

    it('overfilled (overflow)', () => {
      glass.pour('GOLD_LAGER', 1.0);
      glass.pour('GOLD_LAGER', 0.1); // causes overflow
      const result = glass.validate('GOLD_LAGER');
      expect(result.issues).toContain('overfilled');
    });

    it('missing_garnish', () => {
      // HARVEST_MOON requires ORANGE garnish
      glass.pour('HARVEST_MOON', 0.9);
      const result = glass.validate('HARVEST_MOON');
      expect(result.issues).toContain('missing_garnish');
    });

    it('garnish present passes', () => {
      glass.pour('HARVEST_MOON', 0.9);
      glass.addGarnish('ORANGE');
      const result = glass.validate('HARVEST_MOON');
      expect(result.issues).not.toContain('missing_garnish');
    });

    it('missing_ice for water', () => {
      const cup = new GlassState('PLASTIC_CUP');
      cup.pour('WATER', 0.9);
      const result = cup.validate('WATER');
      expect(result.issues).toContain('missing_ice');
    });

    it('ice present passes for water', () => {
      const cup = new GlassState('PLASTIC_CUP');
      cup.addIce(0.3);
      cup.pour('WATER', 0.6);
      const result = cup.validate('WATER');
      expect(result.issues).not.toContain('missing_ice');
    });

    it('contaminated: too much of another drink', () => {
      glass.pour('GOLD_LAGER', 0.7);
      glass.pour('HAZY_IPA', 0.1);
      const result = glass.validate('GOLD_LAGER');
      expect(result.issues).toContain('contaminated');
    });

    it('small contamination is OK', () => {
      glass.pour('GOLD_LAGER', 0.85);
      glass.pour('HAZY_IPA', 0.03);
      const result = glass.validate('GOLD_LAGER');
      expect(result.issues).not.toContain('contaminated');
    });
  });
});
