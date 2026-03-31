import {
  CANVAS_W, CANVAS_H, SEATS, setSeatCount, GUEST_STATE,
  ACTION_DURATIONS,
  GAME_STATE, BAR_LEFT, BAR_RIGHT,
  MOOD_GRACE_PERIOD, SETTLE_TIME,
  ENJOY_TIME_MIN, ENJOY_TIME_MAX, ORDER_REVEAL_TIME,
} from './constants.js';
import { DRINKS, GLASSES, GARNISHES, MIXER_DRINKS } from './data/menu.js';
import { LEVELS } from './data/levels.js';
import { Bartender } from './entities/Bartender.js';
import { GlassState } from './entities/GlassState.js';
import { Renderer } from './systems/Renderer.js';
import { RadialMenu } from './ui/RadialMenu.js';
import { InputHandler } from './systems/InputHandler.js';
import { BarState } from './systems/BarState.js';
import { GuestManager } from './systems/GuestManager.js';
import { StationActions } from './systems/StationActions.js';
import { Notepad } from './ui/Notepad.js';
import { HUD } from './ui/HUD.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    this.renderer = new Renderer(this.ctx);
    this.radialMenu = new RadialMenu();
    this.notepad = new Notepad();
    this.hud = new HUD();

    this.gameState = GAME_STATE.TITLE;
    this.bartender = null;
    this.guestManager = new GuestManager();
    this.stationActions = new StationActions();
    this.barState = new BarState();
    this.pendingAction = null;
    this.levelTimer = 0;
    this.levelIndex = 0;
    this.level = LEVELS[0];

    // Stats tracking
    this.stats = {
      drinksServedCorrect: 0,
      drinksServedWithIssues: 0,
      drinksRejected: 0,
      drinksWasted: 0,        // dumped in sink or trashed
      billsCorrect: 0,
      billsOvercharged: 0,
      billsUndercharged: 0,
      guestsServed: 0,
      guestsAngry: 0,         // left angry
      anticipatedCorrect: 0,
      anticipatedWrong: 0,
      totalWaitTime: 0,       // sum of time guests waited for drinks
      guestsWaited: 0,        // count for averaging
      totalTips: 0,
      peakGuests: 0,          // most guests at once
    };

    this._quitConfirm = false;

    // POS state
    this.pos = {
      visible: false,
      mode: 'SELECT_SEAT', // 'SELECT_SEAT', 'SEAT_VIEW'
      selectedSeat: null,
      seatOrders: [],  // orders for selected seat
    };

    // Glass modal
    this.glassModal = {
      visible: false,
    };

    // Drink modal (taps / wine / mixer)
    this.drinkModal = {
      visible: false,
      type: null,       // 'beer', 'wine', 'mixer'
      items: [],
      stationX: 0,
      pouringIndex: -1, // which drink button is held
      pourRate: 0,      // fill per second while held
      glassX: 0,        // current animated glass x position (tap modal)
      glassTargetX: 0,  // target glass x position
    };

    // Prep/Garnish modal
    this.prepModal = {
      visible: false,
    };

    // Tunable settings — these override constants at runtime
    this.settings = {
      moodDecayMultiplier: 1.0,
      gracePeriod: MOOD_GRACE_PERIOD,
      settleTime: SETTLE_TIME,
      enjoyTimeMin: ENJOY_TIME_MIN,
      enjoyTimeMax: ENJOY_TIME_MAX,
      orderRevealTime: ORDER_REVEAL_TIME,
      spawnInterval: 1.0, // multiplier on spawn times
      levelDuration: 300,
    };

    // Settings screen scroll
    this.settingsScroll = 0;

    this.inputHandler = new InputHandler(canvas, this);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** Backward-compatible access — InputHandler, Renderer read this */
  get guests() { return this.guestManager.guests; }

  startLevel() {
    this.level = LEVELS[this.levelIndex];
    setSeatCount(this.level.seats || 3);

    // Apply per-level setting overrides
    if (this.level.settings) {
      for (const [k, v] of Object.entries(this.level.settings)) {
        if (k in this.settings) this.settings[k] = v;
      }
    }
    this.settings.levelDuration = this.level.duration;

    // Apply spawn spacing to schedule
    this.activeSchedule = this.level.spawnSchedule.map(s => ({
      ...s,
      time: s.time * this.settings.spawnInterval,
    }));
    this.activeDuration = this.settings.levelDuration;

    this.bartender = new Bartender();
    this.barState.reset();
    this.guestManager.reset();
    this.pendingAction = null;
    this.levelTimer = 0;
    this.notepad = new Notepad();
    this.hud = new HUD();
    this.hud.levelName = this.level.name;
    this.hud.timeRemaining = this.activeDuration;
    this.hud.starThresholds = this.level.starThresholds;
    this.gameState = GAME_STATE.PLAYING;
    this.radialMenu.close();
    this.pos.visible = false;
    this.drinkModal.visible = false;
    this.glassModal.visible = false;
    this.prepModal.visible = false;

    // Reset stats
    this.stats = {
      drinksServedCorrect: 0, drinksServedWithIssues: 0, drinksRejected: 0,
      drinksWasted: 0, billsCorrect: 0, billsOvercharged: 0, billsUndercharged: 0,
      guestsServed: 0, guestsAngry: 0, anticipatedCorrect: 0, anticipatedWrong: 0,
      totalWaitTime: 0, guestsWaited: 0, totalTips: 0, peakGuests: 0,
    };

    this.guestManager.setContext({
      bartender: this.bartender,
      barState: this.barState,
      hud: this.hud,
      notepad: this.notepad,
      stats: this.stats,
      settings: this.settings,
      radialMenu: this.radialMenu,
      walkThenAct: this.walkThenAct.bind(this),
      getStations: this.getStations.bind(this),
    });

    this.stationActions.setContext({
      bartender: this.bartender,
      barState: this.barState,
      hud: this.hud,
      stats: this.stats,
      walkThenAct: this.walkThenAct.bind(this),
      startPour: this.startPour.bind(this),
      getAvailableDrinks: this.getAvailableDrinks.bind(this),
      getStations: this.getStations.bind(this),
      drinkModal: this.drinkModal,
      glassModal: this.glassModal,
      prepModal: this.prepModal,
      pos: this.pos,
    });
  }

  /** Stations active in the current level */
  getStations() {
    return this.level?.stations || [];
  }

  /** Drinks available in the current level */
  getAvailableDrinks() {
    return this.level?.drinks || Object.keys(DRINKS);
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    try {
      this.update(dt);
      this.render();
    } catch (e) {
      console.error('Game loop error:', e);
      // Show error on canvas so user can report it
      this.ctx.fillStyle = 'red';
      this.ctx.font = 'bold 14px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`ERROR: ${e.message}`, 10, 30);
      this.ctx.font = '11px monospace';
      this.ctx.fillText(`${e.stack?.split('\n')[1]?.trim() || ''}`, 10, 50);
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    if (this.gameState !== GAME_STATE.PLAYING) return;

    this.levelTimer += dt;
    this.hud.timeRemaining = Math.max(0, this.activeDuration - this.levelTimer);
    this.hud.update(dt);

    // Update active pour — works for modals AND radial-initiated pours
    this.barState.updatePour(dt);

    // Animate glass slide in tap modal
    if (this.drinkModal.visible && this.drinkModal.type === 'beer') {
      const speed = 12; // lerp speed
      const dx = this.drinkModal.glassTargetX - this.drinkModal.glassX;
      this.drinkModal.glassX += dx * Math.min(1, speed * dt);
    }

    this.guestManager.spawnFromSchedule(this.levelTimer, this.activeSchedule, this.activeDuration);
    this.bartender.update(dt);

    // Check pending walk-then-act
    if (this.pendingAction && !this.bartender.busy) {
      const dist = Math.abs(this.bartender.x - this.pendingAction.targetX);
      if (dist < 8) {
        this.pendingAction.callback();
        this.pendingAction = null;
      }
    }

    // Update guests (sipping, mood, cleanup, etc.)
    this.guestManager.updateGuests(dt, this.levelTimer, this.activeDuration);

    // Check level end — also need cash to be collected and seats cleared
    if (this.levelTimer >= this.activeDuration && this.guests.length === 0 &&
        this.barState.isEmpty) {
      this.gameState = GAME_STATE.LEVEL_COMPLETE;
    }
  }

  // ─── SETTINGS SCREEN ─────────────────────────────────

  handleSettingsTap(x, y) {
    const pw = 700;
    const ph = 460;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Start button
    if (x > px + pw / 2 - 80 && x < px + pw / 2 + 80 &&
        y > py + ph - 55 && y < py + ph - 15) {
      this.startLevel();
      return;
    }

    // Settings rows
    const settings = [
      { key: 'moodDecayMultiplier', min: 0.1, max: 3.0, step: 0.1 },
      { key: 'gracePeriod',         min: 10,  max: 120, step: 5 },
      { key: 'settleTime',          min: 1,   max: 10,  step: 0.5 },
      { key: 'enjoyTimeMin',        min: 5,   max: 60,  step: 5 },
      { key: 'enjoyTimeMax',        min: 10,  max: 90,  step: 5 },
      { key: 'orderRevealTime',     min: 2,   max: 20,  step: 1 },
      { key: 'spawnInterval',       min: 0.3, max: 3.0, step: 0.1 },
      { key: 'levelDuration',       min: 60,  max: 600, step: 30 },
    ];

    const rowH = 36;
    const startY = py + 60;
    const btnSize = 32;

    for (let i = 0; i < settings.length; i++) {
      const s = settings[i];
      const ry = startY + i * rowH;

      // Minus button
      const minusBx = px + pw - 180;
      if (x > minusBx && x < minusBx + btnSize && y > ry && y < ry + btnSize) {
        this.settings[s.key] = Math.max(s.min,
          Math.round((this.settings[s.key] - s.step) * 100) / 100);
        return;
      }

      // Plus button
      const plusBx = px + pw - 60;
      if (x > plusBx && x < plusBx + btnSize && y > ry && y < ry + btnSize) {
        this.settings[s.key] = Math.min(s.max,
          Math.round((this.settings[s.key] + s.step) * 100) / 100);
        return;
      }
    }
  }

  handleTitleTap(x, y) {
    const btnW = 160;
    const btnH = 44;
    const gap = 12;
    const startY = 240;
    for (let i = 0; i < LEVELS.length; i++) {
      const by = startY + i * (btnH + gap);
      const bx = CANVAS_W / 2 - btnW / 2;
      if (x > bx && x < bx + btnW && y > by && y < by + btnH) {
        this.levelIndex = i;
        this.startLevel();
        return;
      }
    }
  }

  handleLevelCompleteTap(x, y) {
    const btnY = 480;
    if (x > CANVAS_W / 2 - 170 && x < CANVAS_W / 2 - 10 && y > btnY && y < btnY + 42) {
      this.startLevel();
      return;
    }
    if (this.levelIndex < LEVELS.length - 1) {
      if (x > CANVAS_W / 2 + 10 && x < CANVAS_W / 2 + 170 && y > btnY && y < btnY + 42) {
        this.levelIndex++;
        this.startLevel();
        return;
      }
    }
  }

  handlePauseTap(x, y) {
    const pw = 300, ph = 250;
    const pmx = (CANVAS_W - pw) / 2;
    const pmy = (CANVAS_H - ph) / 2;
    // Resume
    if (x > pmx + 50 && x < pmx + pw - 50 && y > pmy + 75 && y < pmy + 119) {
      this.gameState = GAME_STATE.PLAYING;
      this._quitConfirm = false;
      return;
    }
    // Quit
    if (x > pmx + 50 && x < pmx + pw - 50 && y > pmy + 135 && y < pmy + 179) {
      if (this._quitConfirm) {
        this.gameState = GAME_STATE.TITLE;
        this._quitConfirm = false;
        return;
      }
      this._quitConfirm = true;
      return;
    }
    this._quitConfirm = false;
  }

  stopPour() {
    this.barState.stopPour();
    if (this.drinkModal.visible) {
      this.drinkModal.pouringIndex = -1;
      if (this.drinkModal.type === 'beer') {
        const items = this.drinkModal.items;
        const tapSpacing = 80;
        const totalTapsW = (items.length - 1) * tapSpacing;
        const pw = Math.max(totalTapsW + 160, 340);
        const px = (CANVAS_W - pw) / 2;
        this.drinkModal.glassTargetX = px + 50;
      }
    }
  }

  render() {
    this.renderer.clear();

    if (this.gameState === GAME_STATE.TITLE) {
      this.renderer.drawTitleScreen(LEVELS);
      return;
    }

    if (this.gameState === GAME_STATE.SETTINGS) {
      this.renderer.drawSettingsScreen(this.settings);
      return;
    }

    this.renderer.drawBar();
    this.renderer.drawBackCounter(this.getStations(), this.getAvailableDrinks());
    this.renderer.drawDirtySeats(this.barState.dirtySeats);
    this.renderer.drawCashOnBar(this.barState.cashOnBar);
    this.renderer.drawServiceMat(this.barState.serviceMat);
    const waitingCount = this.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT).length;
    this.renderer.drawGuests(this.guests, waitingCount, this.barState.drinksAtSeats);
    this.renderer.drawDrinksAtSeats(this.barState.drinksAtSeats, this.guests);
    if (this.bartender) this.renderer.drawBartender(this.bartender, this.barState.carriedGlass);
    // Glass fill overlay — always visible when carrying a glass with contents or pouring
    if (this.barState.carriedGlass && (!this.barState.carriedGlass.isEmpty || this.barState.activePour)) {
      this.renderer.drawGlassFillOverlay(this.barState.carriedGlass, this.barState.activePour);
    }
    this.hud.draw(this.ctx, this.levelTimer, this.activeDuration);
    this.notepad.draw(this.ctx);
    this.radialMenu.draw(this.ctx);
    this.renderer.drawGlassModal(this.glassModal);
    this.renderer.drawDrinkModal(this.drinkModal, this.barState.carriedGlass, this.barState.activePour);
    this.renderer.drawPOSOverlay(this.pos, this.guests, this.barState.posTab, this.getAvailableDrinks());
    this.renderer.drawPrepModal(this.prepModal, this.barState.carriedGlass, this.barState.activePour);

    // Pause button (top-center)
    this.renderer.drawPauseButton(this.ctx);

    if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      this.renderer.drawLevelComplete(this.hud, this.levelIndex, LEVELS.length, this.stats);
    }

    if (this.gameState === GAME_STATE.PAUSED) {
      this.renderer.drawPauseMenu(this._quitConfirm);
    }
  }

  getStationRadialOptions(station) {
    return this.stationActions.getStationRadialOptions(station);
  }

  startPour(drinkKey, pourRate) {
    this.barState.startPour(drinkKey, pourRate);
    if (this.barState.activePour) {
      this.bartender.carrying = `DRINK_${drinkKey}`;
    }
  }

  // ─── PUT DOWN ───────────────────────────────────────

  putDownItem() {
    this.barState.putDownItem(this.bartender, this.hud);
  }

  // ─── GUEST INTERACTIONS ─────────────────────────────

  openGuestMenu(guest) {
    this.guestManager.openGuestMenu(guest);
  }

  walkThenAct(targetX, callback) {
    this.bartender.moveTo(targetX);
    this.pendingAction = { targetX, callback };
  }

  // ─── STATION INTERACTIONS ───────────────────────────

  handleStationTap(station) {
    this.stationActions.handleStationTap(station);
  }

  // ─── GLASS MODAL ───────────────────────────────────

  handleGlassModalTap(x, y) {
    const glassTypes = Object.keys(GLASSES);
    const btnW = 120;
    const btnH = 100;
    const gap = 25;
    const totalW = glassTypes.length * btnW + (glassTypes.length - 1) * gap;
    const pw = totalW + 60;
    const ph = 200;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;
    const startX = px + (pw - totalW) / 2;
    const btnY = py + 65;

    // Hit test glass buttons
    for (let i = 0; i < glassTypes.length; i++) {
      const bx = startX + i * (btnW + gap);
      if (x > bx && x < bx + btnW && y > btnY && y < btnY + btnH) {
        const glassKey = glassTypes[i];
        this.bartender.startAction(ACTION_DURATIONS.GLASS_RACK, 'Grabbing glass...', () => {
          this.bartender.carrying = `GLASS_${glassKey}`;
          this.barState.carriedGlass = new GlassState(glassKey);
        });
        this.glassModal.visible = false;
        return;
      }
    }

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.glassModal.visible = false;
      return;
    }

    // Outside modal
    if (x < px || x > px + pw || y < py || y > py + ph) {
      this.glassModal.visible = false;
    }
  }

  // ─── DRINK MODAL ────────────────────────────────────

  handleDrinkModalTap(x, y) {
    const modal = this.drinkModal;
    const items = modal.items;

    // Beer tap modal has different layout
    if (modal.type === 'beer') {
      return this._handleTapModalTap(x, y);
    }

    const btnW = 110;
    const btnH = 100;
    const gap = 20;
    const glassAreaW = 100;
    const totalBtnsW = items.length * btnW + (items.length - 1) * gap;
    const pw = glassAreaW + totalBtnsW + 80;
    const ph = 230;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;
    const startX = px + glassAreaW + 20;
    const btnY = py + 70;

    for (let i = 0; i < items.length; i++) {
      const bx = startX + i * (btnW + gap);
      if (x > bx && x < bx + btnW && y > btnY && y < btnY + btnH) {
        modal.pouringIndex = i;
        this.startPour(items[i], modal.pourRate);
        return;
      }
    }

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.closeDrinkModal();
      return;
    }

    // Outside modal
    if (x < px || x > px + pw || y < py || y > py + ph) {
      this.closeDrinkModal();
    }
  }

  _handleTapModalTap(x, y) {
    const modal = this.drinkModal;
    const items = modal.items;
    const tapSpacing = 80;
    const totalTapsW = (items.length - 1) * tapSpacing;
    const pw = Math.max(totalTapsW + 160, 340);
    const ph = 500;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;
    const startX = px + pw / 2 - totalTapsW / 2;
    const plateY = py + 60;

    // Hit test each tap handle/faucet area
    for (let i = 0; i < items.length; i++) {
      const tx = startX + i * tapSpacing;
      if (Math.abs(x - tx) < 35 && y > plateY && y < plateY + 245) {
        modal.pouringIndex = i;
        modal.glassTargetX = tx; // slide glass under this tap
        this.startPour(items[i], modal.pourRate);
        return;
      }
    }

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.closeDrinkModal();
      return;
    }

    // Outside modal
    if (x < px || x > px + pw || y < py || y > py + ph) {
      this.closeDrinkModal();
    }
  }

  closeDrinkModal() {
    this.stationActions.closeDrinkModal();
  }

  // ─── PREP / GARNISH MODAL ──────────────────────────

  handlePrepModalTap(x, y) {
    // Layout: prep modal has 3 rows — Ice, Garnishes, Mixer
    const pw = 520;
    const ph = 340;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.prepModal.visible = false;
      return;
    }

    // Outside modal
    if (x < px || x > px + pw || y < py || y > py + ph) {
      this.prepModal.visible = false;
      return;
    }

    // Ice button — row 1
    const iceY = py + 55;
    const iceBx = px + 20;
    if (x > iceBx && x < iceBx + 90 && y > iceY && y < iceY + 60) {
      this.addIce();
      return;
    }

    // Garnish buttons — row 2
    const garnishKeys = Object.keys(GARNISHES);
    const btnW = 80;
    const btnH = 70;
    const gap = 10;
    const garnishY = py + 130;
    const garnishStartX = px + 20;
    for (let i = 0; i < garnishKeys.length; i++) {
      const bx = garnishStartX + i * (btnW + gap);
      if (x > bx && x < bx + btnW && y > garnishY && y < garnishY + btnH) {
        this.addGarnish(garnishKeys[i]);
        return;
      }
    }

    // Mixer/Soda gun buttons — row 3 — pour directly while held
    const mixerY = py + 225;
    const mixerBtnW = 90;
    const mixerStartX = px + 20;
    for (let i = 0; i < MIXER_DRINKS.length; i++) {
      const bx = mixerStartX + i * (mixerBtnW + gap);
      if (x > bx && x < bx + mixerBtnW && y > mixerY && y < mixerY + 70) {
        this.startPour(MIXER_DRINKS[i], 1.0 / ACTION_DURATIONS.POUR_BEER);
        return;
      }
    }
  }

  addGarnish(garnishKey) {
    this.stationActions.addGarnish(garnishKey);
  }

  addIce() {
    this.stationActions.addIce();
  }

  // ─── SERVICE MAT (put-down drinks) ──────────────────

  pickUpDrink(drink) {
    this.barState.pickUpDrink(drink, this.bartender, this.hud, this.walkThenAct.bind(this));
  }

  handleSeatCleanup(seatId) {
    this.barState.handleSeatCleanup(seatId, this.bartender, this.hud, this.stats, this.walkThenAct.bind(this));
  }

  // ─── POS ────────────────────────────────────────────

  openPOS() {
    this.stationActions.openPOS();
  }

  handlePOSTap(x, y) {
    const pw = 510;
    const ph = 460;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.pos.visible = false;
      return;
    }

    // Outside modal
    if (x < px || x > px + pw || y < py || y > py + ph) {
      this.pos.visible = false;
      return;
    }

    if (this.pos.mode === 'SELECT_SEAT') {
      // Mini bar diagram — match Renderer layout
      const barMargin = 40;
      const barLeft = px + barMargin;
      const barRight = px + pw - barMargin;
      const barW = barRight - barLeft;
      const barY = py + 160;
      const seatR = 28;
      const seatCy = barY - seatR - 10;

      for (let i = 0; i < SEATS.length; i++) {
        const t = (SEATS[i].x - BAR_LEFT) / (BAR_RIGHT - BAR_LEFT);
        const sx = barLeft + t * barW;
        const dx = x - sx;
        const dy = y - seatCy;
        if (dx * dx + dy * dy <= seatR * seatR) {
          this.pos.mode = 'SEAT_VIEW';
          this.pos.selectedSeat = i;
          return;
        }
      }
    } else if (this.pos.mode === 'SEAT_VIEW') {
      const seatId = this.pos.selectedSeat;

      // Back button
      const backBx = px + 15;
      const backBy = py + 40;
      if (x > backBx && x < backBx + 60 && y > backBy && y < backBy + 25) {
        this.pos.mode = 'SELECT_SEAT';
        return;
      }

      // Print Check button
      const tab = this.barState.posTab.get(seatId) || [];
      const printBx = px + pw - 160;
      const printBy = py + ph - 55;
      if (x > printBx && x < printBx + 140 && y > printBy && y < printBy + 40) {
        if (tab.length === 0) {
          this.hud.showMessage('No drinks on tab', 1);
        } else {
          this.pos.visible = false;
          this.bartender.startAction(ACTION_DURATIONS.PRINT_CHECK, 'Printing...', () => {
            this.bartender.carrying = `CHECK_${seatId}`;
            this.hud.showMessage(`Check for Seat ${seatId + 1}`, 1.5);
          });
        }
        return;
      }

      // Tap tab item to remove
      for (let i = 0; i < tab.length; i++) {
        const itemY = py + 105 + i * 18;
        if (x > px + 20 && x < px + 250 && y > itemY - 10 && y < itemY + 8) {
          const removed = tab.splice(i, 1)[0];
          this.hud.showMessage(`Removed ${DRINKS[removed.drink]?.name}`, 1);
          return;
        }
      }

      // Drink buttons — add to POS tab (only level-available drinks)
      const drinks = this.getAvailableDrinks();
      const btnW = 105;
      const btnH = 60;
      const gap = 8;
      const cols = 4;
      const drinksY = py + 180;
      for (let i = 0; i < drinks.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = px + 20 + col * (btnW + gap);
        const by = drinksY + row * (btnH + gap);
        if (x > bx && x < bx + btnW && y > by && y < by + btnH) {
          if (!this.barState.posTab.has(seatId)) this.barState.posTab.set(seatId, []);
          this.barState.posTab.get(seatId).push({ drink: drinks[i], price: DRINKS[drinks[i]].price });
          this.hud.showMessage(`Added ${DRINKS[drinks[i]].name}`, 1);
          return;
        }
      }
    }
  }
}
