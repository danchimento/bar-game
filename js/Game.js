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
    this.serviceMat = []; // [{ drinkType, x, forGuestId }]
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
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap dt
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

    // Spawn guests
    this.spawnGuests();

    // Update bartender
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
      guest.update(dt);
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
      // Find an available seat
      const occupiedSeats = new Set(this.guests.map(g => g.seatId));
      const dirtySeatSet = this.dirtySeats;
      const available = SEATS.filter(s => !occupiedSeats.has(s.id) && !dirtySeatSet.has(s.id));
      if (available.length > 0) {
        const seat = available[Math.floor(Math.random() * available.length)];
        const guest = new Guest(seat.id, next.type, next.drinkPrefs);
        this.guests.push(guest);
        this.spawnIndex++;
      }
      // If no seat available, delay slightly (will retry next frame)
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
    this.renderer.drawPOSOverlay(this.pos);

    if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      this.renderer.drawLevelComplete(this.hud);
    }
  }

  // ─── INPUT ──────────────────────────────────────────

  setupInput() {
    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handleTap(x, y);
    });
  }

  handleTap(x, y) {
    // Title screen
    if (this.gameState === GAME_STATE.TITLE) {
      if (x > CANVAS_W / 2 - 80 && x < CANVAS_W / 2 + 80 && y > 300 && y < 345) {
        this.startLevel();
      }
      return;
    }

    // Level complete
    if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
      if (x > CANVAS_W / 2 - 70 && x < CANVAS_W / 2 + 70 && y > 350 && y < 390) {
        this.startLevel();
      }
      return;
    }

    if (this.gameState !== GAME_STATE.PLAYING) return;

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

    // Hit test guests
    const guest = this.hitTestGuest(x, y);
    if (guest) {
      this.openGuestMenu(guest);
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

    // Hit test dirty seats
    const dirtySeat = this.hitTestDirtySeat(x, y);
    if (dirtySeat !== null) {
      this.handleBusSeat(dirtySeat);
      return;
    }

    // Tap on walk track area to move
    if (y > BAR_TOP_Y && y < STATION_Y + 30) {
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
      if (Math.abs(dx) < 32 && Math.abs(dy) < 28) return st;
    }
    return null;
  }

  hitTestServiceMat(x, y) {
    for (const drink of this.serviceMat) {
      const dx = x - drink.x;
      const dy = y - (SERVICE_MAT_Y + 10);
      if (Math.abs(dx) < 16 && Math.abs(dy) < 14) return drink;
    }
    return null;
  }

  hitTestDirtySeat(x, y) {
    for (const seatId of this.dirtySeats) {
      const seat = SEATS[seatId];
      if (Math.abs(x - seat.x) < 24 && Math.abs(y - SEAT_Y - 15) < 20) return seatId;
    }
    return null;
  }

  // ─── GUEST INTERACTIONS ─────────────────────────────

  openGuestMenu(guest) {
    const options = [];
    const bt = this.bartender;

    switch (guest.state) {
      case GUEST_STATE.SEATED:
        if (!guest.greeted) {
          options.push({ label: 'Greet', action: () => this.greetGuest(guest) });
        }
        break;

      case GUEST_STATE.READY_TO_ORDER:
        options.push({ label: 'Take Order', action: () => this.takeOrder(guest) });
        break;

      case GUEST_STATE.WAITING_FOR_DRINK:
        if (bt.carrying && bt.carrying === `DRINK_${guest.currentDrink}`) {
          options.push({ label: 'Serve', action: () => this.serveDrink(guest) });
        } else if (bt.carrying && bt.carrying.startsWith('DRINK_')) {
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
        if (bt.carrying === `CHECK_${guest.seatId}`) {
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
          // Correct drink
          guest.transitionTo(GUEST_STATE.ENJOYING);
          const price = DRINKS[drinkType]?.price || 7;
          this.hud.revenue += price;
          guest.totalSpent += price;
          this.notepad.markFulfilled(guest.id);
          this.hud.showMessage('Served!', 1);
        } else {
          // Wrong drink
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

      case 'TAP_LAGER':
      case 'TAP_IPA':
      case 'TAP_STOUT':
      case 'WINE_RED':
      case 'WINE_WHITE':
        this.handleDrinkStation(station);
        break;

      case 'POS':
        this.openPOS();
        break;
    }
  }

  handleDrinkStation(station) {
    const bt = this.bartender;
    if (bt.carrying !== 'CLEAN_GLASS') {
      this.hud.showMessage('Need a clean glass', 1);
      return;
    }

    // Map station to drink type
    const stationToDrink = {
      'TAP_LAGER': 'LAGER',
      'TAP_IPA': 'IPA',
      'TAP_STOUT': 'STOUT',
      'WINE_RED': 'RED_WINE',
      'WINE_WHITE': 'WHITE_WINE',
    };
    const drinkType = stationToDrink[station.id];
    if (!drinkType) return;

    this.walkThenAct(station.x, () => {
      const dur = ACTION_DURATIONS[station.id] || 1.5;
      bt.startAction(dur, `Pouring ${DRINKS[drinkType]?.name}...`, () => {
        bt.carrying = null;
        // Place on service mat near station
        this.serviceMat.push({
          drinkType,
          x: station.x,
          forGuestId: null,
        });
        this.hud.showMessage(`${DRINKS[drinkType]?.name} ready!`, 1);
      });
    });
  }

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
    // Walk to POS first
    const posStation = STATIONS.find(s => s.id === 'POS');
    this.walkThenAct(posStation.x, () => {
      // Determine mode: if guests are READY_TO_PAY, show print check option
      // Otherwise show ring-in option
      const readyToPay = this.guests.filter(g => g.state === GUEST_STATE.READY_TO_PAY);
      const waitingForRingIn = this.guests.filter(g =>
        g.state === GUEST_STATE.ORDER_TAKEN || g.state === GUEST_STATE.WAITING_FOR_DRINK
      );

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
    const pw = 300;
    const ph = 280;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Close button
    if (x > px + pw - 40 && x < px + pw - 10 && y > py + 5 && y < py + 25) {
      this.pos.visible = false;
      return;
    }

    if (this.pos.mode === 'PRINT_CHECK') {
      this.pos.checkButtons.forEach((btn, i) => {
        const bx = px + 30 + (i % 3) * 90;
        const by = py + 70 + Math.floor(i / 3) * 40;
        if (x > bx && x < bx + 80 && y > by && y < by + 30 && btn.active) {
          // Print check
          this.bartender.carrying = `CHECK_${btn.seatId}`;
          this.pos.visible = false;
          this.hud.showMessage(`Check for Seat ${btn.seatId + 1}`, 1.5);
        }
      });
    }
  }
}
