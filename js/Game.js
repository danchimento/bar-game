import {
  CANVAS_W, CANVAS_H, SEATS, STATIONS, GUEST_STATE,
  STATION_Y, SERVICE_MAT_Y, SEAT_Y,
  ACTION_DURATIONS, HIT_RADIUS,
  GAME_STATE, MOOD_MAX, BAR_TOP_Y,
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

    // Double-tap tracking
    this.lastTap = { x: 0, y: 0, time: 0 };

    this.setupInput();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  startLevel() {
    this.bartender = new Bartender();
    this.guests = [];
    this.dirtySeats = new Set();
    this.cashOnBar = new Map();
    this.serviceMat = [];
    this.pendingAction = null;
    this.levelTimer = 0;
    this.spawnIndex = 0;
    this.notepad = new Notepad();
    this.hud = new HUD();
    this.hud.levelName = this.level.name;
    this.hud.timeRemaining = this.level.duration;
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
    this.hud.timeRemaining = Math.max(0, this.level.duration - this.levelTimer);
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
      guest.update(dt, this.levelTimer);
    }

    // Clean up done guests — cash stays on bar
    this.guests = this.guests.filter(g => {
      if (g.state === GUEST_STATE.DONE) {
        if (g.seatDirty) this.dirtySeats.add(g.seatId);
        // If guest left cash, put it on bar
        if (g.cashOnBar && g.totalSpent > 0) {
          this.cashOnBar.set(g.seatId, {
            amount: g.totalSpent,
            tipAmount: g.tipAmount,
          });
        }
        this.notepad.removeGuest(g.id);
        return false;
      }
      return true;
    });

    // Check level end — also need cash to be collected and seats cleared
    if (this.levelTimer >= this.level.duration && this.guests.length === 0 &&
        this.cashOnBar.size === 0 && this.dirtySeats.size === 0) {
      this.gameState = GAME_STATE.LEVEL_COMPLETE;
    }
  }

  spawnGuests() {
    if (this.spawnIndex >= this.level.spawnSchedule.length) return;
    const next = this.level.spawnSchedule[this.spawnIndex];
    if (this.levelTimer >= next.time) {
      const occupiedSeats = new Set(this.guests.map(g => g.seatId));
      const available = SEATS.filter(s =>
        !occupiedSeats.has(s.id) && !this.dirtySeats.has(s.id) && !this.cashOnBar.has(s.id)
      );
      if (available.length > 0) {
        const seat = available[Math.floor(Math.random() * available.length)];
        const guest = new Guest(seat.id, next.type, next.drinkPrefs);
        this.guests.push(guest);
        this.spawnIndex++;
      }
    }
  }

  render() {
    this.renderer.clear();

    if (this.gameState === GAME_STATE.TITLE) {
      this.renderer.drawTitleScreen();
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
    this.renderer.drawPOSOverlay(this.pos, this.guests, this.notepad);

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

    this.canvas.addEventListener('pointerup', (e) => {
      if (this.drinkModal.visible && this.drinkModal.pouringIndex >= 0) {
        this.drinkModal.pouringIndex = -1;
        this.drinkModal.pourProgress = 0;
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
        this.startLevel();
      }
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
        options.push({ label: 'Take Order', action: () => this.takeOrder(guest) });
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
        // Guest reviews check, then leaves cash and walks out
        guest.transitionTo(GUEST_STATE.REVIEWING_CHECK);
        this.hud.showMessage('Check delivered', 1);
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
      case 'CHECK_PRINTER':
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
        // Collect cash first, then bus if dirty
        bt.startAction(ACTION_DURATIONS.COLLECT_CASH, 'Collecting...', () => {
          const cash = this.cashOnBar.get(seatId);
          if (cash) {
            this.hud.tips += cash.tipAmount;
            this.cashOnBar.delete(seatId);
            this.hud.showMessage(`+$${cash.tipAmount.toFixed(0)} tip!`, 1.5);
          }
          if (hasDirty) {
            bt.startAction(ACTION_DURATIONS.BUS, 'Bussing...', () => {
              bt.carrying = 'DIRTY_GLASS';
              this.dirtySeats.delete(seatId);
            });
          }
        });
      } else {
        // Just bus
        bt.startAction(ACTION_DURATIONS.BUS, 'Bussing...', () => {
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
      const printBx = px + pw - 160;
      const printBy = py + ph - 55;
      if (x > printBx && x < printBx + 140 && y > printBy && y < printBy + 40) {
        if (guest && guest.state === GUEST_STATE.READY_TO_PAY) {
          this.bartender.carrying = `CHECK_${seatId}`;
          this.pos.visible = false;
          this.hud.showMessage(`Check for Seat ${seatId + 1}`, 1.5);
        } else {
          this.hud.showMessage('Not ready to pay yet', 1);
        }
        return;
      }

      // Drink buttons — add to order
      const drinks = Object.keys(DRINKS);
      const btnW = 85;
      const btnH = 55;
      const gap = 8;
      const drinksY = py + 180;
      for (let i = 0; i < drinks.length; i++) {
        const bx = px + 20 + i * (btnW + gap);
        if (x > bx && x < bx + btnW && y > drinksY && y < drinksY + btnH) {
          if (guest) {
            this.notepad.addOrder(guest.id, seatId, drinks[i]);
            this.hud.showMessage(`Added ${DRINKS[drinks[i]].name}`, 1);
          }
          return;
        }
      }
    }
  }
}
