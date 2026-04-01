import { SEATS, BAR_TOP_Y, SEAT_Y, SERVICE_MAT_Y } from '../../constants.js';

/**
 * Dynamic bar items: dirty seat markers, cash on bar, drinks at seats, service mat drinks.
 */
export class BarItemsLayer {
  constructor(scene) {
    this.scene = scene;
    this.dirtySprites = new Map();
    this.cashSprites = new Map();
    this.drinkSprites = new Map();
    this.matSprites = [];
  }

  /** Call every frame with barState */
  update(barState) {
    this._syncDirtySeats(barState.dirtySeats);
    this._syncCash(barState.cashOnBar);
    this._syncDrinksAtSeats(barState.drinksAtSeats);
    this._syncServiceMat(barState.serviceMat);
  }

  _syncDirtySeats(dirtySeats) {
    // Add missing
    for (const seatId of dirtySeats) {
      if (!this.dirtySprites.has(seatId) && SEATS[seatId]) {
        const seat = SEATS[seatId];
        const sp = this.scene.add.image(seat.x, SEAT_Y + 8, 'spill').setDepth(2);
        const zone = this.scene.add.zone(seat.x, SEAT_Y + 8, 50, 40)
          .setInteractive({ useHandCursor: true }).setDepth(4);
        zone.on('pointerdown', () => this.scene.events.emit('dirty-seat-tap', seatId));
        this.dirtySprites.set(seatId, { sp, zone });
      }
    }
    // Remove cleared
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
        const sp = this.scene.add.image(seat.x - 20, BAR_TOP_Y + 10, 'cash').setDepth(2);
        const zone = this.scene.add.zone(seat.x - 20, BAR_TOP_Y + 10, 40, 30)
          .setInteractive({ useHandCursor: true }).setDepth(4);
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

  _syncDrinksAtSeats(drinksAtSeats) {
    // Simple: show a glass icon at seats that have drinks
    const activeIds = new Set();
    for (const [seatId, glasses] of drinksAtSeats) {
      if (glasses.length === 0) continue;
      activeIds.add(seatId);
      if (!this.drinkSprites.has(seatId) && SEATS[seatId]) {
        const seat = SEATS[seatId];
        const sp = this.scene.add.image(seat.x, BAR_TOP_Y - 8, 'glass_pint')
          .setScale(0.5).setDepth(2);
        this.drinkSprites.set(seatId, sp);
      }
    }
    for (const [id, sp] of this.drinkSprites) {
      if (!activeIds.has(id)) {
        sp.destroy();
        this.drinkSprites.delete(id);
      }
    }
  }

  _syncServiceMat(serviceMat) {
    // Rebuild each frame (service mat is small)
    this.matSprites.forEach(s => s.destroy());
    this.matSprites = [];

    for (const drink of serviceMat) {
      const sp = this.scene.add.image(drink.x, SERVICE_MAT_Y + 13, 'glass_pint')
        .setScale(0.45).setDepth(2);
      sp.setInteractive({ useHandCursor: true });
      sp.on('pointerdown', () => this.scene.events.emit('mat-drink-tap', drink));
      this.matSprites.push(sp);
    }
  }

  destroy() {
    for (const obj of this.dirtySprites.values()) { obj.sp.destroy(); obj.zone.destroy(); }
    for (const obj of this.cashSprites.values()) { obj.sp.destroy(); obj.zone.destroy(); }
    for (const sp of this.drinkSprites.values()) sp.destroy();
    this.matSprites.forEach(s => s.destroy());
  }
}
