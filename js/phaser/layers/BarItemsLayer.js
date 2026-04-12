// Layout reads from BarLayout (passed to constructor)
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

/**
 * Dynamic bar items: dirty seat markers, cash on bar, drinks at seats, service mat drinks.
 * Drinks at seats now render as actual glass shapes with fill levels.
 */
export class BarItemsLayer {
  constructor(scene, barLayout) {
    this.scene = scene;
    this._bl = barLayout;
    this.dirtySprites = new Map();
    this.cashSprites = new Map();
    this.drinkGfx = scene.add.graphics().setDepth(9);
    this.matGfx = scene.add.graphics().setDepth(3);
    this.matZones = [];
    this.seatZones = [];
    this._buildSeatZones();
  }

  /** Create one permanent interactive zone per seat covering the full seat area */
  _buildSeatZones() {
    for (const seat of this._bl.seats) {
      const zone = this.scene.add.zone(seat.x, this._bl.seatY - 10, 70, 80)
        .setInteractive({ useHandCursor: true }).setDepth(10);
      zone.on('pointerdown', () => this.scene.events.emit('seat-zone-tap', seat.id));
      this.seatZones.push(zone);
    }
  }

  /** Rebuild seat zones when seat count changes */
  rebuildSeatZones() {
    this.seatZones.forEach(z => z.destroy());
    this.seatZones = [];
    this._buildSeatZones();
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
      if (!this.dirtySprites.has(seatId) && this._bl.seats[seatId]) {
        const seat = this._bl.seats[seatId];
        const sp = this.scene.add.image(seat.x, this._bl.barY(8), 'spill').setDepth(7);
        this.dirtySprites.set(seatId, { sp });
      }
    }
    for (const [id, obj] of this.dirtySprites) {
      if (!dirtySeats.has(id)) {
        obj.sp.destroy();
        this.dirtySprites.delete(id);
      }
    }
  }

  _syncCash(cashOnBar) {
    for (const [seatId] of cashOnBar) {
      if (!this.cashSprites.has(seatId) && this._bl.seats[seatId]) {
        const seat = this._bl.seats[seatId];
        const sp = this.scene.add.image(seat.x - 20, this._bl.barY(6), 'cash').setDepth(7);
        this.cashSprites.set(seatId, { sp });
      }
    }
    for (const [id, obj] of this.cashSprites) {
      if (!cashOnBar.has(id)) {
        obj.sp.destroy();
        this.cashSprites.delete(id);
      }
    }
  }

  _drawDrinksAtSeats(drinksAtSeats) {
    this.drinkGfx.clear();
    for (const [seatId, glasses] of drinksAtSeats) {
      if (glasses.length === 0) continue;
      const seat = this._bl.seats[seatId];
      if (!seat) continue;

      // Draw each glass at the seat, skip if being sipped
      for (let i = 0; i < glasses.length; i++) {
        if (this._sippingMap.get(seatId) === i) continue;
        const glass = glasses[i];
        const offsetX = (i - (glasses.length - 1) / 2) * 14;
        const gx = seat.x + offsetX;
        const gy = this._bl.barY(10);  // ~10 inches from customer edge (about a foot in)
        const fillPct = glass.totalFill;
        const liquidColor = getLiquidColor(glass.layers);
        drawGlass(this.drinkGfx, gx, gy, glass.glassType, fillPct, liquidColor, 0.96);
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
      const gy = this._bl.serviceMatY + 10;

      // Draw the glass with its contents
      if (drink.glass) {
        const fillPct = drink.glass.totalFill;
        const liquidColor = getLiquidColor(drink.glass.layers);
        drawGlass(this.matGfx, gx, gy, drink.glass.glassType, fillPct, liquidColor, 0.72);
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
    for (const obj of this.dirtySprites.values()) { obj.sp.destroy(); }
    for (const obj of this.cashSprites.values()) { obj.sp.destroy(); }
    this.drinkGfx.destroy();
    this.matGfx.destroy();
    this.matZones.forEach(z => z.destroy());
    this.seatZones.forEach(z => z.destroy());
  }
}
