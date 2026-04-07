/* global Phaser */
import {
  CANVAS_W, CANVAS_H, SEATS, setSeatCount, GUEST_STATE,
  ACTION_DURATIONS, BAR_TOP_Y, STATION_Y,
  MOOD_GRACE_PERIOD, SETTLE_TIME, ENJOY_TIME_MIN, ENJOY_TIME_MAX, ORDER_REVEAL_TIME,
} from '../constants.js';
import { DRINKS, GLASSES, GARNISHES, MIXER_DRINKS } from '../data/menu.js';
import { LEVELS } from '../data/levels.js';
import { Bartender } from '../entities/Bartender.js';
import { GlassState } from '../entities/GlassState.js';
import { BarState } from '../systems/BarState.js';
import { GuestManager } from '../systems/GuestManager.js';
import { StationActions } from '../systems/StationActions.js';
import { HUD } from '../ui/HUD.js';
import { RadialMenu } from '../ui/RadialMenu.js';

// Phaser layers & UI
import { BarLayer } from './layers/BarLayer.js';
import { StationLayer } from './layers/StationLayer.js';
import { BartenderLayer } from './layers/BartenderLayer.js';
import { GuestLayer } from './layers/GuestLayer.js';
import { BarItemsLayer } from './layers/BarItemsLayer.js';
import { HudUI } from './ui/HudUI.js';
import { RadialMenuUI } from './ui/RadialMenuUI.js';
import { PauseUI } from './ui/PauseUI.js';
import { GlassModal } from './modals/GlassModal.js';
import { DrinkModal } from './modals/DrinkModal.js';
import { PrepModal } from './modals/PrepModal.js';
import { POSModal } from './modals/POSModal.js';
import { GuestModal } from './modals/GuestModal.js';

