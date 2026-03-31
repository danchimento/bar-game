import {
  CANVAS_W, CANVAS_H, SEATS, GUEST_STATE,
  STATION_Y, SERVICE_MAT_Y, SEAT_Y,
  HIT_RADIUS, GAME_STATE, BAR_TOP_Y,
} from '../constants.js';

export class InputHandler {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;

    // Long-press tracking
    this.longPressTimer = null;
    this.longPressThreshold = 250; // ms
    this.longPressFired = false;
    this.pendingStationTap = null;
    this._radialPouring = false;
    this.pointerDownPos = { x: 0, y: 0 };

    // Double-tap tracking
    this.lastTap = { x: 0, y: 0, time: 0 };

    this.setupInput();
  }

  setupInput() {
    const canvas = this.canvas;

    for (const evt of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
      canvas.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const { x, y } = this.canvasCoords(e);
      this.pointerDownPos = { x, y };
      this.longPressFired = false;

      // Start long-press timer for stations
      this.clearLongPress();
      this.longPressTimer = setTimeout(() => {
        this.longPressTimer = null;
        if (this.handleLongPress(x, y)) {
          this.longPressFired = true;
        }
      }, this.longPressThreshold);

      this.handlePointerDown(x, y);
    });

    canvas.addEventListener('pointermove', (e) => {
      const { x, y } = this.canvasCoords(e);
      const game = this.game;

      if (game.radialMenu.visible && game.radialMenu.dragging) {
        game.radialMenu.updateHover(x, y);
        // Hover-pour: start/stop pouring based on hovered radial option
        const idx = game.radialMenu.hoveredIndex;
        const opt = idx >= 0 ? game.radialMenu.options[idx] : null;
        if (opt && opt.pourKey && !opt.disabled) {
          if (!game.barState.activePour || game.barState.activePour.drinkKey !== opt.pourKey) {
            game.bartender.moveTo(opt.stationX);
            game.startPour(opt.pourKey, opt.pourRate);
            this._radialPouring = true;
          }
        } else if (this._radialPouring) {
          game.stopPour();
          this._radialPouring = false;
        }
      }

      // Cancel long-press if finger moves too far
      if (this.longPressTimer) {
        const dx = x - this.pointerDownPos.x;
        const dy = y - this.pointerDownPos.y;
        if (dx * dx + dy * dy > 20 * 20) {
          this.clearLongPress();
        }
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const game = this.game;
      this.clearLongPress();

      // Stop any active pour
      if (game.barState.activePour) {
        game.stopPour();
      }

      // Drag-release on radial menu — always close on release
      if (game.radialMenu.visible && game.radialMenu.dragging) {
        game.radialMenu.dragging = false;
        this._radialPouring = false;
        const idx = game.radialMenu.hoveredIndex;
        if (idx >= 0) {
          const option = game.radialMenu.options[idx];
          if (option.action && !option.disabled && !option.pourKey) {
            option.action();
          }
        }
        game.radialMenu.close();
        this.pendingStationTap = null;
      }

      // Deferred station tap — only fire if long-press didn't activate
      if (this.pendingStationTap && !this.longPressFired) {
        game.handleStationTap(this.pendingStationTap);
      }
      this.pendingStationTap = null;
      this.longPressFired = false;
    });
  }

  canvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  handleLongPress(x, y) {
    const game = this.game;
    if (game.gameState !== GAME_STATE.PLAYING) return false;
    if (game.radialMenu.visible || game.prepModal.visible || game.pos.visible ||
        game.glassModal.visible || game.drinkModal.visible) return false;

    const station = this.hitTestStation(x, y);
    if (!station) return false;

    const options = game.getStationRadialOptions(station);
    if (options.length === 0) return false;

    game.radialMenu.open(station.x, STATION_Y - 40, options);
    return true;
  }

  handlePointerDown(x, y) {
    const game = this.game;
    const now = performance.now();
    const isDoubleTap = (now - this.lastTap.time < 350) &&
      Math.abs(x - this.lastTap.x) < 30 && Math.abs(y - this.lastTap.y) < 30;
    this.lastTap = { x, y, time: now };

    // Title screen — level select buttons
    if (game.gameState === GAME_STATE.TITLE) {
      game.handleTitleTap(x, y);
      return;
    }

    // Settings screen
    if (game.gameState === GAME_STATE.SETTINGS) {
      game.handleSettingsTap(x, y);
      return;
    }

    // Level complete
    if (game.gameState === GAME_STATE.LEVEL_COMPLETE) {
      game.handleLevelCompleteTap(x, y);
      return;
    }

    // Pause menu
    if (game.gameState === GAME_STATE.PAUSED) {
      game.handlePauseTap(x, y);
      return;
    }

    if (game.gameState !== GAME_STATE.PLAYING) return;

    // Pause button (top-center) — large tap zone
    if (x > CANVAS_W / 2 - 80 && x < CANVAS_W / 2 + 80 && y < 60) {
      this.clearLongPress();
      game.gameState = GAME_STATE.PAUSED;
      game._quitConfirm = false;
      return;
    }

    // Glass modal
    if (game.glassModal.visible) {
      game.handleGlassModalTap(x, y);
      return;
    }

    // Drink modal — hold to pour
    if (game.drinkModal.visible) {
      game.handleDrinkModalTap(x, y);
      return;
    }

    // Prep/Garnish modal
    if (game.prepModal.visible) {
      game.handlePrepModalTap(x, y);
      return;
    }

    // POS overlay
    if (game.pos.visible) {
      game.handlePOSTap(x, y);
      return;
    }

    // Radial menu
    if (game.radialMenu.visible) {
      const hit = game.radialMenu.hitTest(x, y);
      if (hit >= 0) {
        const option = game.radialMenu.options[hit];
        if (option.action && !option.disabled) {
          option.action();
        }
        game.radialMenu.close();
      } else if (hit === -2) {
        game.radialMenu.close();
      }
      return;
    }

    // Double-tap to put down carried item
    if (isDoubleTap && game.bartender.carrying) {
      game.putDownItem();
      return;
    }

    // Hit test guests
    const guest = this.hitTestGuest(x, y);
    if (guest) {
      this.clearLongPress();
      game.openGuestMenu(guest);
      return;
    }

    // Hit test dirty seats & cash
    const dirtySeat = this.hitTestDirtySeat(x, y);
    const cashSeat = this.hitTestCash(x, y);
    if (dirtySeat !== null || cashSeat !== null) {
      this.clearLongPress();
      const seatId = dirtySeat !== null ? dirtySeat : cashSeat;
      game.handleSeatCleanup(seatId);
      return;
    }

    // Hit test service mat drinks
    const drink = this.hitTestServiceMat(x, y);
    if (drink) {
      this.clearLongPress();
      game.pickUpDrink(drink);
      return;
    }

    // Hit test stations — defer to pointerup for tap vs long-press
    const station = this.hitTestStation(x, y);
    if (station) {
      this.pendingStationTap = station;
      return;
    }

    // Tap on bar area to move
    if (y > BAR_TOP_Y && y < STATION_Y + 40) {
      this.clearLongPress();
      game.bartender.moveTo(x);
      game.pendingAction = null;
    }
  }

  // ─── HIT TESTS ────────────────────────────────────

  hitTestGuest(x, y) {
    for (const g of this.game.guests) {
      if (g.state === GUEST_STATE.DONE || g.state === GUEST_STATE.LEAVING ||
          g.state === GUEST_STATE.ANGRY_LEAVING) continue;
      const dx = x - g.x;
      const dy = y - g.y;
      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) return g;
    }
    return null;
  }

  hitTestStation(x, y) {
    for (const st of this.game.getStations()) {
      const dx = x - st.x;
      const dy = y - STATION_Y;
      if (Math.abs(dx) < (st.width / 2 + 5) && Math.abs(dy) < 44) return st;
    }
    return null;
  }

  hitTestServiceMat(x, y) {
    for (const drink of this.game.barState.serviceMat) {
      const dx = x - drink.x;
      const dy = y - (SERVICE_MAT_Y + 12);
      if (Math.abs(dx) < 20 && Math.abs(dy) < 16) return drink;
    }
    return null;
  }

  hitTestDirtySeat(x, y) {
    for (const seatId of this.game.barState.dirtySeats) {
      const seat = SEATS[seatId];
      if (Math.abs(x - seat.x) < 35 && Math.abs(y - SEAT_Y - 16) < 30) return seatId;
    }
    return null;
  }

  hitTestCash(x, y) {
    for (const [seatId] of this.game.barState.cashOnBar) {
      const seat = SEATS[seatId];
      const cashX = seat.x - 20;
      if (Math.abs(x - cashX) < 26 && Math.abs(y - (BAR_TOP_Y + 10)) < 18) return seatId;
    }
    return null;
  }
}
