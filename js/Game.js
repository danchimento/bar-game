import {
  CANVAS_W, CANVAS_H, SEATS, STATIONS, GUEST_STATE,
  STATION_Y, SERVICE_MAT_Y,
  ACTION_DURATIONS, HIT_RADIUS,
  GAME_STATE, MOOD_MAX, BAR_TOP_Y,
} from './constants.js';
import { DRINKS } from './data/menu.js';
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
    this.serviceMat = []; // drinks put down on bar via double-tap
    this.pendingAction = null;
    this.levelTimer = 0;
    this.spawnIndex = 0;
    this.level = LEVEL_1;

    // POS state
    this.pos = {
      visible: false,
      mode: null,
      seatButtons: [],
      checkButtons: [],
    };

    // Drink modal (taps / wine)
    this.drinkModal = {
      visible: false,
      type: null, // 'beer' or 'wine'
      items: [],  // drink keys
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

    // Update guests — pass levelTimer for grace period
    for (const guest of this.guests) {
      guest.update(dt, this.levelTimer);
    }

    // Clean up done guests
    this.guests = this.guests.filter(g => {
      if (g.state === GUEST_STATE.DONE) {
        if (g.seatDirty) this.dirtySeats.add(g.seatId);
        this.notepad.removeGuest(g.id);
        return false;
      }
      return true;
    });

    // Check level end
    if (this.levelTimer >= this.level.duration && this.guests.length === 0) {
      this.gameState = GAME_STATE.LEVEL_COMPLETE;
    }
  }

  spawnGuests() {
    if (this.spawnIndex >= this.level.spawnSchedule.length) return;
    const next = this.level.spawnSchedule[this.spawnIndex];
    if (this.levelTimer >= next.time) {
      const occupiedSeats = new Set(this.guests.map(g => g.seatId));
      const available = SEATS.filter(s => !occupiedSeats.has(s.id) && !this.dirtySeats.has(s.id));
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
    this.renderer.drawServiceMat(this.serviceMat);
    this.renderer.drawGuests(this.guests);
    if (this.bartender) this.renderer.drawBartender(this.bartender);
    this.hud.draw(this.ctx);
    this.notepad.draw(this.ctx);
    this.radialMenu.draw(this.ctx);
    this.renderer.drawDrinkModal(this.drinkModal);
    this.renderer.drawPOSOverlay(this.pos);

    if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      this.renderer.drawLevelComplete(this.hud);
    }
  }

  // ─── INPUT ──────────────────────────────────────────

  setupInput() {
    // Prevent all default touch behaviors (highlighting, scrolling, zoom)
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
      // Release pour on drink modal
      if (this.drinkModal.visible && this.drinkModal.pouringIndex >= 0) {
        // Pour cancelled — not held long enough
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

    // Hit test service mat drinks (pick up put-down drinks)
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

    // Hit test dirty seats
    const dirtySeat = this.hitTestDirtySeat(x, y);
    if (dirtySeat !== null) {
      this.handleBusSeat(dirtySeat);
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
      if (Math.abs(x - seat.x) < 26 && Math.abs(y - SEAT_Y - 16) < 22) return seatId;
    }
    return null;
  }

  // ─── PUT DOWN ───────────────────────────────────────

  putDownItem() {
    const bt = this.bartender;
    if (!bt.carrying) return;

    if (bt.carrying.startsWith('DRINK_')) {
      // Put drink on service mat at bartender's current X
      const drinkType = bt.carrying.replace('DRINK_', '');
      this.serviceMat.push({ drinkType, x: bt.x });
      bt.carrying = null;
      this.hud.showMessage('Put down drink', 1);
    } else if (bt.carrying === 'CLEAN_GLASS') {
      bt.carrying = null;
      this.hud.showMessage('Put down glass', 1);
    } else if (bt.carrying.startsWith('CHECK_')) {
      // Can't really put down a check meaningfully, ignore
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

      case GUEST_STATE.PAYING:
        if (guest.cashOnBar) {
          options.push({ label: 'Collect Cash', action: () => this.collectCash(guest) });
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
        // Force ready-to-order so chooseDrink runs, then immediately take order
        guest.transitionTo(GUEST_STATE.READY_TO_ORDER);
        this.notepad.addOrder(guest.id, guest.seatId, guest.currentDrink);
        guest.orderOnNotepad = true;
        guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
        this.hud.showMessage(`Order: ${DRINKS[guest.currentDrink]?.name}`, 1.5);
      });
    });
  }

  takeOrder(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.TAKE_ORDER, 'Taking order...', () => {
        this.notepad.addOrder(guest.id, guest.seatId, guest.currentDrink);
        guest.orderOnNotepad = true;
        guest.transitionTo(GUEST_STATE.ORDER_TAKEN);
        this.hud.showMessage(`Order: ${DRINKS[guest.currentDrink]?.name}`, 1.5);
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

      this.bartender.startAction(ACTION_DURATIONS.DELIVER, 'Serving...', () => {
        this.bartender.carrying = null;

        if (drinkType === guest.currentDrink) {
          guest.transitionTo(GUEST_STATE.ENJOYING);
          const price = DRINKS[drinkType]?.price || 7;
          this.hud.revenue += price;
          guest.totalSpent += price;
          this.notepad.markFulfilled(guest.id);
          this.hud.showMessage('Served!', 1);
        } else {
          guest.mood -= 20;
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
        guest.transitionTo(GUEST_STATE.PAYING);
        this.hud.showMessage('Check delivered', 1);
      });
    });
  }

  collectCash(guest) {
    const seatX = SEATS[guest.seatId].x;
    this.walkThenAct(seatX, () => {
      this.bartender.startAction(ACTION_DURATIONS.COLLECT_CASH, 'Collecting...', () => {
        guest.cashOnBar = false;
        guest.calculateTip();
        this.hud.tips += guest.tipAmount;
        guest.transitionTo(GUEST_STATE.LEAVING);
        this.hud.showMessage(`+$${guest.tipAmount.toFixed(0)} tip!`, 1.5);
      });
    });
  }

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
          bt.startAction(ACTION_DURATIONS.GLASS_RACK, 'Grabbing glass...', () => {
            bt.carrying = 'CLEAN_GLASS';
          });
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
        if (bt.carrying !== 'CLEAN_GLASS') {
          this.hud.showMessage('Need a clean glass first', 1);
          return;
        }
        this.walkThenAct(station.x, () => {
          this.openDrinkModal('beer', station.x);
        });
        break;

      case 'WINE':
        if (bt.carrying !== 'CLEAN_GLASS') {
          this.hud.showMessage('Need a clean glass first', 1);
          return;
        }
        this.walkThenAct(station.x, () => {
          this.openDrinkModal('wine', station.x);
        });
        break;

      case 'POS':
        this.openPOS();
        break;

      case 'CHECK_PRINTER':
        this.openPOS();
        break;
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

    // Hit test drink buttons FIRST (before close button)
    for (let i = 0; i < items.length; i++) {
      const bx = startX + i * (btnW + gap);
      if (x > bx && x < bx + btnW && y > btnY && y < btnY + btnH) {
        modal.pouringIndex = i;
        modal.pourProgress = 0;
        return;
      }
    }

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      modal.visible = false;
      return;
    }

    // Tapped outside modal — close
    if (x < px || x > px + pw || y < py || y > py + ph) {
      modal.visible = false;
    }
  }

  completePour() {
    const modal = this.drinkModal;
    const drinkType = modal.items[modal.pouringIndex];

    // Drink goes directly into bartender's hands (replaces clean glass)
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

  handleBusSeat(seatId) {
    const bt = this.bartender;
    if (bt.carrying && bt.carrying !== 'DIRTY_GLASS') {
      this.hud.showMessage('Hands full!', 1);
      return;
    }
    const seatX = SEATS[seatId].x;
    this.walkThenAct(seatX, () => {
      bt.startAction(ACTION_DURATIONS.BUS, 'Bussing...', () => {
        bt.carrying = 'DIRTY_GLASS';
        this.dirtySeats.delete(seatId);
        this.hud.showMessage('Cleared!', 1);
      });
    });
  }

  // ─── POS ────────────────────────────────────────────

  openPOS() {
    const posStation = STATIONS.find(s => s.id === 'POS');
    this.walkThenAct(posStation.x, () => {
      const readyToPay = this.guests.filter(g => g.state === GUEST_STATE.READY_TO_PAY);

      if (readyToPay.length > 0) {
        this.pos.visible = true;
        this.pos.mode = 'PRINT_CHECK';
        this.pos.checkButtons = readyToPay.map(g => ({
          seatId: g.seatId,
          guestId: g.id,
          active: true,
        }));
      } else {
        this.hud.showMessage('No checks to print', 1);
      }
    });
  }

  handlePOSTap(x, y) {
    const pw = 320;
    const ph = 260;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 8 && y < py + 32) {
      this.pos.visible = false;
      return;
    }

    if (this.pos.mode === 'PRINT_CHECK') {
      this.pos.checkButtons.forEach((btn, i) => {
        const bx = px + 30 + (i % 3) * 90;
        const by = py + 75 + Math.floor(i / 3) * 45;
        if (x > bx && x < bx + 80 && y > by && y < by + 35 && btn.active) {
          this.bartender.carrying = `CHECK_${btn.seatId}`;
          this.pos.visible = false;
          this.hud.showMessage(`Check for Seat ${btn.seatId + 1}`, 1.5);
        }
      });
    }
  }
}