export class GamePlayScene extends Phaser.Scene {
  constructor() {
    super('GamePlay');
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // ── Game logic (unchanged modules) ──
    this.level = LEVELS[this.levelIndex];
    this.seats = setSeatCount(this.level.seats || 3);

    this.settings = {
      moodDecayMultiplier: 1.0, gracePeriod: MOOD_GRACE_PERIOD,
      settleTime: SETTLE_TIME, enjoyTimeMin: ENJOY_TIME_MIN,
      enjoyTimeMax: ENJOY_TIME_MAX, orderRevealTime: ORDER_REVEAL_TIME,
      spawnInterval: 1.0, levelDuration: this.level.duration,
    };
    if (this.level.settings) {
      for (const [k, v] of Object.entries(this.level.settings)) {
        if (k in this.settings) this.settings[k] = v;
      }
    }

    this.bartender = new Bartender();
    this.barState = new BarState();
    this.guestManager = new GuestManager();
    this.stationActions = new StationActions();
    this.hud = new HUD();
    this.radialMenu = new RadialMenu();

    this.hud.levelName = this.level.name;
    this.hud.timeRemaining = this.settings.levelDuration;
    this.hud.starThresholds = this.level.starThresholds;

    this.pos = {
      visible: false, mode: 'SELECT_SEAT', selectedSeat: null,
      seatOrders: [], tab: new Map(),
    };
    this.glassModalState = { visible: false };
    this.drinkModalState = {
      visible: false, type: null, items: [], stationX: 0,
      pouringIndex: -1, pourRate: 0, glassX: 0, glassTargetX: 0,
    };
    this.prepModalState = { visible: false };

    this.pendingAction = null;
    this.levelTimer = 0;
    this.paused = false;
    this.stats = {
      drinksServedCorrect: 0, drinksServedWithIssues: 0, drinksRejected: 0,
      drinksWasted: 0, billsCorrect: 0, billsOvercharged: 0, billsUndercharged: 0,
      guestsServed: 0, guestsAngry: 0, anticipatedCorrect: 0, anticipatedWrong: 0,
      totalWaitTime: 0, guestsWaited: 0, totalTips: 0, peakGuests: 0,
    };

    this.activeSchedule = this.level.spawnSchedule.map(s => ({
      ...s, time: s.time * this.settings.spawnInterval,
    }));
    this.activeDuration = this.settings.levelDuration;

    // Wire up game logic contexts
    this.guestManager.setContext({
      bartender: this.bartender, barState: this.barState,
      hud: this.hud, stats: this.stats,
      settings: this.settings, seats: this.seats, radialMenu: this.radialMenu,
      posTab: this.pos.tab,
      walkThenAct: this.walkThenAct.bind(this),
      getStations: () => this.level?.stations || [],
    });

    this.stationActions.setContext({
      bartender: this.bartender, barState: this.barState,
      hud: this.hud, stats: this.stats,
      walkThenAct: this.walkThenAct.bind(this),
      startPour: this.startPour.bind(this),
      getAvailableDrinks: () => this.level?.drinks || Object.keys(DRINKS),
      getStations: () => this.level?.stations || [],
      drinkModal: this.drinkModalState,
      glassModal: this.glassModalState,
      prepModal: this.prepModalState,
      pos: this.pos,
    });

    // ── Phaser visual layers ──
    this.barLayer = new BarLayer(this, this.seats);
    this.stationLayer = new StationLayer(this, this.level.stations);
    this.bartenderLayer = new BartenderLayer(this);
    this.guestLayer = new GuestLayer(this);
    this.barItemsLayer = new BarItemsLayer(this);

    // ── Phaser UI ──
    this.hudUI = new HudUI(this);
    this.radialMenuUI = new RadialMenuUI(this);
    this.pauseUI = new PauseUI(this);
    this.glassModal = new GlassModal(this);
    this.drinkModal = new DrinkModal(this);
    this.prepModal = new PrepModal(this);
    this.posModal = new POSModal(this);
    this.guestModal = new GuestModal(this);

    // ── Input wiring ──
    this._setupInput();

    // ── Global pointer handlers ──
    this.input.on('pointermove', (ptr) => {
      if (this.radialMenu.visible && this.radialMenu.dragging) {
        this.radialMenu.updateHover(ptr.x, ptr.y);
        this.radialMenuUI.redraw();
      }
    });

    this.input.on('pointerup', () => {
      if (this.barState.activePour) this.stopPour();

      // Radial menu: select hovered option on release and close
      if (this.radialMenu.visible) {
        const idx = this.radialMenu.hoveredIndex;
        if (idx >= 0) {
          const opt = this.radialMenu.options[idx];
          if (opt && opt.action && !opt.disabled && !opt.pourKey) {
            opt.action();
          }
        }
        this.radialMenu.close();
      }
    });
  }

  // ─── UPDATE LOOP ─────────────────────────────────

