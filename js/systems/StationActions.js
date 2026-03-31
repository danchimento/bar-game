import { CANVAS_W, ACTION_DURATIONS } from '../constants.js';
import { DRINKS, GLASSES, GARNISHES, MIXER_DRINKS } from '../data/menu.js';
import { GlassState } from '../entities/GlassState.js';

/**
 * StationActions — owns station tap routing, radial option building,
 * and modal open/close logic for bar stations.
 *
 * Modal tap handlers (handleGlassModalTap, etc.) stay on Game.js since
 * they are throwaway input-routing code that Phaser replaces.
 */
export class StationActions {
  constructor() {
    this.ctx = null;
  }

  /** Set/update the shared context. Called at level start. */
  setContext(ctx) {
    this.ctx = ctx;
    // { bartender, barState, hud, stats, walkThenAct, startPour,
    //   getAvailableDrinks, getStations, drinkModal, glassModal, prepModal, pos }
  }

  // ─── STATION TAP ──────────────────────────────────

  handleStationTap(station) {
    const { bartender: bt, barState, hud, stats, walkThenAct } = this.ctx;

    switch (station.id) {
      case 'GLASS_RACK':
        if (bt.carrying) {
          hud.showMessage('Hands full!', 1);
          return;
        }
        walkThenAct(station.x, () => {
          this.openGlassModal();
        });
        break;

      case 'DISHWASHER':
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
        break;

      case 'SINK':
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
        break;

      case 'TAPS':
        walkThenAct(station.x, () => {
          this.openDrinkModal('beer', station.x);
        });
        break;

      case 'WINE':
        walkThenAct(station.x, () => {
          this.openDrinkModal('wine', station.x);
        });
        break;

      case 'PREP':
        walkThenAct(station.x, () => {
          this.ctx.prepModal.visible = true;
        });
        break;

      case 'TRASH':
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
        break;

      case 'POS':
        this.openPOS();
        break;
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
            icon: '\u{1F943}',
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
            icon: '\u{1F37A}',
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
            icon: '\u{1F377}',
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
          label: '\u{1F9CA} Ice',
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
            icon: '\u{1F9FD}',
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
            icon: '\u{1F6B0}',
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
            icon: '\u{1F5D1}\u{FE0F}',
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

  openGlassModal() {
    this.ctx.glassModal.visible = true;
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
