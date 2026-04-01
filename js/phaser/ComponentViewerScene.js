/* global Phaser */
import { CANVAS_W, CANVAS_H } from '../constants.js';
import { DRINKS } from '../data/menu.js';
import { GlassState } from '../entities/GlassState.js';
import { DrinkModal } from './modals/DrinkModal.js';

/**
 * ComponentViewerScene — isolated viewer for individual game UI components.
 * Launched from the title screen's Components menu.
 *
 * Supports: 'beer_taps', 'wine_bottles' (more can be added).
 */
export class ComponentViewerScene extends Phaser.Scene {
  constructor() {
    super('ComponentViewer');
  }

  init(data) {
    this.component = data.component || 'beer_taps';
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Back button
    const backBtn = this.add.text(20, 16, '< Back', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#e8c170',
    }).setInteractive({ useHandCursor: true }).setDepth(80);
    backBtn.on('pointerdown', () => this.scene.start('Title'));

    // Title
    const titles = {
      beer_taps: 'Beer Tap Modal',
      wine_bottles: 'Wine Bottle Modal',
    };
    this.add.text(CANVAS_W / 2, 16, titles[this.component] || this.component, {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5, 0).setDepth(80);

    if (this.component === 'beer_taps') {
      this._showBeerTaps();
    } else if (this.component === 'wine_bottles') {
      this._showWineBottles();
    }
  }

  _showBeerTaps() {
    // Mock state
    this._glass = new GlassState('PINT');
    this._barState = {
      carriedGlass: this._glass,
      activePour: null,
    };
    this._modalState = {
      visible: true,
      type: 'beer',
      items: ['GOLD_LAGER', 'HAZY_IPA', 'DARK_PORTER'],
      pourRate: 0.55,
      pouringIndex: -1,
    };

    this._drinkModal = new DrinkModal(this);
    this._drinkModal.show(this._modalState);

    // Wire pour events
    this.events.on('drink-pour-start', (drinkKey, index, pourRate) => {
      this._modalState.pouringIndex = index;
      this._barState.activePour = {
        drinkKey,
        pourRate,
      };
    });

    this.input.on('pointerup', () => {
      this._modalState.pouringIndex = -1;
      this._barState.activePour = null;
    });

    // Intercept close to just reset instead of closing
    this.events.on('drink-modal-close', () => {
      // Reset glass and reshow
      this._glass = new GlassState('PINT');
      this._barState.carriedGlass = this._glass;
      this._barState.activePour = null;
      this._modalState.pouringIndex = -1;
      this._drinkModal.hide();
      this._drinkModal.show(this._modalState);
    });
  }

  _showWineBottles() {
    this._glass = new GlassState('WINE_GLASS');
    this._barState = {
      carriedGlass: this._glass,
      activePour: null,
    };
    this._modalState = {
      visible: true,
      type: 'wine',
      items: ['RED_WINE', 'WHITE_WINE'],
      pourRate: 0.83,
      pouringIndex: -1,
    };

    this._drinkModal = new DrinkModal(this);
    this._drinkModal.show(this._modalState);

    this.events.on('drink-pour-start', (drinkKey, index, pourRate) => {
      this._modalState.pouringIndex = index;
      this._barState.activePour = { drinkKey, pourRate };
    });

    this.input.on('pointerup', () => {
      this._modalState.pouringIndex = -1;
      this._barState.activePour = null;
    });

    this.events.on('drink-modal-close', () => {
      this._glass = new GlassState('WINE_GLASS');
      this._barState.carriedGlass = this._glass;
      this._barState.activePour = null;
      this._modalState.pouringIndex = -1;
      this._drinkModal.hide();
      this._drinkModal.show(this._modalState);
    });
  }

  update(time, delta) {
    if (this._drinkModal && this._drinkModal.visible) {
      // Simulate pouring fill
      if (this._barState.activePour && this._barState.carriedGlass) {
        const dt = Math.min(delta / 1000, 0.05);
        const glass = this._barState.carriedGlass;
        const pour = this._barState.activePour;
        const drink = DRINKS[pour.drinkKey];
        if (drink && glass.remainingCapacity > 0) {
          const amount = pour.pourRate * dt;
          glass.pour(pour.drinkKey, amount);
        }
      }
      this._drinkModal.update(this._barState, this._modalState);
    }
  }

  shutdown() {
    if (this._drinkModal) this._drinkModal.destroy();
  }
}
