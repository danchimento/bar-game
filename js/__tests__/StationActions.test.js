import { describe, it, expect, beforeEach } from 'vitest';
import { StationActions } from '../systems/StationActions.js';
import { BarState } from '../systems/BarState.js';
import { GlassState } from '../entities/GlassState.js';
import { setSeatCount } from '../constants.js';

setSeatCount(3);

function makeBartender(x = 480) {
  return {
    x,
    carrying: null,
    busy: false,
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

function makeStats() {
  return {
    drinksWasted: 0,
    drinksServedCorrect: 0,
  };
}

function makeModal() {
  return { visible: false, type: null, items: [], stationX: 0, pouringIndex: -1, pourRate: 0, glassX: 0, glassTargetX: 0 };
}

function makeContext(overrides = {}) {
  return {
    bartender: makeBartender(),
    barState: new BarState(),
    hud: makeHUD(),
    stats: makeStats(),
    walkThenAct: (x, cb) => cb(),
    startPour: (key, rate) => {},
    getAvailableDrinks: () => ['GOLD_LAGER', 'HAZY_IPA', 'RED_WINE', 'WHITE_WINE'],
    getStations: () => [
      { id: 'TAPS', x: 380 },
      { id: 'POS', x: 850 },
      { id: 'PREP', x: 650 },
    ],
    drinkModal: makeModal(),
    glassModal: { visible: false },
    prepModal: { visible: false },
    pos: { visible: false, mode: 'SELECT_SEAT', selectedSeat: null },
    ...overrides,
  };
}

describe('StationActions', () => {
  let sa;
  let ctx;

  beforeEach(() => {
    sa = new StationActions();
    ctx = makeContext();
    sa.setContext(ctx);
  });

  describe('handleStationTap', () => {
    it('GLASS_RACK opens glass modal when hands empty', () => {
      sa.handleStationTap({ id: 'GLASS_RACK', x: 250 });
      expect(ctx.glassModal.visible).toBe(true);
    });

    it('GLASS_RACK rejects when hands full', () => {
      ctx.bartender.carrying = 'DRINK_GOLD_LAGER';
      sa.handleStationTap({ id: 'GLASS_RACK', x: 250 });
      expect(ctx.glassModal.visible).toBe(false);
      expect(ctx.hud.messages).toContain('Hands full!');
    });

    it('DISHWASHER cleans dirty glass', () => {
      ctx.bartender.carrying = 'DIRTY_GLASS';
      sa.handleStationTap({ id: 'DISHWASHER', x: 60 });
      expect(ctx.bartender.carrying).toBeNull();
      expect(ctx.hud.messages).toContain('Glasses cleaned');
    });

    it('DISHWASHER rejects without dirty glass', () => {
      sa.handleStationTap({ id: 'DISHWASHER', x: 60 });
      expect(ctx.hud.messages).toContain('Need dirty glasses');
    });

    it('SINK dumps carried glass', () => {
      ctx.barState.carriedGlass = new GlassState('PINT');
      ctx.bartender.carrying = 'GLASS_PINT';
      sa.handleStationTap({ id: 'SINK', x: 150 });
      expect(ctx.barState.carriedGlass).toBeNull();
      expect(ctx.bartender.carrying).toBeNull();
      expect(ctx.stats.drinksWasted).toBe(1);
    });

    it('SINK rejects when nothing to dump', () => {
      sa.handleStationTap({ id: 'SINK', x: 150 });
      expect(ctx.hud.messages).toContain('Nothing to dump');
    });

    it('TAPS opens beer drink modal', () => {
      sa.handleStationTap({ id: 'TAPS', x: 380 });
      expect(ctx.drinkModal.visible).toBe(true);
      expect(ctx.drinkModal.type).toBe('beer');
    });

    it('WINE opens wine drink modal', () => {
      sa.handleStationTap({ id: 'WINE', x: 510 });
      expect(ctx.drinkModal.visible).toBe(true);
      expect(ctx.drinkModal.type).toBe('wine');
    });

    it('PREP opens prep modal', () => {
      sa.handleStationTap({ id: 'PREP', x: 650 });
      expect(ctx.prepModal.visible).toBe(true);
    });

    it('TRASH trashes carried item', () => {
      ctx.bartender.carrying = 'GLASS_PINT';
      ctx.barState.carriedGlass = new GlassState('PINT');
      sa.handleStationTap({ id: 'TRASH', x: 900 });
      expect(ctx.bartender.carrying).toBeNull();
      expect(ctx.barState.carriedGlass).toBeNull();
      expect(ctx.stats.drinksWasted).toBe(1);
    });

    it('TRASH rejects when nothing to toss', () => {
      sa.handleStationTap({ id: 'TRASH', x: 900 });
      expect(ctx.hud.messages).toContain('Nothing to toss');
    });

    it('POS opens POS overlay', () => {
      sa.handleStationTap({ id: 'POS', x: 850 });
      expect(ctx.pos.visible).toBe(true);
      expect(ctx.pos.mode).toBe('SELECT_SEAT');
    });
  });

  describe('getStationRadialOptions', () => {
    it('GLASS_RACK returns glass options when hands empty', () => {
      const opts = sa.getStationRadialOptions({ id: 'GLASS_RACK', x: 250 });
      expect(opts.length).toBeGreaterThan(0);
      // Should have one per glass type (PINT, WINE_GLASS, PLASTIC_CUP)
      expect(opts.length).toBe(3);
    });

    it('GLASS_RACK returns empty when hands full', () => {
      ctx.bartender.carrying = 'DIRTY_GLASS';
      const opts = sa.getStationRadialOptions({ id: 'GLASS_RACK', x: 250 });
      expect(opts).toEqual([]);
    });

    it('TAPS returns beer pour options', () => {
      const opts = sa.getStationRadialOptions({ id: 'TAPS', x: 380 });
      expect(opts.length).toBe(2); // GOLD_LAGER, HAZY_IPA (available beers)
      expect(opts[0].pourKey).toBeDefined();
      expect(opts[0].pourRate).toBeGreaterThan(0);
    });

    it('WINE returns wine pour options', () => {
      const opts = sa.getStationRadialOptions({ id: 'WINE', x: 510 });
      expect(opts.length).toBe(2); // RED_WINE, WHITE_WINE
      expect(opts[0].pourKey).toBeDefined();
    });

    it('PREP returns ice, garnish, and mixer options', () => {
      ctx.barState.carriedGlass = new GlassState('PINT');
      const opts = sa.getStationRadialOptions({ id: 'PREP', x: 650 });
      const labels = opts.map(o => o.label);
      // Should have: Ice, Orange, Lime, Lemon, Cherry, Water
      expect(labels.some(l => l.includes('Ice'))).toBe(true);
      expect(opts.length).toBeGreaterThanOrEqual(6);
    });

    it('PREP ice option disabled when glass already has ice', () => {
      const glass = new GlassState('PINT');
      glass.addIce(0.3);
      ctx.barState.carriedGlass = glass;
      const opts = sa.getStationRadialOptions({ id: 'PREP', x: 650 });
      const iceOpt = opts.find(o => o.label.includes('Ice'));
      expect(iceOpt.disabled).toBe(true);
    });

    it('DISHWASHER returns clean option for dirty glass', () => {
      ctx.bartender.carrying = 'DIRTY_GLASS';
      const opts = sa.getStationRadialOptions({ id: 'DISHWASHER', x: 60 });
      expect(opts.length).toBe(1);
      expect(opts[0].label).toBe('Clean');
    });

    it('DISHWASHER returns empty without dirty glass', () => {
      const opts = sa.getStationRadialOptions({ id: 'DISHWASHER', x: 60 });
      expect(opts).toEqual([]);
    });

    it('SINK returns dump option when carrying glass', () => {
      ctx.barState.carriedGlass = new GlassState('PINT');
      const opts = sa.getStationRadialOptions({ id: 'SINK', x: 150 });
      expect(opts.length).toBe(1);
      expect(opts[0].label).toBe('Dump');
    });

    it('TRASH returns trash option when carrying anything', () => {
      ctx.bartender.carrying = 'GLASS_PINT';
      const opts = sa.getStationRadialOptions({ id: 'TRASH', x: 900 });
      expect(opts.length).toBe(1);
      expect(opts[0].label).toBe('Trash');
    });
  });

  describe('openDrinkModal', () => {
    it('sets up beer modal with tap items', () => {
      sa.openDrinkModal('beer', 380);
      expect(ctx.drinkModal.visible).toBe(true);
      expect(ctx.drinkModal.type).toBe('beer');
      expect(ctx.drinkModal.items.length).toBe(2); // GOLD_LAGER, HAZY_IPA
      expect(ctx.drinkModal.glassX).toBeGreaterThan(0);
    });

    it('sets up wine modal', () => {
      sa.openDrinkModal('wine', 510);
      expect(ctx.drinkModal.type).toBe('wine');
      expect(ctx.drinkModal.items.length).toBe(2); // RED_WINE, WHITE_WINE
    });
  });

  describe('closeDrinkModal', () => {
    it('closes modal and clears pour', () => {
      ctx.drinkModal.visible = true;
      ctx.drinkModal.pouringIndex = 1;
      ctx.barState.activePour = { drinkKey: 'GOLD_LAGER', pourRate: 0.5 };

      sa.closeDrinkModal();

      expect(ctx.drinkModal.visible).toBe(false);
      expect(ctx.drinkModal.pouringIndex).toBe(-1);
      expect(ctx.barState.activePour).toBeNull();
    });

    it('updates carrying label on close', () => {
      const glass = new GlassState('PINT');
      glass.pour('GOLD_LAGER', 0.5);
      ctx.barState.carriedGlass = glass;
      ctx.drinkModal.visible = true;

      sa.closeDrinkModal();

      expect(ctx.bartender.carrying).toBe('DRINK_GOLD_LAGER');
    });
  });

  describe('addGarnish', () => {
    it('adds garnish to carried glass', () => {
      ctx.barState.carriedGlass = new GlassState('PINT');
      sa.addGarnish('ORANGE');
      expect(ctx.barState.carriedGlass.garnishes).toContain('ORANGE');
      expect(ctx.prepModal.visible).toBe(false);
    });

    it('rejects duplicate garnish', () => {
      const glass = new GlassState('PINT');
      glass.addGarnish('ORANGE');
      ctx.barState.carriedGlass = glass;

      sa.addGarnish('ORANGE');
      expect(ctx.hud.messages).toContain('Already added!');
    });

    it('does nothing without carried glass', () => {
      sa.addGarnish('ORANGE');
      expect(ctx.hud.messages.length).toBe(0);
    });
  });

  describe('addIce', () => {
    it('adds ice to carried glass', () => {
      ctx.barState.carriedGlass = new GlassState('PINT');
      sa.addIce();
      expect(ctx.barState.carriedGlass.ice).toBeGreaterThan(0);
    });

    it('rejects if already has ice', () => {
      const glass = new GlassState('PINT');
      glass.addIce(0.3);
      ctx.barState.carriedGlass = glass;

      sa.addIce();
      expect(ctx.hud.messages).toContain('Already has ice!');
    });
  });
});
