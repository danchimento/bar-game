import { CANVAS_W, ACTION_DURATIONS, BAR_CABINET_TOP, BAR_CABINET_BOTTOM, COUNTER_SURFACE_Y, COUNTER_Y } from '../constants.js';
import { DRINKS, GLASSES, GARNISHES, MIXER_DRINKS } from '../data/menu.js';
import { GlassState } from '../entities/GlassState.js';

/**
 * StationActions — owns station tap routing, radial option building,
 * and modal open/close logic for bar stations.
 *
 * Station taps are routed via a data-driven dispatch table.
 */
export class StationActions {
  constructor() {
    this.ctx = null;
  }

  setContext(ctx) {
    this.ctx = ctx;
  }

  // ─── STATION TAP — data-driven dispatch ───────────

  handleStationTap(station) {
    const handler = STATION_TAP_HANDLERS[station.id];
    if (handler) {
      handler(this, station);
    }
  }

  // ─── RADIAL OPTIONS ───────────────────────────────

  getStationRadialOptions(station) {
    const { bartender: bt, barState, hud, stats, walkThenAct, startPour, getAvailableDrinks } = this.ctx;
    const options = [];

    switch (station.id) {
      case 'GLASS_RACK': {
        if (bt.carrying) return [];
        const glassTypes = Object.keys(GLASSES);
        for (const key of glassTypes) {
          options.push({
            icon: 'rm_glass',
            label: GLASSES[key].name,
            action: () => {
              walkThenAct(station.x, () => {
                bt.startAction(ACTION_DURATIONS.GLASS_RACK, 'Grabbing glass...', () => {
                  bt.carrying = `GLASS_${key}`;
                  barState.carriedGlass = new GlassState(key);
                });
              });
            },
          });
        }
        break;
      }

      case 'TAPS': {
        const beers = getAvailableDrinks().filter(d => DRINKS[d].type === 'beer');
        const pourRate = 1.0 / ACTION_DURATIONS.POUR_BEER;
        for (const key of beers) {
          options.push({
            icon: 'icon_beer',
            label: DRINKS[key].name,
            pourKey: key,
            pourRate,
            stationX: station.x,
          });
        }
        break;
      }

      case 'WINE': {
        const wines = getAvailableDrinks().filter(d => DRINKS[d].type === 'wine');
        const pourRate = 1.0 / ACTION_DURATIONS.POUR_WINE;
        for (const key of wines) {
          options.push({
            icon: 'rm_wine',
            label: DRINKS[key].name,
            pourKey: key,
            pourRate,
            stationX: station.x,
          });
        }
        break;
      }

      case 'PREP': {
        options.push({
          icon: 'rm_ice',
          label: 'Ice',
          disabled: !barState.carriedGlass || barState.carriedGlass.ice > 0,
          action: () => {
            walkThenAct(station.x, () => { this.addIce(); });
          },
        });
        for (const key of Object.keys(GARNISHES)) {
          options.push({
            label: GARNISHES[key].name,
            disabled: barState.carriedGlass && barState.carriedGlass.garnishes.includes(key),
            action: () => {
              walkThenAct(station.x, () => { this.addGarnish(key); });
            },
          });
        }
        for (const key of MIXER_DRINKS) {
          options.push({
            label: DRINKS[key].name,
            action: () => {
              walkThenAct(station.x, () => {
                startPour(key, 1.0 / ACTION_DURATIONS.POUR_BEER);
              });
            },
          });
        }
        break;
      }

      case 'DISHWASHER': {
        if (bt.carrying === 'DIRTY_GLASS') {
          options.push({
            icon: 'rm_clean',
            label: 'Clean',
            action: () => {
              walkThenAct(station.x, () => {
                bt.startAction(ACTION_DURATIONS.DISHWASHER, 'Loading...', () => {
                  bt.carrying = null;
                  hud.showMessage('Glasses cleaned', 1);
                });
              });
            },
          });
        }
        break;
      }

      case 'SINK': {
        if (barState.carriedGlass) {
          options.push({
            icon: 'rm_dump',
            label: 'Dump',
            action: () => {
              walkThenAct(station.x, () => {
                bt.startAction(0.4, 'Dumping...', () => {
                  stats.drinksWasted++;
                  barState.carriedGlass = null;
                  bt.carrying = null;
                  hud.showMessage('Dumped', 1);
                });
              });
            },
          });
        }
        break;
      }

      case 'TRASH': {
        if (bt.carrying) {
          options.push({
            icon: 'rm_trash',
            label: 'Trash',
            action: () => {
              walkThenAct(station.x, () => {
                bt.startAction(0.3, 'Tossing...', () => {
                  stats.drinksWasted++;
                  barState.carriedGlass = null;
                  bt.carrying = null;
                  hud.showMessage('Trashed', 0.8);
                });
              });
            },
          });
        }
        break;
      }
    }

    return options;
  }

  // ─── MODAL OPENERS ────────────────────────────────

  openGlassModal(station) {
    const st = this.ctx.glassModal;
    st.visible = true;
    // Station origin for zoom animation
    const cabinetMidY = (BAR_CABINET_TOP + BAR_CABINET_BOTTOM) / 2;
    st.originX = station ? station.x : CANVAS_W / 2;
    st.originY = station ? cabinetMidY : 270;
    // Glass rack sprite: 84×24 at 0.72 scale
    st.originW = 60;
    st.originH = 17;
  }

