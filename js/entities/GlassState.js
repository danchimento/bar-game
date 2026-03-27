import { GLASSES, DRINKS } from '../data/menu.js';

/**
 * Tracks the state of a glass the bartender is holding or that sits on the service mat.
 * A glass has a type (PINT, WINE_GLASS, PLASTIC_CUP), and accumulates contents:
 *   - layers: array of { drinkKey, color, amount } representing poured liquids
 *   - ice: amount of volume occupied by ice (0-0.3 typically)
 *   - garnishes: array of garnish keys
 *
 * Total fill = ice + sum of layer amounts. Capacity is 1.0.
 */
export class GlassState {
  constructor(glassType) {
    this.glassType = glassType;           // 'PINT', 'WINE_GLASS', 'PLASTIC_CUP'
    this.layers = [];                      // [{ drinkKey, color, amount }]
    this.ice = 0;                          // volume taken by ice
    this.garnishes = [];                   // ['ORANGE', 'LIME', ...]
  }

  get totalFill() {
    return this.ice + this.layers.reduce((sum, l) => sum + l.amount, 0);
  }

  get remainingCapacity() {
    return Math.max(0, 1.0 - this.totalFill);
  }

  get isEmpty() {
    return this.layers.length === 0 && this.ice === 0 && this.garnishes.length === 0;
  }

  /** Returns the primary drink key (the one with the most volume), or null */
  get primaryDrink() {
    if (this.layers.length === 0) return null;
    let best = this.layers[0];
    for (const l of this.layers) {
      if (l.amount > best.amount) best = l;
    }
    return best.drinkKey;
  }

  addIce(amount = 0.3) {
    const add = Math.min(amount, this.remainingCapacity);
    this.ice += add;
    return add;
  }

  /**
   * Pour a drink into the glass.
   * @param {string} drinkKey - e.g. 'GOLD_LAGER'
   * @param {number} amount - how much to add (will be clamped to remaining capacity)
   * @returns {number} actual amount added
   */
  pour(drinkKey, amount) {
    const drinkDef = DRINKS[drinkKey];
    if (!drinkDef) return 0;
    const add = Math.min(amount, this.remainingCapacity);
    if (add <= 0) return 0;

    // Merge into existing layer of same drink if present
    const existing = this.layers.find(l => l.drinkKey === drinkKey);
    if (existing) {
      existing.amount += add;
    } else {
      this.layers.push({ drinkKey, color: drinkDef.color, amount: add });
    }
    return add;
  }

  addGarnish(garnishKey) {
    if (!this.garnishes.includes(garnishKey)) {
      this.garnishes.push(garnishKey);
      return true;
    }
    return false;
  }

  /** Dump all contents but keep the glass */
  dump() {
    this.layers = [];
    this.ice = 0;
    this.garnishes = [];
  }

  /**
   * Validate this glass against a drink order.
   * Returns { valid, issues[] } where issues describe what's wrong.
   */
  validate(drinkKey) {
    const drinkDef = DRINKS[drinkKey];
    if (!drinkDef) return { valid: false, issues: ['Unknown drink'] };

    const issues = [];

    // Check glass type
    if (this.glassType !== drinkDef.glass) {
      issues.push('wrong_glass');
    }

    // Check primary liquid matches
    if (this.primaryDrink !== drinkKey) {
      issues.push('wrong_drink');
    }

    // Check fill level is in acceptable range
    const liquidFill = this.layers.reduce((sum, l) => sum + l.amount, 0);
    const [minFill, maxFill] = drinkDef.fillRange;
    if (liquidFill < minFill) {
      issues.push('underfilled');
    } else if (this.totalFill > maxFill + 0.15) {
      // Allow slight overfill with ice but not excessive
      issues.push('overfilled');
    }

    // Check required garnish
    if (drinkDef.garnish && !this.garnishes.includes(drinkDef.garnish)) {
      issues.push('missing_garnish');
    }

    // Check ice requirement
    if (drinkDef.requiresIce && this.ice === 0) {
      issues.push('missing_ice');
    }

    // Check for contamination (other drinks mixed in)
    const otherLiquids = this.layers.filter(l => l.drinkKey !== drinkKey);
    if (otherLiquids.length > 0) {
      const otherTotal = otherLiquids.reduce((s, l) => s + l.amount, 0);
      if (otherTotal > 0.05) {
        issues.push('contaminated');
      }
    }

    return { valid: issues.length === 0, issues };
  }
}