  update(time, delta) {
    this._modalClosedThisFrame = false;
    if (this.paused) return;

    const dt = Math.min(delta / 1000, 0.05);
    this.levelTimer += dt;
    this.hud.timeRemaining = Math.max(0, this.activeDuration - this.levelTimer);
    this.hud.update(dt);
    this.barState.updatePour(dt);
    this.guestManager.spawnFromSchedule(this.levelTimer, this.activeSchedule, this.activeDuration);
    this.bartender.update(dt);

    // Pending walk-then-act
    if (this.pendingAction && !this.bartender.busy) {
      if (Math.abs(this.bartender.x - this.pendingAction.targetX) < 8) {
        this.pendingAction.callback();
        this.pendingAction = null;
      }
    }

    this.guestManager.updateGuests(dt, this.levelTimer, this.activeDuration);

    // Sync visuals
    this.bartenderLayer.update(this.bartender, this.barState);
    this.guestLayer.update(this.guestManager.guests, this.barState.drinksAtSeats);
    this.barItemsLayer.update(this.barState, this.guestLayer._sippingMap);
    this.hudUI.update(this.hud, this.levelTimer, this.activeDuration);
    this.barLayer.updateClock(this.levelTimer, this.activeDuration);

    // Radial menu
    if (this.radialMenu.visible) {
      this.radialMenuUI.show(this.radialMenu);
    } else {
      this.radialMenuUI.hide();
    }

    // Check modals
    if (this.glassModalState.visible && !this.glassModal.visible) {
      this.glassModal.show(this.level?.drinks || Object.keys(DRINKS));
    }
    if (!this.glassModalState.visible && this.glassModal.visible) this.glassModal.hide();
    if (this.glassModal.visible) this.glassModal.update();

    if (this.drinkModalState.visible && !this.drinkModal.visible) {
      this.drinkModal.show(this.drinkModalState);
    }
    if (!this.drinkModalState.visible && this.drinkModal.visible) this.drinkModal.hide();
    if (this.drinkModal.visible) {
      this.drinkModal.update(this.barState, this.drinkModalState);
    }

    if (this.prepModalState.visible && !this.prepModal.visible) {
      this.prepModal.show(this.barState.carriedGlass);
    }
    if (!this.prepModalState.visible && this.prepModal.visible) this.prepModal.hide();

    if (this.pos.visible && !this.posModal.visible) {
      this.posModal.show(this.pos, this.level?.drinks || Object.keys(DRINKS));
    }
    if (!this.pos.visible && this.posModal.visible) this.posModal.hide();

    // Level complete check
    const guests = this.guestManager.guests;
    if (this.levelTimer >= this.activeDuration && guests.length === 0 && this.barState.isEmpty) {
      this.scene.start('LevelComplete', {
        hud: this.hud, stats: this.stats, levelIndex: this.levelIndex,
      });
    }
  }

  // ─── INPUT SETUP ─────────────────────────────────