  openDrinkModal(type, stationX) {
    const { drinkModal, getAvailableDrinks } = this.ctx;
    drinkModal.visible = true;
    drinkModal.type = type;
    drinkModal.stationX = stationX;
    drinkModal.pouringIndex = -1;

    if (type === 'beer') {
      drinkModal.items = getAvailableDrinks().filter(d => DRINKS[d].type === 'beer');
      drinkModal.pourRate = 1.0 / ACTION_DURATIONS.POUR_BEER;
      const tapSpacing = 80;
      const totalTapsW = (drinkModal.items.length - 1) * tapSpacing;
      const pw = Math.max(totalTapsW + 160, 340);
      const px = (CANVAS_W - pw) / 2;
      const restX = px + 50;
      drinkModal.glassX = restX;
      drinkModal.glassTargetX = restX;
    } else if (type === 'wine') {
      drinkModal.items = getAvailableDrinks().filter(d => DRINKS[d].type === 'wine');
      drinkModal.pourRate = 1.0 / ACTION_DURATIONS.POUR_WINE;
    } else if (type === 'mixer') {
      drinkModal.items = MIXER_DRINKS;
      drinkModal.pourRate = 1.0 / ACTION_DURATIONS.POUR_BEER;
    }
  }

  openPOS() {
    const { walkThenAct, pos, getStations } = this.ctx;
    const posStation = getStations().find(s => s.id === 'POS');
    walkThenAct(posStation.x, () => {
      pos.visible = true;
      pos.mode = 'SELECT_SEAT';
      pos.selectedSeat = null;
    });
  }

  closeDrinkModal() {
    const { drinkModal, barState, bartender } = this.ctx;
    drinkModal.pouringIndex = -1;
    barState.activePour = null;

    if (barState.carriedGlass && barState.carriedGlass.primaryDrink) {
      bartender.carrying = `DRINK_${barState.carriedGlass.primaryDrink}`;
    }

    drinkModal.visible = false;
  }

  // ─── PREP HELPERS ─────────────────────────────────

  addGarnish(garnishKey) {
    const { barState, bartender, hud, prepModal } = this.ctx;
    if (!barState.carriedGlass) return;
    if (barState.carriedGlass.garnishes.includes(garnishKey)) {
      hud.showMessage('Already added!', 1);
      return;
    }
    bartender.startAction(ACTION_DURATIONS.GARNISH, 'Garnishing...', () => {
      barState.carriedGlass.addGarnish(garnishKey);
      hud.showMessage(`Added ${GARNISHES[garnishKey].name}`, 1);
    });
    prepModal.visible = false;
  }

  addIce() {
    const { barState, hud } = this.ctx;
    if (!barState.carriedGlass) return;
    if (barState.carriedGlass.ice > 0) {
      hud.showMessage('Already has ice!', 1);
      return;
    }
    barState.carriedGlass.addIce(0.3);
    hud.showMessage('Ice added', 1);
  }
}

// ─── STATION TAP DISPATCH TABLE ─────────────────────

const STATION_TAP_HANDLERS = {
  GLASS_RACK(actions, station) {
    const { bartender: bt, hud, walkThenAct } = actions.ctx;
    if (bt.carrying) { hud.showMessage('Hands full!', 1); return; }
    walkThenAct(station.x, () => actions.openGlassModal(station));
  },

  DISHWASHER(actions, station) {
    const { bartender: bt, hud, walkThenAct } = actions.ctx;
    if (bt.carrying === 'DIRTY_GLASS') {
      walkThenAct(station.x, () => {
        bt.startAction(ACTION_DURATIONS.DISHWASHER, 'Loading...', () => {
          bt.carrying = null;
          hud.showMessage('Glasses cleaned', 1);
        });
      });
    } else {
      hud.showMessage('Need dirty glasses', 1);
    }
  },

  SINK(actions, station) {
    const { barState, bartender: bt, hud, stats, walkThenAct } = actions.ctx;
    if (barState.carriedGlass) {
      walkThenAct(station.x, () => {
        bt.startAction(0.4, 'Dumping...', () => {
          stats.drinksWasted++;
          barState.carriedGlass = null;
          bt.carrying = null;
          hud.showMessage('Dumped', 1);
        });
      });
    } else {
      hud.showMessage('Nothing to dump', 1);
    }
  },

  TAPS(actions, station) {
    actions.ctx.walkThenAct(station.x, () => actions.openDrinkModal('beer', station.x));
  },

  WINE(actions, station) {
    actions.ctx.walkThenAct(station.x, () => actions.openDrinkModal('wine', station.x));
  },

  PREP(actions, station) {
    actions.ctx.walkThenAct(station.x, () => { actions.ctx.prepModal.visible = true; });
  },

  TRASH(actions, station) {
    const { bartender: bt, barState, hud, stats, walkThenAct } = actions.ctx;
    if (bt.carrying) {
      walkThenAct(station.x, () => {
        bt.startAction(0.3, 'Tossing...', () => {
          stats.drinksWasted++;
          barState.carriedGlass = null;
          bt.carrying = null;
          hud.showMessage('Trashed', 0.8);
        });
      });
    } else {
      hud.showMessage('Nothing to toss', 1);
    }
  },

  POS(actions) {
    actions.openPOS();
  },
};
