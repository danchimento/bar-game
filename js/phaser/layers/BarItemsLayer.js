import { SEATS, BAR_TOP_Y, SEAT_Y, SERVICE_MAT_Y } from '../../constants.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

/**
 * Dynamic bar items: dirty seat markers, cash on bar, drinks at seats, service mat drinks.
 * Drinks at seats now render as actual glass shapes with fill levels.
 */
export class BarItemsLayer {
  constructor(scene) {
    this.scene = scene;
    this.dirtySprites = new Map();
    this.cashSprites = new Map();
    this.drinkGfx = scene.add.graphics().setDepth(6);
    this.matGfx = scene.add.graphics().setDepth(3);
    this.matZones = [];
  }

  /** Call every frame with barState and optional sipping map from GuestLayer */
  update(barState, sippingMap) {
    this._sippingMap = sippingMap || new Map();
    this._syncDirtySeats(barState.dirtySeats);
    this._syncCash(barState.cashOnBar);
    this._drawDrinksAtSeats(barState.drinksAtSeats);
    this._drawServiceMat(barState.serviceMat);
  }

  _syncDirtySeats(dirtySeats) {
    for (const seatId of dirtySeats) {
      if (!this.dirtySprites.has(seatId) && SEATS[seatId]) {
        const seat = SEATS[seatId];
        const sp = this.scene.add.image(seat.x, SEAT_Y + 8, 'spill').setDepth(7);
        const zone = this.scene.add.zone(seat.x, SEAT_Y + 8, 50, 40)
          .setInteractive({ useHandCursor: true }).setDepth(7);
        zone.on('pointerdown', () => this.scene.events.emit('dirty-seat-tap', seatId));
        this.dirtySprites.set(seatId, { sp, zone });
      }
    }
    for (const [id, obj] of this.dirtySprites) {
      if (!dirtySeats.has(id)) {
        obj.sp.destroy(); obj.zone.destroy();
        this.dirtySprites.delete(id);
      }
    }
  }

  _syncCash(cashOnBar) {
    for (const [seatId] of cashOnBar) {
      if (!this.cashSprites.has(seatId) && SEATS[seatId]) {
        const seat = SEATS[seatId];
        const sp = this.scene.add.image(seat.x - 20, BAR_TOP_Y + 8, 'cash').setDepth(7);
        const zone = this.scene.add.zone(seat.x - 20, BAR_TOP_Y + 8, 50, 40)
          .setInteractive({ useHandCursor: true }).setDepth(7);
        zone.on('pointerdown', () => this.scene.events.emit('cash-tap', seatId));
        this.cashSprites.set(seatId, { sp, zone });
      }
    }
    for (const [id, obj] of this.cashSprites) {
      if (!cashOnBar.has(id)) {
        obj.sp.destroy(); obj.zone.destroy();
        this.cashSprites.delete(id);
      }
    }
  }

  _drawDrinksAtSeats(drinksAtSeats) {
    this.drinkGfx.clear();
    for (const [seatId, glasses] of drinksAtSeats) {
      if (glasses.length === 0) continue;
      const seat = SEATS[seatId];
      if (!seat) continue;

      // Draw each glass at the seat, skip if being sipped
      for (let i = 0; i < glasses.length; i++) {
        if (this._sippingMap.get(seatId) === i) continue;
        const glass = glasses[i];
        const offsetX = (i - (glasses.length - 1) / 2) * 14;
        const gx = seat.x + offsetX;
        const gy = BAR_TOP_Y - 2;
        const fillPct = glass.totalFill;
        const liquidColor = getLiquidColor(glass.layers);
        drawGlass(this.drinkGfx, gx, gy, glass.glassType, fillPct, liquidColor, 0.65);
      }
    }
  }

  _drawServiceMat(serviceMat) {
    this.matGfx.clear();
    // Destroy old zones
    this.matZones.forEach(z => z.destroy());
    this.matZones = [];

    for (const drink of serviceMat) {
      const gx = drink.x;
      const gy = SERVICE_MAT_Y + 10;

      // Draw the glass with its contents
      if (drink.glass) {
        const fillPct = drink.glass.totalFill;
        const liquidColor = getLiquidColor(drink.glass.layers);
        drawGlass(this.matGfx, gx, gy, drink.glass.glassType, fillPct, liquidColor, 0.6);
      } else {
        // Fallback: simple rectangle
        this.matGfx.fillStyle(0xc8d8e8, 0.5);
        this.matGfx.fillRect(gx - 6, gy - 16, 12, 16);
      }

      // Interactive zone
      const zone = this.scene.add.zone(gx, gy - 8, 30, 30)
        .setInteractive({ useHandCursor: true }).setDepth(4);
      zone.on('pointerdown', () => this.scene.events.emit('mat-drink-tap', drink));
      this.matZones.push(zone);
    }
  }

  destroy() {
    for (const obj of this.dirtySprites.values()) { obj.sp.destroy(); obj.zone.destroy(); }
    for (const obj of this.cashSprites.values()) { obj.sp.destroy(); obj.zone.destroy(); }
    this.drinkGfx.destroy();
    this.matGfx.destroy();
    this.matZones.forEach(z => z.destroy());
  }
}