  _setupInput() {
    // Station tap
    this.events.on('station-tap', (station) => {
      if (this._anyModalOpen()) return;
      if (station.id === 'MENU') {
        this.events.emit('pause-tap');
        return;
      }
      this.stationActions.handleStationTap(station);
    });

    // Station long-press → radial menu (DISABLED — will be re-enabled as a skill later)
    // this.events.on('station-longpress', (station) => {
    //   if (this._anyModalOpen()) return;
    //   const options = this.stationActions.getStationRadialOptions(station);
    //   if (options.length > 0) {
    //     this.radialMenu.open(station.x, STATION_Y - 40, options);
    //   }
    // });

    // Unified seat zone tap — handles guest interaction, cash, and bussing
    this.events.on('seat-zone-tap', (seatId) => {
      if (this._anyModalOpen()) return;

      // Priority 1: Guest present → open guest modal
      const guest = this.guestManager.guests.find(
        g => g.seatId === seatId &&
             g.state !== GUEST_STATE.LEAVING &&
             g.state !== GUEST_STATE.ANGRY_LEAVING &&
             g.state !== GUEST_STATE.DONE
      );
      if (guest) {
        const seatX = guest.seat ? guest.seat.x : guest.x;
        this.walkThenAct(seatX, () => {
          if (this._anyModalOpen()) return;
          const actions = this.guestManager.getGuestActions(guest);
          this.guestModal.show(guest, actions);
        });
        return;
      }

      // Priority 2: Cash or dirty seat → cleanup
      this.barState.handleSeatCleanup(seatId, this.bartender, this.hud, this.stats,
        this.walkThenAct.bind(this));
    });

    // Guest modal close
    this.events.on('guest-modal-close', () => {
      this.guestModal.hide();
    });

    // Bar area tap → move bartender
    this.input.on('pointerdown', (ptr) => {
      if (this.paused || this._anyModalOpen() || this._modalClosedThisFrame) return;
      if (this.radialMenu.visible) return;
      const { x, y } = ptr;
      if (y > BAR_TOP_Y && y < STATION_Y + 40) {
        this.bartender.moveTo(x);
        this.pendingAction = null;
      }
    });

    // Service mat drink tap
    this.events.on('mat-drink-tap', (drink) => {
      this.barState.pickUpDrink(drink, this.bartender, this.hud, this.walkThenAct.bind(this));
    });

    // Glass modal selection
    this.events.on('glass-selected', (glassKey) => {
      this.glassModalState.visible = false;
      // Animation in the modal already covers the pickup time — no extra delay
      this.bartender.carrying = `GLASS_${glassKey}`;
      this.barState.carriedGlass = new GlassState(glassKey);
    });

    // Glass modal close (X button or click outside)
    this.events.on('glass-modal-close', () => {
      this.glassModalState.visible = false;
      this._modalClosedThisFrame = true;
    });

    // Drink modal events
    this.events.on('drink-pour-start', (drinkKey, index, pourRate) => {
      this.drinkModalState.pouringIndex = index;
      this.startPour(drinkKey, pourRate);
    });
    this.events.on('drink-modal-close', () => {
      this.stationActions.closeDrinkModal();
      this._modalClosedThisFrame = true;
    });

    // Prep modal events
    this.events.on('prep-ice', () => this.stationActions.addIce());
    this.events.on('prep-garnish', (key) => this.stationActions.addGarnish(key));
    this.events.on('prep-mixer-start', (key) => {
      this.startPour(key, 1.0 / ACTION_DURATIONS.POUR_BEER);
    });

    // POS events
    this.events.on('pos-close', () => { this.pos.visible = false; this._modalClosedThisFrame = true; });
    this.events.on('pos-select-seat', (seatId) => {
      this.pos.mode = 'SEAT_VIEW';
      this.pos.selectedSeat = seatId;
      this.posModal.show(this.pos, this.level?.drinks || Object.keys(DRINKS));
    });
    this.events.on('pos-back', () => {
      this.pos.mode = 'SELECT_SEAT';
      this.posModal.show(this.pos, this.level?.drinks || Object.keys(DRINKS));
    });
    this.events.on('pos-add-drink', (seatId, drinkKey) => {
      if (!this.pos.tab.has(seatId)) this.pos.tab.set(seatId, []);
      this.pos.tab.get(seatId).push({ drink: drinkKey, price: DRINKS[drinkKey].price });
      this.hud.showMessage(`Added ${DRINKS[drinkKey].name}`, 1);
      this.posModal.show(this.pos, this.level?.drinks || Object.keys(DRINKS));
    });
    this.events.on('pos-remove-item', (seatId, index) => {
      const tab = this.pos.tab.get(seatId) || [];
      const removed = tab.splice(index, 1)[0];
      if (removed) this.hud.showMessage(`Removed ${DRINKS[removed.drink]?.name}`, 1);
      this.posModal.show(this.pos, this.level?.drinks || Object.keys(DRINKS));
    });
    this.events.on('pos-print-check', (seatId) => {
      const tab = this.pos.tab.get(seatId) || [];
      if (tab.length === 0) {
        this.hud.showMessage('No drinks on tab', 1);
        return;
      }
      this.pos.visible = false;
      this.bartender.startAction(ACTION_DURATIONS.PRINT_CHECK, 'Printing...', () => {
        this.bartender.carrying = `CHECK_${seatId}`;
        this.hud.showMessage(`Check for Seat ${seatId + 1}`, 1.5);
      });
    });

    // Pause
    this.events.on('pause-tap', () => {
      this.paused = true;
      this.pauseUI.show();
    });
    this.events.on('resume', () => {
      this.paused = false;
      this.pauseUI.hide();
    });
    this.events.on('quit-to-title', () => {
      this.scene.start('Title');
    });
  }

  _anyModalOpen() {
    return this.glassModalState.visible || this.drinkModalState.visible ||
           this.prepModalState.visible || this.pos.visible ||
           this.guestModal.visible;
  }

  // ─── GAME LOGIC HELPERS ──────────────────────────

  walkThenAct(targetX, callback) {
    this.bartender.moveTo(targetX);
    this.pendingAction = { targetX, callback };
  }

  startPour(drinkKey, pourRate) {
    this.barState.startPour(drinkKey, pourRate);
    if (this.barState.activePour) {
      this.bartender.carrying = `DRINK_${drinkKey}`;
    }
  }

  stopPour() {
    this.barState.stopPour();
    if (this.drinkModalState.visible) {
      this.drinkModalState.pouringIndex = -1;
    }
  }
}
