import {
  CANVAS_W, CANVAS_H, SEATS, STATIONS, GUEST_STATE,
  STATION_Y, SERVICE_MAT_Y, SEAT_Y,
  ACTION_DURATIONS, HIT_RADIUS,
  GAME_STATE, MOOD_MAX, BAR_TOP_Y,
  MOOD_DECAY, MOOD_GRACE_PERIOD, SETTLE_TIME,
  ENJOY_TIME_MIN, ENJOY_TIME_MAX, ORDER_REVEAL_TIME,
} from './constants.js';
import { DRINKS, GLASSES } from './data/menu.js';
import { LEVEL_1 } from './data/level1.js';
import { Bartender } from './entities/Bartender.js';
import { Guest } from './entities/Guest.js';
import { Renderer } from './systems/Renderer.js';
import { RadialMenu } from './ui/RadialMenu.js';
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
    this.guests = [];
    this.dirtySeats = new Set();
    this.cashOnBar = new Map(); // seatId → { amount, tipAmount }
    this.posTab = new Map();    // seatId → [{ drink, price, fulfilled }]
    this.serviceMat = [];
    this.pendingAction = null;
    this.levelTimer = 0;
    this.spawnIndex = 0;
    this.level = LEVEL_1;

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

    // Drink modal (taps / wine)
    this.drinkModal = {
      visible: false,
      type: null,
      items: [],
      stationX: 0,
      pouringIndex: -1,
      pourProgress: 0,
      pourDuration: 0,
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

    // Double-tap tracking
    this.lastTap = { x: 0, y: 0, time: 0 };

    this.setupInput();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  startLevel() {
    // Apply spawn spacing to schedule
    this.activeSchedule = this.level.spawnSchedule.map(s => ({
      ...s,
      time: s.time * this.settings.spawnInterval,
    }));
    this.activeDuration = this.settings.levelDuration;

    this.bartender = new Bartender();
    this.guests = [];
    this.dirtySeats = new Set();
    this.cashOnBar = new Map();
    this.posTab = new Map();
    this.serviceMat = [];
    this.pendingAction = null;
    this.levelTimer = 0;
    this.spawnIndex = 0;
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
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    if (this.gameState !== GAME_STATE.PLAYING) return;

    this.levelTimer += dt;
    this.hud.timeRemaining = Math.max(0, this.activeDuration - this.levelTimer);
    this.hud.update(dt);

    // Update pouring in drink modal
    if (this.drinkModal.visible && this.drinkModal.pouringIndex >= 0) {
      this.drinkModal.pourProgress += dt / this.drinkModal.pourDuration;
      if (this.drinkModal.pourProgress >= 1) {
        this.completePour();
      }
    }

    this.spawnGuests();
    this.bartender.update(dt);

    // Check pending walk-then-act
    if (this.pendingAction && !this.bartender.busy) {
      const dist = Math.abs(this.bartender.x - this.pendingAction.targetX);
      if (dist < 8) {
        this.pendingAction.callback();
        this.pendingAction = null;
      }
    }

    // Update guests
    for (const guest of this.guests) {
      guest.update(dt, this.levelTimer, this.settings);
    }

    // Clean up done guests — cash stays on bar
    this.guests = this.guests.filter(g => {
      if (g.state === GUEST_STATE.DONE) {
        if (g.seatDirty && g.seatId !== null) this.dirtySeats.add(g.seatId);
        // If guest left cash, put it on bar
        if (g.cashOnBar && g.totalSpent > 0) {
          this.cashOnBar.set(g.seatId, {
            amount: g.totalSpent,
            tipAmount: g.tipAmount,
          });
        }
        this.notepad.removeGuest(g.id);
        this.posTab.delete(g.seatId);
        return false;
      }
      return true;
    });

    // Check level end — also need cash to be collected and seats cleared
    if (this.levelTimer >= this.activeDuration && this.guests.length === 0 &&
        this.cashOnBar.size === 0 && this.dirtySeats.size === 0) {
      this.gameState = GAME_STATE.LEVEL_COMPLETE;
    }
  }

  getAvailableSeats() {
    const occupiedSeats = new Set(
      this.guests.filter(g => g.seatId !== null).map(g => g.seatId)
    );
    return SEATS.filter(s =>
      !occupiedSeats.has(s.id) && !this.dirtySeats.has(s.id) && !this.cashOnBar.has(s.id)
    );
  }

  spawnGuests() {
    // Spawn new guests from schedule (always spawn, even if no seat)
    if (this.spawnIndex < this.activeSchedule.length) {
      const next = this.activeSchedule[this.spawnIndex];
      if (this.levelTimer >= next.time) {
        const available = this.getAvailableSeats();
        if (available.length > 0) {
          const seat = available[Math.floor(Math.random() * available.length)];
          const guest = new Guest(seat.id, next.type, next.drinkPrefs);
          guest.settings = this.settings;
          this.guests.push(guest);
        } else {
          // No seat — guest waits behind the bar
          const guest = new Guest(null, next.type, next.drinkPrefs);
          guest.settings = this.settings;
          this.guests.push(guest);
          this.positionWaitingGuests();
        }
        this.spawnIndex++;
      }
    }

    // Try to seat waiting guests
    const waiting = this.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
    if (waiting.length > 0) {
      const available = this.getAvailableSeats();
      for (const guest of waiting) {
        if (available.length === 0) break;
        const seat = available.shift();
        guest.assignSeat(seat.id);
      }
      this.positionWaitingGuests();
    }
  }

  positionWaitingGuests() {
    const waiting = this.guests.filter(g => g.state === GUEST_STATE.WAITING_FOR_SEAT);
    const startX = 480 - (waiting.length - 1) * 40 / 2;
    waiting.forEach((g, i) => {
      g.x = startX + i * 40;
    });
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

  render() {
    this.renderer.clear();

    if (this.gameState === GAME_STATE.TITLE) {
      this.renderer.drawTitleScreen();
      return;
    }

    if (this.gameState === GAME_STATE.SETTINGS) {
      this.renderer.drawSettingsScreen(this.settings);
      return;
    }

    this.renderer.drawBar();
    this.renderer.drawStations();
    this.renderer.drawDirtySeats(this.dirtySeats);
    this.renderer.drawCashOnBar(this.cashOnBar);
    this.renderer.drawServiceMat(this.serviceMat);
    this.renderer.drawGuests(this.guests);
    if (this.bartender) this.renderer.drawBartender(this.bartender);
    this.hud.draw(this.ctx);
    this.notepad.draw(this.ctx);
    this.radialMenu.draw(this.ctx);
    this.renderer.drawGlassModal(this.glassModal);
    this.renderer.drawDrinkModal(this.drinkModal);
    this.renderer.drawPOSOverlay(this.pos, this.guests, this.posTab);

    if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      this.renderer.drawLevelComplete(this.hud);
    }
  }

  // ─── INPUT ──────────────────────────────────────────

  setupInput() {
    for (const evt of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
      this.canvas.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
    }

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handlePointerDown(x, y);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.radialMenu.visible && this.radialMenu.dragging) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.radialMenu.updateHover(x, y);
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (this.drinkModal.visible && this.drinkModal.pouringIndex >= 0) {
        this.drinkModal.pouringIndex = -1;
        this.drinkModal.pourProgress = 0;
      }

      // Drag-release on radial menu
      if (this.radialMenu.visible && this.radialMenu.dragging) {
        this.radialMenu.dragging = false;
        const idx = this.radialMenu.hoveredIndex;
        if (idx >= 0) {
          const option = this.radialMenu.options[idx];
          if (option.action && !option.disabled) {
            option.action();
          }
          this.radialMenu.close();
        }
        // If released outside any option, menu stays open for a regular tap
      }
    });
  }

  handlePointerDown(x, y) {
    const now = performance.now();
    const isDoubleTap = (now - this.lastTap.time < 350) &&
      Math.abs(x - this.lastTap.x) < 30 && Math.abs(y - this.lastTap.y) < 30;
    this.lastTap = { x, y, time: now };

    // Title screen
    if (this.gameState === GAME_STATE.TITLE) {
      if (x > CANVAS_W / 2 - 90 && x < CANVAS_W / 2 + 90 && y > 270 && y < 320) {
        this.gameState = GAME_STATE.SETTINGS;
      }
      return;
    }

    // Settings screen
    if (this.gameState === GAME_STATE.SETTINGS) {
      this.handleSettingsTap(x, y);
      return;
    }

    // Level complete
    if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      if (x > CANVAS_W / 2 - 80 && x < CANVAS_W / 2 + 80 && y > 340 && y < 385) {
        this.startLevel();
      }
      return;
    }

    if (this.gameState !== GAME_STATE.PLAYING) return;

    // Glass modal
    if (this.glassModal.visible) {
      this.handleGlassModalTap(x, y);
      return;
    }

    // Drink modal
    if (this.drinkModal.visible) {
      this.handleDrinkModalTap(x, y);
      return;
    }

    // POS overlay
    if (this.pos.visible) {
      this.handlePOSTap(x, y);
      return;
    }

    // Radial menu
    if (this.radialMenu.visible) {
      const hit = this.radialMenu.hitTest(x, y);
      if (hit >= 0) {
        const option = this.radialMenu.options[hit];
        if (option.action && !option.disabled) {
          option.action();
        }
        this.radialMenu.close();
      } else if (hit === -2) {
        this.radialMenu.close();
      }
      return;
    }

    // Double-tap to put down carried item
    if (isDoubleTap && this.bartender.carrying) {
      this.putDownItem();
      return;
    }

    // Hit test guests
    const guest = this.hitTestGuest(x, y);
    if (guest) {
      this.openGuestMenu(guest);
      return;
    }

    // Hit test dirty seats & cash — combined so tapping the seat area handles both
    const dirtySeat = this.hitTestDirtySeat(x, y);
    const cashSeat = this.hitTestCash(x, y);
    if (dirtySeat !== null || cashSeat !== null) {
      const seatId = dirtySeat !== null ? dirtySeat : cashSeat;
      this.handleSeatCleanup(seatId);
      return;
    }

    // Hit test service mat drinks
    const drink = this.hitTestServiceMat(x, y);
    if (drink) {
      this.pickUpDrink(drink);
      return;
    }

    // Hit test stations
    const station = this.hitTestStation(x, y);
    if (station) {
      this.handleStationTap(station);
      return;
    }

    // Tap on bar area to move
    if (y > BAR_TOP_Y && y < STATION_Y + 40) {
      this.bartender.moveTo(x);
      this.pendingAction = null;
    }
  }

  hitTestGuest(x, y) {
    for (const g of this.guests) {
      if (g.state === GUEST_STATE.DONE || g.state === GUEST_STATE.LEAVING ||
          g.state === GUEST_STATE.ANGRY_LEAVING) continue;
      const dx = x - g.x;
      const dy = y - g.y;
      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) return g;
    }
    return null;
  }

  hitTestStation(x, y) {
    for (const st of STATIONS) {
      const dx = x - st.x;
      const dy = y - STATION_Y;
      if (Math.abs(dx) < 45 && Math.abs(dy) < 34) return st;
    }
    return null;
  }

  hitTestServiceMat(x, y) {
    for (const drink of this.serviceMat) {
      const dx = x - drink.x;
      const dy = y - (SERVICE_MAT_Y + 12);
      if (Math.abs(dx) < 20 && Math.abs(dy) < 16) return drink;
    }
    return null;
  }

  hitTestDirtySeat(x, y) {
    for (const seatId of this.dirtySeats) {
      const seat = SEATS[seatId];
      if (Math.abs(x - seat.x) < 35 && Math.abs(y - SEAT_Y - 16) < 30) return seatId;
    }
    return null;
  }

  hitTestCash(x, y) {
    for (const [seatId] of this.cashOnBar) {
      const seat = SEATS[seatId];
      // Cash appears on the bar top near the seat
      if (Math.abs(x - seat.x) < 26 && Math.abs(y - (BAR_TOP_Y + 10)) < 18) return seatId;
    }
    return null;
  }

  // ─── PUT DOWN ───────────────────────────────────────

  putDownItem() {
    const bt = this.bartender;
    if (!bt.carrying) return;

    if (bt.carrying.startsWith('DRINK_')) {
      const drinkType = bt.carrying.replace('DRINK_', '');
      this.serviceMat.push({ drinkType, x: bt.x });
      bt.carrying = null;
      this.hud.showMessage('Put down drink', 1);
    } else if (bt.carrying.startsWith('GLASS_')) {
      bt.carrying = null;
      this.hud.showMessage('Put down glass', 1);
    } else if (bt.carrying.startsWith('CHECK_')) {
      this.hud.showMessage("Can't put that down here", 1);
    }
  }

  // ─── GUEST INTERACTIONS ─────────────────────────────

  openGuestMenu(guest) {
    const options = [];
    const bt = this.bartender;

    switch (guest.state) {
      case GUEST_STATE.SEATED:
        if (!guest.greeted) {
          options.push({ label: 'Greet', action: () => this.greetGuest(guest) });
          options.push({ label: 'Greet & Order', action: () => this.greetAndOrder(guest) });
        }
        break;

      case GUEST_STATE.READY_TO_ORDER:
        options.push({ label: 'Take Order', action: () => this.takeOrder(guest) });
        break;

      case GUEST_STATE.WAITING_FOR_DRINK:
        if (bt.carrying && bt.carrying.startsWith('DRINK_')) {
          options.push({ label: 'Serve', action: () => this.serveDrink(guest) });
        }
        if (!guest.orderOnNotepad) {
          options.push({ label: '📝 Write Down', action: () => this.writeDownOrder(guest) });
        }
        break;

      case GUEST_STATE.ENJOYING:
        options.push({ label: 'Check In', action: () => this.checkIn(guest) });
        break;

      case GUEST_STATE.WANTS_ANOTHER:
        options.push({ label: 'Another One', action: () => this.takeOrder(guest) });
        break;

      case GUEST_STATE.READY_TO_PAY:
        if (bt.carrying && bt.carrying === `CHECK_${guest.seatId}`) {
          options.push({ label: 'Give Check', action: () => this.giveCheck(guest) });
        }
        break;
    }

    if (options.length > 0) {
      this.radialMenu.open(guest.x, guest.y - 30, options);
    }
  }

  walkThenAct(targetX, callback) {
    this.bartender.moveTo(targetX);
    this.pendingAction = { targetX, callback };
  }

  greetGuest(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.GREET, 'Greeting...', () => {
        guest.greeted = true;
        guest.mood = Math.min(MOOD_MAX, guest.mood + 10);
        if (guest.stateTimer <= 0) {
          guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
        }
        this.hud.showMessage('Greeted!', 1);
      });
    });
  }

  greetAndOrder(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.GREET + ACTION_DURATIONS.TAKE_ORDER, 'Greet & order...', () => {
        guest.greeted = true;
        guest.mood = Math.min(MOOD_MAX, guest.mood + 10);
        guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
        guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
        this.hud.showMessage(`Order: ${DRINKS[guest.currentDrink]?.name}`, 1.5);
      });
    });
  }

  takeOrder(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.TAKE_ORDER, 'Taking order...', () => {
        guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
        this.hud.showMessage(`Order: ${DRINKS[guest.currentDrink]?.name}`, 1.5);
      });
    });
  }

  writeDownOrder(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.TAKE_ORDER, 'Writing...', () => {
        this.notepad.addOrder(guest.id, guest.seatId, guest.currentDrink);
        guest.orderOnNotepad = true;
        guest.orderWrittenDown = true;
        this.hud.showMessage('Order noted', 1);
      });
    });
  }

  serveDrink(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      const carrying = this.bartender.carrying;
      if (!carrying || !carrying.startsWith('DRINK_')) {
        this.hud.showMessage('Not carrying a drink!', 1.5);
        return;
      }
      const drinkType = carrying.replace('DRINK_', '');
      const drinkDef = DRINKS[drinkType];
      const wantedDef = DRINKS[guest.currentDrink];

      this.bartender.startAction(ACTION_DURATIONS.DELIVER, 'Serving...', () => {
        this.bartender.carrying = null;

        if (drinkType === guest.currentDrink) {
          // Correct drink
          guest.drinksServed.push(drinkType);
          guest.transitionTo(GUEST_STATE.ENJOYING);
          this.hud.revenue += drinkDef.price;
          guest.totalSpent += drinkDef.price;
          this.notepad.markFulfilled(guest.id);
          this.hud.showMessage('Served!', 1);
        } else if (drinkDef && wantedDef && drinkDef.glass !== wantedDef.glass) {
          // Wrong glass type
          guest.mood -= 15;
          this.hud.showMessage('Wrong glass!', 1.5);
        } else {
          // Wrong drink entirely
          guest.mood -= 25;
          this.hud.showMessage('Wrong drink!', 1.5);
        }
      });
    });
  }

  checkIn(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.CHECK_IN, 'Checking in...', () => {
        guest.mood = Math.min(MOOD_MAX, guest.mood + 8);
        guest.checkedIn = true;
        this.hud.showMessage('Checked in!', 1);
      });
    });
  }

  giveCheck(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      if (this.bartender.carrying !== `CHECK_${guest.seatId}`) return;
      this.bartender.startAction(ACTION_DURATIONS.DELIVER, 'Giving check...', () => {
        this.bartender.carrying = null;

        // Compare POS tab vs what guest actually received
        const tab = this.posTab.get(guest.seatId) || [];
        const tabTotal = tab.reduce((sum, e) => sum + e.price, 0);
        const servedTotal = guest.totalSpent;

        if (tabTotal > servedTotal) {
          // Overcharged — guest notices, tip is gone
          guest.overcharged = true;
          this.hud.showMessage('Overcharged!', 2);
        } else if (tabTotal < servedTotal) {
          // Undercharged — guest says nothing, you lose the difference
          const lost = servedTotal - tabTotal;
          this.hud.revenue -= lost;
          guest.totalSpent = tabTotal;
          this.hud.showMessage('Check delivered', 1);
        } else {
          this.hud.showMessage('Check delivered', 1);
        }

        guest.transitionTo(GUEST_STATE.REVIEWING_CHECK);
      });
    });
  }

  // Cash collection is now handled by handleSeatCleanup

  // ─── STATION INTERACTIONS ───────────────────────────

  handleStationTap(station) {
    const bt = this.bartender;

    switch (station.id) {
      case 'GLASS_RACK':
        if (bt.carrying) {
          this.hud.showMessage('Hands full!', 1);
          return;
        }
        this.walkThenAct(station.x, () => {
          this.openGlassModal();
        });
        break;

      case 'DISHWASHER':
        if (bt.carrying !== 'DIRTY_GLASS') {
          this.hud.showMessage('Need dirty glasses', 1);
          return;
        }
        this.walkThenAct(station.x, () => {
          bt.startAction(ACTION_DURATIONS.DISHWASHER, 'Loading...', () => {
            bt.carrying = null;
            this.hud.showMessage('Glasses cleaned', 1);
          });
        });
        break;

      case 'TAPS':
        if (!bt.carrying || !bt.carrying.startsWith('GLASS_')) {
          this.hud.showMessage('Need a glass first', 1);
          return;
        }
        this.walkThenAct(station.x, () => {
          this.openDrinkModal('beer', station.x);
        });
        break;

      case 'WINE':
        if (!bt.carrying || !bt.carrying.startsWith('GLASS_')) {
          this.hud.showMessage('Need a glass first', 1);
          return;
        }
        this.walkThenAct(station.x, () => {
          this.openDrinkModal('wine', station.x);
        });
        break;

      case 'POS':
        this.openPOS();
        break;
    }
  }

  // ─── GLASS MODAL ───────────────────────────────────

  openGlassModal() {
    this.glassModal.visible = true;
  }

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

  openDrinkModal(type, stationX) {
    this.drinkModal.visible = true;
    this.drinkModal.type = type;
    this.drinkModal.stationX = stationX;
    this.drinkModal.pouringIndex = -1;
    this.drinkModal.pourProgress = 0;

    if (type === 'beer') {
      this.drinkModal.items = ['LAGER', 'IPA', 'STOUT'];
      this.drinkModal.pourDuration = ACTION_DURATIONS.POUR_BEER;
    } else {
      this.drinkModal.items = ['RED_WINE', 'WHITE_WINE'];
      this.drinkModal.pourDuration = ACTION_DURATIONS.POUR_WINE;
    }
  }

  handleDrinkModalTap(x, y) {
    const modal = this.drinkModal;
    const items = modal.items;
    const btnW = 110;
    const btnH = 100;
    const gap = 20;
    const totalW = items.length * btnW + (items.length - 1) * gap;
    const pw = totalW + 60;
    const ph = 210;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;
    const startX = px + (pw - totalW) / 2;
    const btnY = py + 70;

    for (let i = 0; i < items.length; i++) {
      const bx = startX + i * (btnW + gap);
      if (x > bx && x < bx + btnW && y > btnY && y < btnY + btnH) {
        modal.pouringIndex = i;
        modal.pourProgress = 0;
        return;
      }
    }

    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      modal.visible = false;
      return;
    }

    if (x < px || x > px + pw || y < py || y > py + ph) {
      modal.visible = false;
    }
  }

  completePour() {
    const modal = this.drinkModal;
    const drinkType = modal.items[modal.pouringIndex];

    this.bartender.carrying = `DRINK_${drinkType}`;
    this.hud.showMessage(`${DRINKS[drinkType]?.name} poured!`, 1);

    modal.visible = false;
    modal.pouringIndex = -1;
    modal.pourProgress = 0;
  }

  // ─── SERVICE MAT (put-down drinks) ──────────────────

  pickUpDrink(drink) {
    const bt = this.bartender;
    if (bt.carrying) {
      this.hud.showMessage('Hands full!', 1);
      return;
    }
    this.walkThenAct(drink.x, () => {
      bt.carrying = `DRINK_${drink.drinkType}`;
      this.serviceMat = this.serviceMat.filter(d => d !== drink);
    });
  }

  handleSeatCleanup(seatId) {
    const bt = this.bartender;
    const hasCash = this.cashOnBar.has(seatId);
    const hasDirty = this.dirtySeats.has(seatId);

    if (!hasCash && !hasDirty) return;

    if (bt.carrying && bt.carrying !== 'DIRTY_GLASS') {
      this.hud.showMessage('Hands full!', 1);
      return;
    }

    const seatX = SEATS[seatId].x;
    this.walkThenAct(seatX, () => {
      if (hasCash) {
        // Collect cash first
        bt.startAction(ACTION_DURATIONS.COLLECT_CASH, 'Collecting...', () => {
          const cash = this.cashOnBar.get(seatId);
          if (cash) {
            this.hud.tips += cash.tipAmount;
            this.cashOnBar.delete(seatId);
            this.hud.showMessage(`+$${cash.tipAmount.toFixed(0)} tip!`, 1.5);
          }
          // Then bus if dirty — chain automatically
          if (this.dirtySeats.has(seatId)) {
            bt.startAction(ACTION_DURATIONS.BUS, 'Clearing...', () => {
              bt.carrying = 'DIRTY_GLASS';
              this.dirtySeats.delete(seatId);
            });
          }
        });
      } else if (hasDirty) {
        bt.startAction(ACTION_DURATIONS.BUS, 'Clearing...', () => {
          bt.carrying = 'DIRTY_GLASS';
          this.dirtySeats.delete(seatId);
          this.hud.showMessage('Cleared!', 1);
        });
      }
    });
  }

  // ─── POS ────────────────────────────────────────────

  openPOS() {
    const posStation = STATIONS.find(s => s.id === 'POS');
    this.walkThenAct(posStation.x, () => {
      this.pos.visible = true;
      this.pos.mode = 'SELECT_SEAT';
      this.pos.selectedSeat = null;
    });
  }

  handlePOSTap(x, y) {
    const pw = 500;
    const ph = 380;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.pos.visible = false;
      return;
    }

    if (this.pos.mode === 'SELECT_SEAT') {
      // Seat buttons
      for (let i = 0; i < SEATS.length; i++) {
        const bx = px + 20 + (i % 3) * 155;
        const by = py + 70 + Math.floor(i / 3) * 55;
        if (x > bx && x < bx + 140 && y > by && y < by + 42) {
          const guest = this.guests.find(g => g.seatId === i &&
            g.state !== GUEST_STATE.DONE && g.state !== GUEST_STATE.LEAVING &&
            g.state !== GUEST_STATE.ANGRY_LEAVING);
          if (guest) {
            this.pos.mode = 'SEAT_VIEW';
            this.pos.selectedSeat = i;
          }
        }
      }
    } else if (this.pos.mode === 'SEAT_VIEW') {
      const seatId = this.pos.selectedSeat;
      const guest = this.guests.find(g => g.seatId === seatId &&
        g.state !== GUEST_STATE.DONE && g.state !== GUEST_STATE.LEAVING &&
        g.state !== GUEST_STATE.ANGRY_LEAVING);

      // Back button
      const backBx = px + 15;
      const backBy = py + 40;
      if (x > backBx && x < backBx + 60 && y > backBy && y < backBy + 25) {
        this.pos.mode = 'SELECT_SEAT';
        return;
      }

      // Print Check button
      const tab = this.posTab.get(seatId) || [];
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

      // Drink buttons — add to POS tab
      const drinks = Object.keys(DRINKS);
      const btnW = 85;
      const btnH = 55;
      const gap = 8;
      const drinksY = py + 180;
      for (let i = 0; i < drinks.length; i++) {
        const bx = px + 20 + i * (btnW + gap);
        if (x > bx && x < bx + btnW && y > drinksY && y < drinksY + btnH) {
          if (guest) {
            if (!this.posTab.has(seatId)) this.posTab.set(seatId, []);
            this.posTab.get(seatId).push({ drink: drinks[i], price: DRINKS[drinks[i]].price });
            this.hud.showMessage(`Added ${DRINKS[drinks[i]].name}`, 1);
          }
          return;
        }
      }
    }
  }
}
